import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { buildAuthUrlAsync, ensureShopeeEnv, getShopeeEnv } from '@/lib/shopee';

function toBase64(obj: unknown) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}

export async function GET(request: Request) {
  try {
    ensureShopeeEnv();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id'); // opcional
    const region = searchParams.get('region') || 'BR';
    const doRedirect = searchParams.get('redirect') === '1';
    const redirectSuccess = searchParams.get('redirect_success'); // +++ CAPTURAR URL DE SUCESSO

    // Monta um redirect com hint de client_id para fallback quando state faltar------------
    const envRedirect = getShopeeEnv().redirectUrl || '';
    const redirectBase = envRedirect || `${new URL(request.url).origin}/api/shopee/callback`;
    const redirectUrlWithHint = clientId
      ? `${redirectBase}${redirectBase.includes('?') ? '&' : '?'}hint_client_id=${encodeURIComponent(clientId)}`
      : redirectBase;

    const state = toBase64({
      clientId,
      region,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
      mode: clientId ? 'attach' : 'create', // sem clientId, criaremos um cliente na callback
      redirectSuccess: redirectSuccess, // +++ ADICIONAR AO STATE
    });
    const url = await buildAuthUrlAsync({ state, redirectUrl: redirectUrlWithHint });

    console.log("\n--- DEBUG: SHOPEE AUTH URL GERADA ---");
    console.log("URL de redirecionamento para a Shopee:", url);
    console.log("--- FIM DEBUG ---\n");

    if (doRedirect) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar link' }, { status: 500 });
  }
}


