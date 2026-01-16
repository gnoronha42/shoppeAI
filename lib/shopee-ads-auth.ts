/**
 * Biblioteca para autenticação OAuth com o App de Ads da Shopee
 * 
 * Este app tem permissões específicas para APIs de Ads:
 * - v2.ads.get_total_balance
 * - v2.ads.get_all_cpc_ads_daily_performance
 * - v2.ads.get_shop_campaign_list
 * - etc.
 * 
 * Partner ID: 2014411 (SellerIA Ads Service)
 */

// Credenciais do App de Ads (separadas do app principal de vendas)
const SHOPEE_BASE_URL = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com';
const SHOPEE_ADS_PARTNER_ID = process.env.SHOPEE_ADS_PARTNER_ID || '2014411';
const SHOPEE_ADS_PARTNER_KEY = process.env.SHOPEE_ADS_PARTNER_KEY || 'shpk556366795377766741534a765372484141456e44527a79694b5a62457161';
const SHOPEE_ADS_REDIRECT_URL = process.env.SHOPEE_ADS_REDIRECT_URL || '';

async function toHexHmacSHA256(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    algorithm,
    false,
    ["sign", "verify"]
  );
  const signature = await crypto.subtle.sign(
    algorithm.name,
    key,
    enc.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getShopeeServerTimestamp(): Promise<number> {
  try {
    const res = await fetch(`${SHOPEE_BASE_URL}/api/v2/public/get_shopee_openapi_time`);
    if (!res.ok) throw new Error(`time fetch failed ${res.status}`);
    const data = (await res.json()) as { timestamp?: number };
    if (data?.timestamp && Number.isFinite(data.timestamp)) {
      return data.timestamp as number;
    }
    throw new Error('invalid time payload');
  } catch {
    return Math.floor(Date.now() / 1000);
  }
}

/**
 * Gera URL de autorização OAuth para o App de Ads
 */
export async function buildAdsAuthUrlAsync(params: { state: string; redirectUrl?: string }) {
  const path = '/api/v2/shop/auth_partner';
  const timestamp = await getShopeeServerTimestamp();
  const redirect = encodeURIComponent(params.redirectUrl || SHOPEE_ADS_REDIRECT_URL);
  const baseString = `${SHOPEE_ADS_PARTNER_ID}${path}${timestamp}`;
  const sign = await toHexHmacSHA256(baseString, SHOPEE_ADS_PARTNER_KEY);
  const url = `${SHOPEE_BASE_URL}${path}?partner_id=${SHOPEE_ADS_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&redirect=${redirect}&state=${encodeURIComponent(params.state)}`;
  
  console.log(`[SHOPEE-ADS-AUTH] URL de autorização gerada para Partner ID: ${SHOPEE_ADS_PARTNER_ID}`);
  
  return url;
}

/**
 * Troca o código de autorização por tokens de acesso (App de Ads)
 */
export async function getAdsAccessToken(args: { code: string; shop_id: string }) {
  const path = '/api/v2/auth/token/get';
  const timestamp = await getShopeeServerTimestamp();
  
  const baseString = `${SHOPEE_ADS_PARTNER_ID}${path}${timestamp}`;
  const sign = await toHexHmacSHA256(baseString, SHOPEE_ADS_PARTNER_KEY);
  
  const url = `${SHOPEE_BASE_URL}${path}?partner_id=${SHOPEE_ADS_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;
  
  console.log(`[SHOPEE-ADS-AUTH] getAdsAccessToken request:`, {
    url,
    partner_id: SHOPEE_ADS_PARTNER_ID,
    shop_id: args.shop_id,
    code_length: args.code?.length || 0,
  });
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: args.code,
      shop_id: Number(args.shop_id),
      partner_id: Number(SHOPEE_ADS_PARTNER_ID),
      timestamp,
    }),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopee Ads token/get failed: ${res.status} ${text}`);
  }
  
  const data = await res.json();
  
  console.log(`[SHOPEE-ADS-AUTH] Resposta da Shopee getAdsAccessToken:`, {
    status: res.status,
    has_access_token: !!data?.access_token,
    has_refresh_token: !!data?.refresh_token
  });
  
  return data as {
    access_token: string;
    refresh_token: string;
    expire_in: number;
    merchant_id?: number;
    shop_id?: number;
    request_id?: string;
  };
}

/**
 * Refresh do token de acesso do App de Ads
 */
