import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdsAccessToken, getShopeeAdsEnv } from '@/lib/shopee-ads-auth';

function fromBase64<T = unknown>(b64: string): T {
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
}

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const shop_id = searchParams.get('shop_id');
    const state = searchParams.get('state');
    const hintClientId = searchParams.get('hint_client_id');

    console.log('[SHOPEE-ADS-CALLBACK] Recebido callback OAuth de Ads');
    console.log('[SHOPEE-ADS-CALLBACK] code:', code?.substring(0, 20) + '...');
    console.log('[SHOPEE-ADS-CALLBACK] shop_id:', shop_id);
    console.log('[SHOPEE-ADS-CALLBACK] state:', state?.substring(0, 50));
    console.log('[SHOPEE-ADS-CALLBACK] hint_client_id:', hintClientId);

    if (!code || !shop_id) {
      return NextResponse.json({ error: 'code e shop_id são obrigatórios' }, { status: 400 });
    }

    // Decodifica state
    let decoded: {
      clientId?: string;
      region?: string;
      mode?: string;
      redirectSuccess?: string;
      appType?: string;
    } = {};
    
    if (state) {
      try {
        decoded = fromBase64(state);
      } catch {
        decoded = {} as any;
      }
    }

    // Obtém tokens do App de Ads
    const tokenRes = await getAdsAccessToken({ code, shop_id });
    const expiresAt = new Date(Date.now() + (tokenRes.expire_in ?? 0) * 1000);
    const finalShopId = String(tokenRes.shop_id || shop_id);
    const partnerId = getShopeeAdsEnv().partnerId;

    console.log('[SHOPEE-ADS-CALLBACK] Tokens obtidos com sucesso');
    console.log('[SHOPEE-ADS-CALLBACK] Partner ID usado:', partnerId);
    console.log('[SHOPEE-ADS-CALLBACK] Shop ID:', finalShopId);
    console.log('[SHOPEE-ADS-CALLBACK] Token expira em:', expiresAt.toISOString());

    // Determina clientId destino
    let clientId = decoded.clientId || hintClientId;
    
    if (!clientId) {
      // Sem hint/state: criar cliente novo
      const shopName = `Shopee Shop ${finalShopId}`;
      const created = await prisma.clients.create({
        data: { name: shopName, owner_name: 'Shopee', shop_url: null },
        select: { id: true },
      });
      clientId = created.id;
      console.log('[SHOPEE-ADS-CALLBACK] Novo cliente criado:', clientId);
    }

    // Salva/atualiza a integração de Ads (provider = "shopee_ads")
    const upsertResult = await prisma.client_integrations.upsert({
      where: { client_id_provider: { client_id: clientId!, provider: 'shopee_ads' } },
      create: {
        client_id: clientId!,
        provider: 'shopee_ads',
        app_type: 'ads',
        shop_id: finalShopId,
        merchant_id: tokenRes.merchant_id ? String(tokenRes.merchant_id) : null,
        region: decoded.region || 'BR',
        access_token: tokenRes.access_token,
        refresh_token: tokenRes.refresh_token,
        token_expiry: expiresAt,
        partner_id: partnerId,
      },
      update: {
        shop_id: finalShopId,
        merchant_id: tokenRes.merchant_id ? String(tokenRes.merchant_id) : null,
        access_token: tokenRes.access_token,
        refresh_token: tokenRes.refresh_token,
        token_expiry: expiresAt,
        partner_id: partnerId,
        updated_at: new Date(),
      },
    });

    console.log('[SHOPEE-ADS-CALLBACK] Integração de Ads salva:', {
      id: upsertResult.id,
      client_id: clientId,
      provider: 'shopee_ads',
      shop_id: finalShopId,
      partner_id: partnerId,
    });

    // Redireciona para página de sucesso
    let redirectTo = decoded.redirectSuccess;
    if (!redirectTo) {
      redirectTo = clientId
        ? `${origin}/clientes/${clientId}?tab=integrations&ads_connected=1`
        : `${origin}/clientes?ads_connected=1`;
    }

    console.log('[SHOPEE-ADS-CALLBACK] Redirecionando para:', redirectTo);
    return NextResponse.redirect(redirectTo);

  } catch (err: any) {
    console.error('[SHOPEE-ADS-CALLBACK] Erro:', err);
    const origin = new URL(request.url).origin;
    const errorUrl = `${origin}/clientes?error=${encodeURIComponent(err.message || 'Erro na integração de Ads')}`;
    return NextResponse.redirect(errorUrl);
  }
}
