import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAdsAccessToken, getShopeeAdsEnv } from '@/lib/shopee-ads-auth';

/**
 * Endpoint para refresh de tokens do App de Ads
 * Usado pelo GitHub Actions ou chamadas internas para manter tokens válidos
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const results: any[] = [];
  let successCount = 0;
  let failCount = 0;

  try {
    console.log('[SHOPEE-ADS-REFRESH] Iniciando refresh de tokens de Ads...');

    // Busca todas as integrações de Ads que precisam de refresh
    const integrations = await prisma.client_integrations.findMany({
      where: {
        provider: 'shopee_ads',
        refresh_token: { not: null },
      },
      include: {
        clients: {
          select: { name: true },
        },
      },
    });

    console.log(`[SHOPEE-ADS-REFRESH] Encontradas ${integrations.length} integrações de Ads`);

    for (const integration of integrations) {
      const clientName = integration.clients?.name || 'Desconhecido';
      
      try {
        // Verifica se o token expira em menos de 6 horas
        const expiresAt = integration.token_expiry ? new Date(integration.token_expiry) : null;
        const hoursUntilExpiry = expiresAt 
          ? (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60) 
          : 0;

        if (hoursUntilExpiry > 6) {
          console.log(`[SHOPEE-ADS-REFRESH] ${clientName}: Token válido por mais ${hoursUntilExpiry.toFixed(1)}h, pulando...`);
          results.push({
            client_name: clientName,
            shop_id: integration.shop_id,
            status: 'skipped',
            reason: `Token válido por mais ${hoursUntilExpiry.toFixed(1)} horas`,
          });
          continue;
        }

        console.log(`[SHOPEE-ADS-REFRESH] ${clientName}: Fazendo refresh (expira em ${hoursUntilExpiry.toFixed(1)}h)...`);

        // Faz o refresh do token
        const newTokens = await refreshAdsAccessToken({
          refresh_token: integration.refresh_token!,
          shop_id: integration.shop_id || undefined,
        });

        const newExpiresAt = new Date(Date.now() + (newTokens.expire_in ?? 14400) * 1000);

        // Atualiza no banco
        await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            token_expiry: newExpiresAt,
            updated_at: new Date(),
          },
        });

        successCount++;
        results.push({
          client_name: clientName,
          shop_id: integration.shop_id,
          status: 'refreshed',
          old_expiry: expiresAt?.toISOString(),
          new_expiry: newExpiresAt.toISOString(),
        });

        console.log(`[SHOPEE-ADS-REFRESH] ${clientName}: Refresh bem sucedido! Novo expiry: ${newExpiresAt.toISOString()}`);

      } catch (error: any) {
        failCount++;
        console.error(`[SHOPEE-ADS-REFRESH] ${clientName}: Erro no refresh:`, error.message);
        results.push({
          client_name: clientName,
          shop_id: integration.shop_id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Refresh de tokens de Ads concluído',
      summary: {
        total_integrations: integrations.length,
        successful_refreshes: successCount,
        failed_refreshes: failCount,
        skipped: integrations.length - successCount - failCount,
        execution_time_ms: executionTime,
        partner_id: getShopeeAdsEnv().partnerId,
      },
      results,
    });

  } catch (error: any) {
    console.error('[SHOPEE-ADS-REFRESH] Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao fazer refresh de tokens de Ads',
    }, { status: 500 });
  }
}

// GET para verificar status das integrações de Ads
export async function GET(request: Request) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const integrations = await prisma.client_integrations.findMany({
      where: {
        provider: 'shopee_ads',
      },
      include: {
        clients: {
          select: { name: true },
        },
      },
      orderBy: {
        token_expiry: 'asc',
      },
    });

    const now = new Date();
    const summary = integrations.map(int => ({
      client_name: int.clients?.name || 'Desconhecido',
      shop_id: int.shop_id,
      partner_id: int.partner_id,
      token_expiry: int.token_expiry?.toISOString() || null,
      hours_until_expiry: int.token_expiry 
        ? ((new Date(int.token_expiry).getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1)
        : null,
      has_refresh_token: !!int.refresh_token,
      is_expired: int.token_expiry ? new Date(int.token_expiry) < now : true,
    }));

    return NextResponse.json({
      total_integrations: integrations.length,
      integrations: summary,
    });

  } catch (error: any) {
    console.error('[SHOPEE-ADS-STATUS] Erro:', error);
    return NextResponse.json({
      error: error.message || 'Erro ao buscar status',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';
