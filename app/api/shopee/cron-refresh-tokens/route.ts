import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/shopee';

/**
 * 🔄 CRON JOB - Renovação Automática de Tokens Shopee
 * 
 * Uso: GET /api/shopee/cron-refresh-tokens
 * 
 * Este endpoint deve ser chamado automaticamente 1x por dia (3:00 AM) por um cron job.
 * Ele verifica todos os tokens que expiram nas próximas 24 horas e os renova proativamente.
 * 
 * IMPORTANTE: Configure um cron job externo (Vercel Cron, GitHub Actions, etc.) 
 * para chamar este endpoint regularmente, mesmo quando ninguém está usando o site.
 */
export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    console.log('\n🔄 ===== CRON JOB: RENOVAÇÃO AUTOMÁTICA DE TOKENS =====');
    console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);

    // Buscar integrações que expiram nas próximas 24 horas (86400 segundos)
    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const integrations = await prisma.client_integrations.findMany({
      where: {
        provider: 'shopee',
        refresh_token: { not: null },
        OR: [
          // Tokens que expiram nas próximas 24 horas
          { token_expiry: { lte: twentyFourHoursFromNow } },
          // Tokens sem data de expiração (assumir expirados)
          { token_expiry: null }
        ]
      },
      include: {
        clients: { select: { id: true, name: true } }
      }
    });

    console.log(`📊 Encontradas ${integrations.length} integrações que precisam de refresh`);

    const results = {
      total_checked: integrations.length,
      successful_refreshes: 0,
      failed_refreshes: 0,
      skipped: 0,
      errors: [] as string[],
      details: [] as any[]
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

        // Verificar se realmente precisa de refresh (renova se expira em menos de 24h)
        if (expiry && hoursUntilExpiry > 24) {
          console.log(`   ⏭️ Pulando: ainda válido por ${hoursUntilExpiry} horas`);
          results.skipped++;
          results.details.push({
            client_id: integration.client_id,
            client_name: clientName,
            shop_id: integration.shop_id,
            status: 'skipped',
            reason: `Válido por mais ${hoursUntilExpiry} horas`
          });
          continue;
        }

        // Tentar refresh
        console.log(`   🔄 Fazendo refresh do token...`);
        const refreshed = await refreshAccessToken({ 
          refresh_token: integration.refresh_token! 
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

    return NextResponse.json({
      success,
      message: success ? 
        'Cron job executado com sucesso' : 
        'Cron job executado com erros',
      summary,
      next_execution_recommended: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
