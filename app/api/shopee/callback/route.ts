import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureShopeeEnv, getAccessToken, shopeeFetch } from '@/lib/shopee';

function fromBase64<T = any>(state: string): T {
  return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
}

export async function GET(request: Request) {
  try {
    ensureShopeeEnv();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const shop_id = searchParams.get('shop_id');
    const state = searchParams.get('state');
    if (!code || !shop_id || !state) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }
    const decoded = fromBase64<{ clientId?: string; region?: string; mode?: 'attach' | 'create' }>(state);
    const tokenRes = await getAccessToken({ code, shop_id });
    const expiresAt = new Date(Date.now() + (tokenRes.expire_in ?? 0) * 1000);
    const finalShopId = String(tokenRes.shop_id || shop_id);

    // Se não houver clientId no estado, criamos um cliente automaticamente
    let clientId = decoded.clientId;
    if (!clientId) {
      let shopName = `Shopee Shop ${finalShopId}`;
      try {
        const info = await shopeeFetch<any>({
          path: '/api/v2/shop/get_shop_info',
          access_token: tokenRes.access_token,
          shop_id: finalShopId,
          method: 'GET',
        });
        if (info?.shop_name && typeof info.shop_name === 'string') {
          shopName = info.shop_name;
        }
      } catch (_) {
        // prossegue com nome padrão se falhar
      }
      const created = await prisma.clients.create({
        data: {
          name: shopName,
          owner_name: 'Shopee',
          shop_url: null,
        },
        select: { id: true },
      });
      clientId = created.id;
    }

    await prisma.client_integrations.upsert({
      where: { client_id_provider: { client_id: clientId!, provider: 'shopee' } },
      create: {
        client_id: clientId!,
        provider: 'shopee',
        shop_id: finalShopId,
        merchant_id: tokenRes.merchant_id ? String(tokenRes.merchant_id) : null,
        region: decoded.region || 'BR',
        access_token: tokenRes.access_token,
        refresh_token: tokenRes.refresh_token,
        token_expiry: expiresAt,
      },
      update: {
        shop_id: finalShopId,
        merchant_id: tokenRes.merchant_id ? String(tokenRes.merchant_id) : null,
        access_token: tokenRes.access_token,
        refresh_token: tokenRes.refresh_token,
        token_expiry: expiresAt,
        updated_at: new Date(),
      },
    });
    // Redireciona para uma página de sucesso ou retorna JSON
    const redirect = searchParams.get('redirect_success');
    if (redirect) {
      return NextResponse.redirect(redirect);
    }
    return NextResponse.json({ ok: true, client_id: clientId, shop_id: tokenRes.shop_id || shop_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro na callback' }, { status: 500 });
  }
}


