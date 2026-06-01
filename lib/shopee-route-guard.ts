import { NextResponse } from 'next/server';
import { isNextBuildPhase } from '@/lib/is-next-build';

/** Integração Shopee ativa só quando explicitamente habilitada (ou não desabilitada). */
export function isShopeeIntegrationEnabled(): boolean {
  return process.env.SHOPEE_INTEGRATION_ENABLED !== 'false';
}

/**
 * Retorna resposta pronta se a rota Shopee deve ser ignorada (build ou flag desligada).
 * Use no início de handlers em /api/shopee e /api/shopee-ads.
 */
export function guardShopeeRoute(): NextResponse | null {
  if (isNextBuildPhase()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'build',
      message: 'Integração Shopee ignorada durante o build.',
    });
  }
  if (!isShopeeIntegrationEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        message:
          'Integração Shopee temporariamente desativada (SHOPEE_INTEGRATION_ENABLED=false).',
      },
      { status: 503 },
    );
  }
  return null;
}
