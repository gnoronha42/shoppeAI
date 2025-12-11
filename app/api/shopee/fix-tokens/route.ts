import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/shopee';

/**
 * 🔧 CORREÇÃO AUTOMÁTICA DE TOKENS - Resolve problemas identificados no diagnóstico
 * 
 * Uso: POST /api/shopee/fix-tokens
 * Body: { action: 'refresh_all' | 'clean_orphaned' | 'merge_duplicates' | 'fix_specific', client_id?: string }
 * 
 * Ações disponíveis:
 * - refresh_all: Tenta refresh em todas as integrações expiradas
 * - clean_orphaned: Remove integrações sem cliente associado
 * - merge_duplicates: Consolida shop_ids duplicados
 * - fix_specific: Corrige uma integração específica
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, client_id } = body;

   

    const results = {
      action,
      success: false,
      processed: 0,
      fixed: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    switch (action) {
      case 'refresh_all':
        return await refreshAllTokens(results);
      
      case 'clean_orphaned':
        return await cleanOrphanedIntegrations(results);
      
      case 'merge_duplicates':
        return await mergeDuplicateShopIds(results);
      
      case 'fix_specific':
        if (!client_id) {
          return NextResponse.json({ error: 'client_id é obrigatório para fix_specific' }, { status: 400 });
        }
        return await fixSpecificIntegration(results, client_id);
      
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

  } catch (err: any) {
    console.error(' Erro na correção de tokens:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno na correção',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

async function refreshAllTokens(results: any) {


  const integrations = await prisma.client_integrations.findMany({
    where: { 
      provider: 'shopee',
      refresh_token: { not: null }
    }
  });

  results.processed = integrations.length;

  for (const integration of integrations) {
    try {
      const now = new Date();
      const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
      const isExpired = expiry ? expiry.getTime() < now.getTime() : true;
      const hoursUntilExpiry = expiry ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;

      // Só faz refresh se expirado ou expira em menos de 2 horas
      if (isExpired || hoursUntilExpiry < 2) {


        const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token! });
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);

        await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });

        results.fixed++;
        results.details.push({
          client_id: integration.client_id,
          shop_id: integration.shop_id,
          status: 'refreshed',
          new_expiry: newExpiry.toISOString()
        });

      } else {
        results.details.push({
          client_id: integration.client_id,
          shop_id: integration.shop_id,
          status: 'skipped',
          reason: `Token válido por mais ${hoursUntilExpiry} horas`
        });
      }

    } catch (e: any) {
      console.error(`❌ Erro ao refresh token para client ${integration.client_id}:`, e.message);
      results.errors.push(`Client ${integration.client_id}: ${e.message}`);
      
      results.details.push({
        client_id: integration.client_id,
        shop_id: integration.shop_id,
        status: 'error',
        error: e.message
      });
    }

    // Pausa entre requests para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  results.success = results.fixed > 0 || results.errors.length === 0;
  console.log(`Refresh em massa finalizado: ${results.fixed}/${results.processed} tokens atualizados`);

  return NextResponse.json(results);
}

async function cleanOrphanedIntegrations(results: any) {
  console.log(' Limpando integrações órfãs...');

  // Encontrar integrações sem cliente associado
  const orphanedIntegrations = await prisma.client_integrations.findMany({
    where: { 
      provider: 'shopee',
      clients: null as any 
    }
  });

  results.processed = orphanedIntegrations.length;

  if (orphanedIntegrations.length === 0) {
    results.success = true;
    results.details.push({ message: 'Nenhuma integração órfã encontrada' });
    return NextResponse.json(results);
  }

  for (const integration of orphanedIntegrations) {
    try {
      await prisma.client_integrations.delete({
        where: { id: integration.id }
      });

      results.fixed++;
      results.details.push({
        integration_id: integration.id,
        shop_id: integration.shop_id,
        status: 'deleted'
      });


    } catch (e: any) {
      console.error(`Erro ao remover integração órfã ${integration.id}:`, e.message);
      results.errors.push(`Integration ${integration.id}: ${e.message}`);
    }
  }

  results.success = results.fixed > 0;
  console.log(` Limpeza finalizada: ${results.fixed} integrações órfãs removidas`);

  return NextResponse.json(results);
}

async function mergeDuplicateShopIds(results: any) {
  console.log(' Consolidando shop_ids duplicados...');

  // Encontrar shop_ids duplicados
  const duplicates = await prisma.client_integrations.groupBy({
    by: ['shop_id'],
    where: { 
      provider: 'shopee',
      shop_id: { not: null }
    },
    having: {
      shop_id: {
        _count: {
          gt: 1
        }
      }
    }
  });

  results.processed = duplicates.length;

  for (const duplicate of duplicates) {
    try {
      const integrations = await prisma.client_integrations.findMany({
        where: { 
          provider: 'shopee',
          shop_id: duplicate.shop_id
        },
        include: { clients: true },
        orderBy: { updated_at: 'desc' }
      });

      if (integrations.length <= 1) continue;

      // Manter a mais recente, remover as outras
      const [keepIntegration, ...removeIntegrations] = integrations;

      for (const removeIntegration of removeIntegrations) {
        await prisma.client_integrations.delete({
          where: { id: removeIntegration.id }
        });

        results.details.push({
          action: 'merged',
          kept_integration: keepIntegration.id,
          kept_client: keepIntegration.clients?.name,
          removed_integration: removeIntegration.id,
          removed_client: removeIntegration.clients?.name,
          shop_id: duplicate.shop_id
        });

      }

      results.fixed++;

    } catch (e: any) {
      console.error(` Erro ao consolidar shop_id ${duplicate.shop_id}:`, e.message);
      results.errors.push(`Shop ID ${duplicate.shop_id}: ${e.message}`);
    }
  }

  results.success = results.fixed > 0 || results.processed === 0;
  console.log(`Consolidação finalizada: ${results.fixed} grupos de duplicatas processados`);

  return NextResponse.json(results);
}

async function fixSpecificIntegration(results: any, clientId: string) {


  const integration = await prisma.client_integrations.findUnique({
    where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    include: { clients: true }
  });

  if (!integration) {
    results.errors.push('Integração não encontrada');
    return NextResponse.json(results, { status: 404 });
  }

  results.processed = 1;

  try {
    // Verificar se o cliente existe
    if (!integration.clients) {
      results.errors.push('Cliente não existe - integração órfã');
      return NextResponse.json(results);
    }

    // Verificar tokens
    if (!integration.access_token || !integration.refresh_token) {
      results.errors.push('Tokens ausentes - reautenticação necessária');
      results.details.push({
        client_id: clientId,
        status: 'needs_reauth',
        reason: 'Tokens ausentes'
      });
      return NextResponse.json(results);
    }

    // Tentar refresh se necessário
    const now = new Date();
    const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
    const isExpired = expiry ? expiry.getTime() < now.getTime() : true;

    if (isExpired) {
      console.log(`Token expirado, tentando refresh...`);

      const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
      const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);

      await prisma.client_integrations.update({
        where: { id: integration.id },
        data: {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          token_expiry: newExpiry,
          updated_at: new Date(),
        },
      });

      results.fixed = 1;
      results.details.push({
        client_id: clientId,
        status: 'refreshed',
        new_expiry: newExpiry.toISOString()
      });

      console.log(` Token refreshed com sucesso para client ${clientId}`);
    } else {
      results.details.push({
        client_id: clientId,
        status: 'healthy',
        expires_at: expiry?.toISOString()
      });
    }

    results.success = true;

  } catch (e: any) {
    console.error(` Erro ao corrigir integração para client ${clientId}:`, e.message);
    results.errors.push(e.message);
    
    if (e.message.includes('REFRESH_TOKEN_EXPIRED')) {
      results.details.push({
        client_id: clientId,
        status: 'needs_reauth',
        reason: 'Refresh token expirado'
      });
    }
  }

  return NextResponse.json(results);
}
