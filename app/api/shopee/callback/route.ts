import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureShopeeEnv, getAccessToken, shopeeFetch } from '@/lib/shopee';
import { headers } from 'next/headers';

function fromBase64<T = any>(state: string): T {
  return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
}

export async function GET(request: Request) {
  try {
    ensureShopeeEnv();

    const headersList = headers();
    const proto = headersList.get('x-forwarded-proto') || 'http';
    const host = headersList.get('x-forwarded-host') || headersList.get('host');
    const urlObj = new URL(request.url);
    const path = urlObj.pathname;
    const search = urlObj.search;

    // Reconstrói URL pública a partir dos headers do proxy
    const reconstructedUrl = `${proto}://${host}${path}${search}`;
    const reconstructed = new URL(reconstructedUrl);
    const sp = reconstructed.searchParams;

    console.log("\n--- DEBUG: CALLBACK RECEBIDO ---");
    console.log("URL Original (request.url):", request.url);
    console.log("URL Reconstruída a partir dos Headers:", reconstructedUrl);
    console.log("searchParams:", reconstructed.searchParams.toString());
    console.log("--- FIM DEBUG ---\n");

    const code = sp.get('code') || undefined;
    let shop_id = sp.get('shop_id') || undefined;
    // Fallback robusto para shop_id via regex
    if (!shop_id) {
      const m = reconstructedUrl.match(/[?&]shop_id=([^&#]+)/i);
      if (m && m[1]) {
        shop_id = decodeURIComponent(m[1]);
      }
    }
    const state = sp.get('state') || undefined; // pode estar ausente
    const hintClientId = sp.get('hint_client_id') || undefined; // fallback quando state faltar

    console.log("Parsed -> code:", !!code, "shop_id:", shop_id, "state:", state ? 'present' : 'missing', "hint:", hintClientId || 'none');

    if (!code || !shop_id) {
      return NextResponse.json({ error: 'Parâmetros inválidos (code ou shop_id ausente)' }, { status: 400 });
    }

    // Decodifica state se existir; se não, segue fluxo criando cliente automaticamente
    let decoded: { clientId?: string; region?: string; mode?: 'attach' | 'create'; redirectSuccess?: string } = {};
    if (state) {
      try {
        decoded = fromBase64(state);
      } catch {
        decoded = {} as any;
      }
    }

    const tokenRes = await getAccessToken({ code, shop_id });
    const expiresAt = new Date(Date.now() + (tokenRes.expire_in ?? 0) * 1000);
    const finalShopId = String(tokenRes.shop_id || shop_id);

    console.log(`📅 DEBUG: Token recebido da Shopee:`, {
      has_access_token: !!tokenRes.access_token,
      has_refresh_token: !!tokenRes.refresh_token,
      access_token_length: tokenRes.access_token?.length || 0,
      refresh_token_length: tokenRes.refresh_token?.length || 0,
      expire_in_seconds: tokenRes.expire_in,
      expire_in_hours: tokenRes.expire_in ? Math.round(tokenRes.expire_in / 3600) : 'N/A',
      expire_in_days: tokenRes.expire_in ? Math.round(tokenRes.expire_in / (3600 * 24)) : 'N/A',
      expires_at: expiresAt.toISOString(),
      shop_id: finalShopId
    });

    // Determina clientId destino
    let clientId = decoded.clientId || hintClientId;
    if (!clientId) {
      // Sem hint/state: criar cliente novo
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
      } catch (_) {}
      const created = await prisma.clients.create({
        data: { name: shopName, owner_name: 'Shopee', shop_url: null },
        select: { id: true },
      });
      clientId = created.id;
    }

    // ✅ CRÍTICO: Sempre salva o refresh_token recebido (Shopee retorna novo a cada refresh)
    const upsertResult = await prisma.client_integrations.upsert({
      where: { client_id_provider: { client_id: clientId!, provider: 'shopee' } },
      create: {
        client_id: clientId!,
        provider: 'shopee',
        shop_id: finalShopId,
        merchant_id: tokenRes.merchant_id ? String(tokenRes.merchant_id) : null,
        region: decoded.region || 'BR',
        access_token: tokenRes.access_token,
        refresh_token: tokenRes.refresh_token, // ✅ Sempre salva o novo refresh_token
        token_expiry: expiresAt,
      },
      update: {
        shop_id: finalShopId,
        merchant_id: tokenRes.merchant_id ? String(tokenRes.merchant_id) : null,
        access_token: tokenRes.access_token,
        refresh_token: tokenRes.refresh_token, // ✅ Sempre atualiza o refresh_token (nunca mantém o antigo)
        token_expiry: expiresAt,
        updated_at: new Date(),
      },
    });

    console.log(`DEBUG: Integração salva no banco:`, {
      client_id: clientId,
      shop_id: upsertResult.shop_id,
      has_access_token_saved: !!upsertResult.access_token,
      access_token_length_saved: upsertResult.access_token?.length || 0,
      token_expiry: upsertResult.token_expiry
    });

    // Redireciona para página de sucesso se informado no state; senão, tenta redirecionar pelo hint
    const success = decoded.redirectSuccess || (hintClientId ? `${proto}://${host}/clientes/${hintClientId}?tab=integrations` : undefined);
    if (success) {
      return NextResponse.redirect(success);
    }

    return NextResponse.json({ ok: true, client_id: clientId, shop_id: finalShopId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro na callback' }, { status: 500 });
  }
}


