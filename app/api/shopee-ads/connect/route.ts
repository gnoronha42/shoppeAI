import { NextResponse } from 'next/server';
import { buildAdsAuthUrlAsync, ensureShopeeAdsEnv, getShopeeAdsEnv } from '@/lib/shopee-ads-auth';

function toBase64(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

export async function GET(request: Request) {
  try {
    ensureShopeeAdsEnv();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const region = searchParams.get('region') || 'BR';
    const doRedirect = searchParams.get('redirect') === '1';
    const redirectSuccess = searchParams.get('redirect_success');

    // Monta redirect URL com hint de client_id
    const envRedirect = getShopeeAdsEnv().redirectUrl || '';
    const redirectBase = envRedirect || `${new URL(request.url).origin}/api/shopee-ads/callback`;
    const redirectUrlWithHint = clientId
      ? `${redirectBase}${redirectBase.includes('?') ? '&' : '?'}hint_client_id=${encodeURIComponent(clientId)}`
      : redirectBase;

    const state = toBase64({
      clientId,
      region,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
      mode: clientId ? 'attach' : 'create',
      redirectSuccess: redirectSuccess,
      appType: 'ads', // Identificador do tipo de app
    });
    
    const url = await buildAdsAuthUrlAsync({ state, redirectUrl: redirectUrlWithHint });

    console.log("\n--- DEBUG: SHOPEE ADS AUTH URL GERADA ---");
    console.log("Partner ID: " + getShopeeAdsEnv().partnerId);
    console.log("URL de redirecionamento para a Shopee:", url);
    console.log("--- FIM DEBUG ---\n");

    if (doRedirect) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('[SHOPEE-ADS-CONNECT] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao gerar link de conexão Ads' }, { status: 500 });
  }
}