export async function refreshAdsAccessToken(args: { refresh_token: string; shop_id?: number | string }) {
  const path = '/api/v2/auth/access_token/get';
  const timestamp = await getShopeeServerTimestamp();
  
  const baseString = `${SHOPEE_ADS_PARTNER_ID}${path}${timestamp}`;
  const sign = await toHexHmacSHA256(baseString, SHOPEE_ADS_PARTNER_KEY);
  
  const queryParams = new URLSearchParams({
    partner_id: SHOPEE_ADS_PARTNER_ID.toString(),
    timestamp: timestamp.toString(),
    sign: sign
  });
  
  const url = `${SHOPEE_BASE_URL}${path}?${queryParams.toString()}`;
  
  const payload: any = {
    refresh_token: args.refresh_token,
    partner_id: Number(SHOPEE_ADS_PARTNER_ID)
  };

  if (args.shop_id) {
    payload.shop_id = Number(args.shop_id);
  }
  
  console.log(`[SHOPEE-ADS-AUTH] refreshAdsAccessToken request:`, {
    partner_id: SHOPEE_ADS_PARTNER_ID,
    shop_id: args.shop_id,
  });
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error(`[SHOPEE-ADS-AUTH] Erro no refresh:`, {
      status: res.status,
      response: text,
    });
    
    if (res.status === 403 || text.includes('invalid') || text.includes('expired')) {
      throw Object.assign(new Error('Refresh token de Ads expirado - reautenticação necessária'), { 
        code: 'REFRESH_TOKEN_EXPIRED',
        status: res.status,
        response: text 
      });
    }
    
    throw new Error(`Shopee Ads token/refresh failed: ${res.status} ${text}`);
  }
  
  const data = await res.json();
  
  console.log(`[SHOPEE-ADS-AUTH] Refresh de Ads bem sucedido para shop_id: ${args.shop_id}`);
  
  return data as {
    access_token: string;
    refresh_token: string;
    expire_in: number;
    merchant_id?: number;
    shop_id?: number;
    request_id?: string;
  };
}

/**
 * Fetch genérico para APIs de Ads
 */
export async function shopeeAdsFetch<T = unknown>(args: {
  path: string;
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  access_token: string;
  shop_id: string | number;
}) {
  const path = args.path.startsWith('/') ? args.path : `/${args.path}`;
  const method = args.method || 'GET';
  const timestamp = await getShopeeServerTimestamp();
  const baseString = `${SHOPEE_ADS_PARTNER_ID}${path}${timestamp}${args.access_token}${args.shop_id}`;
  const sign = await toHexHmacSHA256(baseString, SHOPEE_ADS_PARTNER_KEY);
  
  const search = new URLSearchParams();
  search.set('partner_id', String(SHOPEE_ADS_PARTNER_ID));
  search.set('timestamp', String(timestamp));
  search.set('sign', sign);
  search.set('shop_id', String(args.shop_id));
  search.set('access_token', args.access_token);
  
  for (const [k, v] of Object.entries(args.query || {})) {
    if (v !== undefined) {
      if (Array.isArray(v)) {
        v.forEach(item => search.append(k, String(item)));
      } else {
        search.set(k, String(v));
      }
    }
  }
  
  const url = `${SHOPEE_BASE_URL}${path}?${search.toString()}`;
  
  console.log(`[SHOPEE-ADS-API] Request: ${method} ${path}`);
  console.log(`[SHOPEE-ADS-API] Partner ID: ${SHOPEE_ADS_PARTNER_ID}`);
  console.log(`[SHOPEE-ADS-API] Shop ID: ${args.shop_id}`);
  
  const requestBody = method === 'POST' && args.body ? JSON.stringify(args.body) : null;
  
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: requestBody || undefined,
  });
  
  const responseText = await res.text();
  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }
  
  console.log(`[SHOPEE-ADS-API] Response Status: ${res.status}`);
  console.log(`[SHOPEE-ADS-API] Response:`, JSON.stringify(responseData).substring(0, 500));
  
  if (!res.ok) {
    throw new Error(`Shopee Ads API ${path} failed: ${res.status} ${responseText}`);
  }
  
  return responseData as T;
}

/**
 * Verifica se as variáveis de ambiente do App de Ads estão configuradas
 */
export function ensureShopeeAdsEnv() {
  const missing: string[] = [];
  if (!SHOPEE_ADS_PARTNER_ID) missing.push('SHOPEE_ADS_PARTNER_ID');
  if (!SHOPEE_ADS_PARTNER_KEY) missing.push('SHOPEE_ADS_PARTNER_KEY');
  if (!SHOPEE_ADS_REDIRECT_URL) missing.push('SHOPEE_ADS_REDIRECT_URL');
  if (missing.length) {
    throw new Error(`Variáveis de ambiente do App de Ads faltando: ${missing.join(', ')}`);
  }
}

export function getShopeeAdsEnv() {
  return {
    baseUrl: SHOPEE_BASE_URL,
    partnerId: SHOPEE_ADS_PARTNER_ID,
    redirectUrl: SHOPEE_ADS_REDIRECT_URL,
  };
}
