import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/shopee';

// Forçar endpoint dinâmico para evitar cache e garantir dados sempre atualizados
export const dynamic = 'force-dynamic';

/**
 * 🔄 CRON JOB - Renovação Automática de Tokens Shopee
 * 
 * Uso: GET /api/shopee/cron-refresh-tokens
 * 
 * Este endpoint deve ser chamado automaticamente a cada 3 horas por um cron job.
 * Ele verifica todos os tokens que expiram nas próximas 6 horas e os renova proativamente.
 * 
 * IMPORTANTE: Configure um cron job externo (GitHub Actions, etc.) 
 * para chamar este endpoint regularmente, mesmo quando ninguém está usando o site.
 * 
 * Access tokens Shopee expiram em ~4 horas, então renovar quando faltam 6h garante
 * que sempre teremos tokens válidos antes de expirarem.
 */
export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    console.log('\n🔄 ===== CRON JOB: RENOVAÇÃO AUTOMÁTICA DE TOKENS =====');
    console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);

    // Buscar TODAS as integrações Shopee com refresh_token
    // Vamos verificar cada uma para ver se precisa de refresh
    // Isso garante que não perdemos nenhuma integração
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
    
    const allIntegrationsWithRefresh = await prisma.client_integrations.findMany({
      where: {
        provider: 'shopee',
        refresh_token: { not: null }
      },
      include: {
        clients: { select: { id: true, name: true } }
      }
    });

    console.log(`📊 Encontradas ${allIntegrationsWithRefresh.length} integrações Shopee com refresh_token`);

    // Filtrar apenas as que precisam de refresh (expiram em <= 6 horas ou sem data)
    const integrations = allIntegrationsWithRefresh.filter(integration => {
      if (!integration.token_expiry) {
        return true; // Sem data de expiração = precisa renovar
      }
      const expiryDate = new Date(integration.token_expiry);
      return expiryDate <= sixHoursFromNow;
    });

    console.log(`🔄 ${integrations.length} integração(ões) precisam de refresh (expiram em <= 6 horas ou sem data)`);

    // Debug: Contar todas as integrações Shopee para entender por que não há nada para renovar
    const allIntegrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      include: {
        clients: { select: { id: true, name: true } }
      }
    });

    const debugStats = {
      total_integrations: allIntegrations.length,
      with_refresh_token: allIntegrationsWithRefresh.length,
      with_access_token: allIntegrations.filter(i => i.access_token).length,
      without_refresh_token: allIntegrations.filter(i => !i.refresh_token).length,
      expired_tokens: allIntegrations.filter(i => {
        if (!i.token_expiry) return true;
        return new Date(i.token_expiry) <= new Date();
      }).length,
      tokens_valid_more_than_6h: allIntegrationsWithRefresh.filter(i => {
        if (!i.token_expiry) return false;
        const hoursUntilExpiry = (new Date(i.token_expiry).getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursUntilExpiry > 6;
      }).length,
      needs_refresh: integrations.length,
      details: allIntegrationsWithRefresh.map(i => ({
        client_name: i.clients?.name || 'Desconhecido',
        shop_id: i.shop_id,
        has_token_expiry: !!i.token_expiry,
        token_expiry: i.token_expiry,
        hours_until_expiry: i.token_expiry ? 
          Math.round((new Date(i.token_expiry).getTime() - Date.now()) / (1000 * 60 * 60)) : 
          null,
        needs_refresh: !i.token_expiry || new Date(i.token_expiry) <= sixHoursFromNow
      }))
    };

    console.log(`🔍 Debug - Estatísticas de integrações:`, JSON.stringify(debugStats, null, 2));

    const results = {
      total_checked: integrations.length,
      successful_refreshes: 0,
      failed_refreshes: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[],
      debug_stats: debugStats // Sempre retornar estatísticas para debug
    };

    for (const integration of integrations) {
      const clientName = integration.clients?.name || 'Cliente Desconhecido';
      
      try {
        console.log(`\n🔄 Processando: ${clientName} (${integration.client_id})`);
        console.log(`   Shop ID: ${integration.shop_id}`);
        
        const now = new Date();
        const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
        const hoursUntilExpiry = expiry ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : -999;
        
        console.log(`   Expira em: ${expiry?.toISOString() || 'Não definido'} (${hoursUntilExpiry}h)`);

        // Verificar se realmente precisa de refresh (renova se expira em menos de 6h)
        // Isso garante que sempre renovamos tokens antes de expirarem
        if (expiry && hoursUntilExpiry > 6) {
          console.log(`   ⏭️ Pulando: ainda válido por ${hoursUntilExpiry} horas (renovaremos quando faltar 6h)`);
          results.skipped++;
          results.details.push({
            client_id: integration.client_id,
            client_name: clientName,
            shop_id: integration.shop_id,
            status: 'skipped',
            reason: `Válido por mais ${hoursUntilExpiry} horas (renovaremos quando faltar 6h)`
          });
          continue;
        }

        // Tentar refresh
        console.log(`   🔄 Fazendo refresh do token...`);
        const refreshed = await refreshAccessToken({ 
          refresh_token: integration.refresh_token!,
          shop_id: integration.shop_id ?? undefined //  ✅ Incluir shop_id para melhor compatibilidade com Shopee API
        });

        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        
        // Salvar novo token
        await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });

        results.successful_refreshes++;
        results.details.push({
          client_id: integration.client_id,
          client_name: clientName,
          shop_id: integration.shop_id,
          status: 'refreshed',
          old_expiry: expiry?.toISOString(),
          new_expiry: newExpiry.toISOString(),
          hours_extended: Math.round((refreshed.expire_in ?? 0) / 3600)
        });

        console.log(`   ✅ Sucesso! Novo token válido até: ${newExpiry.toISOString()}`);

        // Pausa entre requests para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`   ❌ Erro ao renovar token: ${error.message}`);
        
        results.failed_refreshes++;
        results.errors.push(`${clientName} (${integration.client_id}): ${error.message}`);
        
        results.details.push({
          client_id: integration.client_id,
          client_name: clientName,
          shop_id: integration.shop_id,
          status: 'error',
          error: error.message,
          needs_reauth: error.message.includes('REFRESH_TOKEN_EXPIRED') || 
                       error.message.includes('error_not_found')
        });

        // Se o refresh token expirou, apenas logar - NÃO limpar tokens
        if (error.message.includes('REFRESH_TOKEN_EXPIRED') || 
            error.message.includes('error_not_found')) {
          console.log(`   🚨 Refresh token expirado - cliente precisa reautenticar`);
          console.log(`   ℹ️ Tokens mantidos no banco para permitir reautenticação manual`);
          
          // NÃO limpar tokens automaticamente - deixar para o usuário decidir
          // Isso evita perder a integração acidentalmente
        }
      }
    }

    const duration = Date.now() - startTime;
    const summary = {
      execution_time_ms: duration,
      execution_time_seconds: Math.round(duration / 1000),
      timestamp: new Date().toISOString(),
      ...results
    };

    console.log(`\n📊 ===== RESUMO DO CRON JOB =====`);
    console.log(`⏱️ Tempo de execução: ${summary.execution_time_seconds}s`);
    console.log(`✅ Sucessos: ${results.successful_refreshes}`);
    console.log(`❌ Falhas: ${results.failed_refreshes}`);
    console.log(`⏭️ Pulados: ${results.skipped}`);
    console.log(`🔄 Total processados: ${results.total_checked}`);

    if (results.errors.length > 0) {
      console.log(`\n🚨 ERROS ENCONTRADOS:`);
      results.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Retornar status de sucesso se pelo menos alguns tokens foram renovados
    const success = results.failed_refreshes === 0 || 
                   results.successful_refreshes > 0;

    let message = success ? 
      'Cron job executado com sucesso' : 
      'Cron job executado com erros';
    
    // Adicionar mensagem informativa se não houver integrações para processar
    if (results.total_checked === 0 && results.debug_stats) {
      const stats = results.debug_stats;
      if (stats.total_integrations === 0) {
        message = 'Cron executado: Nenhuma integração Shopee encontrada no banco de dados';
      } else if (stats.without_refresh_token === stats.total_integrations) {
        message = 'Cron executado: Todas as integrações precisam ser reconectadas (sem refresh_token)';
      } else if (stats.tokens_valid_more_than_6h > 0) {
        message = `Cron executado: ${stats.tokens_valid_more_than_6h} token(s) ainda válido(s) por mais de 6 horas (não precisa renovar agora)`;
      } else {
        message = 'Cron executado: Nenhuma integração precisa de refresh no momento';
      }
    }

    return NextResponse.json({
      success,
      message,
      summary,
      next_execution_recommended: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // Próxima execução em 3 horas
    });

  } catch (err: any) {
    console.error('❌ Erro crítico no cron job:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno no cron job',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
