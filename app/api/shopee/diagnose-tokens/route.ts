import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 🔍 DIAGNÓSTICO COMPLETO DE TOKENS - Identifica problemas na persistência de tokens
 * 
 * Uso: GET /api/shopee/diagnose-tokens?client_id=xxx
 * 
 * Verifica:
 * - Se os tokens estão sendo salvos no banco
 * - Se os tokens estão sendo atualizados corretamente
 * - Se há problemas de concorrência ou duplicação
 * - Se os timestamps estão corretos
 * - Se há integrações órfãs ou duplicadas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');


    // 1. Verificar todas as integrações Shopee
    const allIntegrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      include: { 
        clients: { 
          select: { id: true, name: true, created_at: true } 
        } 
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`Total de integrações Shopee encontradas: ${allIntegrations.length}`);

    const diagnostics = [];

    for (const integration of allIntegrations) {
      const now = new Date();
      const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
      const isExpired = expiry ? expiry.getTime() < now.getTime() : true;
      const hoursUntilExpiry = expiry ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
      const daysUntilExpiry = Math.round(hoursUntilExpiry / 24);

      const diagnostic = {
        integration_id: integration.id,
        client_id: integration.client_id,
        client_name: integration.clients?.name || 'CLIENTE NÃO ENCONTRADO',
        shop_id: integration.shop_id,
        
        // Status dos tokens
        has_access_token: !!integration.access_token,
        access_token_length: integration.access_token?.length || 0,
        access_token_preview: integration.access_token ? 
          `${integration.access_token.substring(0, 10)}...${integration.access_token.substring(integration.access_token.length - 4)}` : null,
        has_refresh_token: !!integration.refresh_token,
        refresh_token_length: integration.refresh_token?.length || 0,
        refresh_token_preview: integration.refresh_token ? 
          (integration.refresh_token.length > 14 ? 
            `${integration.refresh_token.substring(0, 10)}...${integration.refresh_token.substring(integration.refresh_token.length - 4)}` :
            integration.refresh_token.substring(0, 20) + '...') : null,
        
        // Status de expiração
        token_expiry: integration.token_expiry,
        is_expired: isExpired,
        hours_until_expiry: hoursUntilExpiry,
        days_until_expiry: daysUntilExpiry,
        
        // Timestamps
        created_at: integration.created_at,
        updated_at: integration.updated_at,
        last_update_hours_ago: integration.updated_at ? 
          Math.round((now.getTime() - new Date(integration.updated_at).getTime()) / (1000 * 60 * 60)) : null,
        
        // Problemas identificados
        problems: [] as string[],
        recommendations: [] as string[]
      };

      // Identificar problemas
      if (!integration.access_token) {
        diagnostic.problems.push('❌ Access token ausente');
        diagnostic.recommendations.push('🔧 Reautenticar a conta');
      }
      
      // Verificar se refresh_token está muito curto (suspeito de truncamento)
      if (integration.refresh_token && integration.refresh_token.length < 50) {
        diagnostic.problems.push(`⚠️ Refresh token muito curto (${integration.refresh_token.length} chars) - pode estar truncado`);
        diagnostic.recommendations.push('🔧 Reconectar a conta para obter token completo');
        diagnostic.recommendations.push('🔍 Verificar logs do callback para ver tamanho do token recebido');
      }

      if (!integration.refresh_token) {
        diagnostic.problems.push('❌ Refresh token ausente');
        diagnostic.recommendations.push('🔧 Reautenticar a conta');
      }

      if (isExpired) {
        diagnostic.problems.push('⏰ Token expirado');
        diagnostic.recommendations.push('🔄 Tentar refresh automático ou reautenticar');
      }

      if (hoursUntilExpiry < 2 && hoursUntilExpiry > 0) {
        diagnostic.problems.push('⚠️ Token expira em breve');
        diagnostic.recommendations.push('🔄 Refresh será feito automaticamente');
      }

      if (!integration.clients) {
        diagnostic.problems.push('🚨 Cliente não existe (integração órfã)');
        diagnostic.recommendations.push('🗑️ Remover integração órfã');
      }

      if (diagnostic.last_update_hours_ago && diagnostic.last_update_hours_ago > 24 * 7) {
        diagnostic.problems.push('📅 Não atualizado há mais de 7 dias');
        diagnostic.recommendations.push('🔍 Verificar se a integração está sendo usada');
      }

      diagnostics.push(diagnostic);
    }

    // 2. Verificar duplicatas
    const shopIdCounts = allIntegrations.reduce((acc, integration) => {
      const shopId = integration.shop_id;
      if (shopId) {
        acc[shopId] = (acc[shopId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const duplicateShopIds = Object.entries(shopIdCounts)
      .filter(([_, count]) => count > 1)
      .map(([shopId, count]) => ({ shop_id: shopId, count }));

    // 3. Verificar integração específica se client_id fornecido
    let specificDiagnostic = null;
    if (clientId) {
      const specificIntegration = await prisma.client_integrations.findUnique({
        where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
        include: { clients: true }
      });

      if (specificIntegration) {
        specificDiagnostic = diagnostics.find(d => d.client_id === clientId);
        
        // Teste de conectividade
        if (specificIntegration.access_token) {
          try {
            console.log(` Testando conectividade para client ${clientId}...`);
            
            const testResponse = await fetch(`${request.url.split('/api/shopee/diagnose-tokens')[0]}/api/shopee/data?client_id=${clientId}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });

            if (specificDiagnostic) {
              (specificDiagnostic as any).connectivity_test = {  //@ts-ignore
                success: testResponse.ok,
                status: testResponse.status,
                error: testResponse.ok ? null : await testResponse.text()
              };
            }
          } catch (e: any) {
            if (specificDiagnostic) {
              (specificDiagnostic as any).connectivity_test = {  //@ts-ignore
                success: false,
                error: e.message
              };
            }
          }
        }
      }
    }

    // 4. Gerar resumo geral
    const summary = {
      total_integrations: allIntegrations.length,
      active_integrations: diagnostics.filter(d => !d.is_expired && d.has_access_token).length,
      expired_integrations: diagnostics.filter(d => d.is_expired).length,
      missing_tokens: diagnostics.filter(d => !d.has_access_token || !d.has_refresh_token).length,
      orphaned_integrations: diagnostics.filter(d => d.problems.includes('🚨 Cliente não existe (integração órfã)')).length,
      duplicate_shop_ids: duplicateShopIds.length,
      
      // Problemas críticos
      critical_issues: [] as string[],
      recommendations: [] as string[]
    };

    // Identificar problemas críticos
    if (summary.missing_tokens > 0) {
      summary.critical_issues.push(`${summary.missing_tokens} integrações com tokens ausentes`);
      summary.recommendations.push('🔧 Reautenticar contas com tokens ausentes');
    }

    if (summary.orphaned_integrations > 0) {
      summary.critical_issues.push(`${summary.orphaned_integrations} integrações órfãs`);
      summary.recommendations.push('🗑️ Limpar integrações órfãs');
    }

    if (duplicateShopIds.length > 0) {
      summary.critical_issues.push(`${duplicateShopIds.length} shop_ids duplicados`);
      summary.recommendations.push('🔍 Investigar e consolidar duplicatas');
    }

    if (summary.expired_integrations > summary.total_integrations * 0.5) {
      summary.critical_issues.push('Mais de 50% das integrações estão expiradas');
      summary.recommendations.push('🚨 Problema sistêmico - verificar fluxo de refresh');
    }

    console.log('Diagnóstico completo finalizado');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
      duplicate_shop_ids: duplicateShopIds,
      specific_client: specificDiagnostic,
      all_integrations: diagnostics,
      
      // Ações recomendadas
      immediate_actions: [
        ...(summary.missing_tokens > 0 ? ['🔧 Reautenticar contas com tokens ausentes'] : []),
        ...(summary.orphaned_integrations > 0 ? ['🗑️ Limpar integrações órfãs'] : []),
        ...(duplicateShopIds.length > 0 ? ['🔍 Consolidar shop_ids duplicados'] : []),
        ...(summary.expired_integrations > 0 ? ['🔄 Executar refresh em massa'] : [])
      ]
    });

  } catch (err: any) {
    console.error(' Erro no diagnóstico de tokens:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno no diagnóstico',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
