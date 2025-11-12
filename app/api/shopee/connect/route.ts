import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { buildAuthUrlAsync, ensureShopeeEnv } from '@/lib/shopee';

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
    const state = toBase64({
      clientId,
      region,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
      mode: clientId ? 'attach' : 'create', // sem clientId, criaremos um cliente na callback
    });
    const url = await buildAuthUrlAsync({ state });
    if (doRedirect) {
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar link' }, { status: 500 });
  }
}


