import crypto from 'crypto';

// Config via variáveis de ambiente (sem defaults inline)
const SHOPEE_BASE_URL = process.env.SHOPEE_BASE_URL || '';
const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '';
const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const SHOPEE_REDIRECT_URL = process.env.SHOPEE_REDIRECT_URL || '';

// Usa a chave completa (incluindo eventual prefixo "shpk") para o HMAC
const SHOPEE_SECRET = SHOPEE_PARTNER_KEY;

export { SHOPEE_PARTNER_ID, SHOPEE_SECRET, SHOPEE_BASE_URL };

function toHexHmacSHA256(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
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
    return getTimestamp();
  }
}

export async function buildAuthUrlAsync(params: { state: string; redirectUrl?: string }) {
  const path = '/api/v2/shop/auth_partner';
  const timestamp = await getShopeeServerTimestamp();
  const redirect = encodeURIComponent(params.redirectUrl || SHOPEE_REDIRECT_URL);
  const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  const url = `${SHOPEE_BASE_URL}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}&redirect=${redirect}&state=${encodeURIComponent(params.state)}`;
  return url;
}

export async function getAccessToken(args: { code: string; shop_id: string }) {
  const path = '/api/v2/auth/token/get';
  const timestamp = await getShopeeServerTimestamp();
  
  const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  
  const url = `${SHOPEE_BASE_URL}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;
  
  console.log(`DEBUG: getAccessToken request:`, {
    url,
    partner_id: SHOPEE_PARTNER_ID,
    shop_id: args.shop_id,
    code_length: args.code?.length || 0,
    timestamp
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: args.code,
      shop_id: Number(args.shop_id),
      partner_id: Number(SHOPEE_PARTNER_ID),
      timestamp,
    }),
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopee token/get failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data;
}

export async function refreshAccessToken(args: { refresh_token: string }) {
  const path = '/api/v2/auth/token/refresh';
  const timestamp = await getShopeeServerTimestamp();
  
  const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}${args.refresh_token}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  const url = `${SHOPEE_BASE_URL}${path}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      refresh_token: args.refresh_token,
      partner_id: Number(SHOPEE_PARTNER_ID),
      timestamp,
      sign,
    }),
  });
  
  if (!res.ok) {
    const text = await res.text();
    const errorMsg = `Shopee token/refresh failed: ${res.status} ${text}`;
    console.error(`❌ [refreshAccessToken] Erro:`, errorMsg);
    
    if (res.status === 403 || text.includes('invalid') || text.includes('expired')) {
      throw Object.assign(new Error('Refresh token expirado - reautenticação necessária'), { 
        code: 'REFRESH_TOKEN_EXPIRED',
        status: res.status,
        response: text 
      });
    }
    throw new Error(errorMsg);
  }
  
  const data = await res.json();
  return data;
}

export async function shopeeFetch<T = unknown>(args: {
  path: string;
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  access_token?: string;
  shop_id?: string | number;
}) {
  const path = args.path.startsWith('/') ? args.path : `/${args.path}`;
  const method = args.method || 'GET';
  const timestamp = await getShopeeServerTimestamp();

  // Detectar se é endpoint público (sem access_token)
  const isPublic = !args.access_token;

  let baseString: string;
  if (isPublic) {
    // Assinatura para endpoints públicos: partner_id + path + timestamp
    baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
  } else {
    // Assinatura padrão: partner_id + path + timestamp + access_token + shop_id
    baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}${args.access_token}${args.shop_id}`;
  }

  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  const search = new URLSearchParams();
  search.set('partner_id', String(SHOPEE_PARTNER_ID));
  search.set('timestamp', String(timestamp));
  search.set('sign', sign);

  if (!isPublic && args.shop_id) {
    search.set('shop_id', String(args.shop_id));
    search.set('access_token', args.access_token!);
  }

  for (const [k, v] of Object.entries(args.query || {})) {
    if (v !== undefined) search.set(k, String(v));
  }
  const url = `${SHOPEE_BASE_URL}${path}?${search.toString()}`;
  
  const requestBody = method === 'POST' && args.body ? JSON.stringify(args.body) : null;
  console.log(`📡 [shopeeFetch] ${method} ${path} | Public: ${isPublic} | Shop: ${args.shop_id || 'N/A'}`);
  
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
  
  if (!res.ok) {
    throw new Error(`Shopee API ${path} failed: ${res.status} ${responseText}`);
  }
  
  return responseData as T;
}

export function ensureShopeeEnv() {
  const missing: string[] = [];
  if (!SHOPEE_BASE_URL) missing.push('SHOPEE_BASE_URL');
  if (!SHOPEE_PARTNER_ID) missing.push('SHOPEE_PARTNER_ID');
  if (!SHOPEE_PARTNER_KEY) missing.push('SHOPEE_PARTNER_KEY');
  if (!SHOPEE_REDIRECT_URL) missing.push('SHOPEE_REDIRECT_URL');
  if (missing.length) {
    throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
  }
}

export function getShopeeEnv() {
  return {
    baseUrl: SHOPEE_BASE_URL,
    partnerId: SHOPEE_PARTNER_ID,
    redirectUrl: SHOPEE_REDIRECT_URL,
  };
}
