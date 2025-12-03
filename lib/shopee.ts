import crypto from 'crypto';

// Config via variáveis de ambiente (sem defaults inline)
const SHOPEE_BASE_URL = process.env.SHOPEE_BASE_URL || '';
const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '';
const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const SHOPEE_REDIRECT_URL = process.env.SHOPEE_REDIRECT_URL || '';

// Usa a chave completa (incluindo eventual prefixo "shpk") para o HMAC
const SHOPEE_SECRET = SHOPEE_PARTNER_KEY;

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
  // Usa timestamp do servidor da Shopee (como em buildAuthUrlAsync)
  const timestamp = await getShopeeServerTimestamp();
  
  // BaseString para /api/v2/auth/token/get: partner_id + path + timestamp
  const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  
  // Adiciona partner_id, timestamp e sign como query parameters
  const url = `${SHOPEE_BASE_URL}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${timestamp}&sign=${sign}`;
  
  console.log(`DEBUG: getAccessToken request:`, {
    url,
    partner_id: SHOPEE_PARTNER_ID,
    shop_id: args.shop_id,
    code_length: args.code?.length || 0,
    timestamp,
    baseString,
    sign
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
  
  console.log(`DEBUG: Resposta da Shopee getAccessToken:`, {
    status: res.status,
    data: data,
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
 * 🔄 REFRESH TOKEN CORRIGIDO - Usa timestamp do servidor Shopee e sempre atualiza refresh_token
 * 
 * CRÍTICO: A Shopee retorna um NOVO refresh_token a cada refresh.
 * Sempre devemos salvar o novo refresh_token, nunca manter o antigo.
 */
export async function refreshAccessToken(args: { refresh_token: string; shop_id?: number | string }) {
  const path = '/api/v2/auth/token/refresh';
  
  // ✅ CORREÇÃO: Usa timestamp do servidor Shopee (mesmo padrão de getAccessToken)
  const timestamp = await getShopeeServerTimestamp();
  
  // BaseString: partner_id + path + timestamp + refresh_token
  const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}${args.refresh_token}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  const url = `${SHOPEE_BASE_URL}${path}`;
  
  console.log(`🔄 [refreshAccessToken] Request:`, {
    path,
    timestamp,
    refresh_token_preview: args.refresh_token?.slice(0, 8) + '...' + args.refresh_token?.slice(-4),
    refresh_token_length: args.refresh_token?.length || 0,
    shop_id: args.shop_id,
    baseString_preview: baseString.slice(0, 50) + '...',
    baseString_full: baseString, // Log completo para debug
    sign_preview: sign.slice(0, 16) + '...',
    partner_id: SHOPEE_PARTNER_ID,
    url: url
  });
  
  const payload: any = {
    refresh_token: args.refresh_token,
    partner_id: Number(SHOPEE_PARTNER_ID),
    timestamp,
    sign,
  };

  // Adiciona shop_id se fornecido
  if (args.shop_id) {
    payload.shop_id = Number(args.shop_id);
  }
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text();
    const errorMsg = `Shopee token/refresh failed: ${res.status} ${text}`;
    console.error(`❌ [refreshAccessToken] Erro completo:`, {
      status: res.status,
      statusText: res.statusText,
      error_response: text,
      url: url,
      partner_id: SHOPEE_PARTNER_ID,
      refresh_token_length: args.refresh_token?.length || 0,
      refresh_token_preview: args.refresh_token?.slice(0, 10) + '...' + args.refresh_token?.slice(-4),
      timestamp: timestamp,
      baseString: baseString,
      sign: sign
    });
    
    // Detecta se o refresh_token expirou (geralmente após 30 dias)
    if (res.status === 403 || text.includes('invalid') || text.includes('expired')) {
      throw Object.assign(new Error('Refresh token expirado - reautenticação necessária'), { 
        code: 'REFRESH_TOKEN_EXPIRED',
        status: res.status,
        response: text 
      });
    }
    
    // 404 pode significar que o token não foi encontrado ou não está válido ainda
    if (res.status === 404) {
      throw Object.assign(new Error('Refresh token não encontrado (404) - pode precisar aguardar alguns minutos após geração'), { 
        code: 'REFRESH_TOKEN_NOT_FOUND',
        status: res.status,
        response: text 
      });
    }
    
    throw new Error(errorMsg);
  }
  
  const data = await res.json();
  
  console.log(`✅ [refreshAccessToken] Sucesso:`, {
    has_access_token: !!data?.access_token,
    has_refresh_token: !!data?.refresh_token,
    expire_in_seconds: data?.expire_in,
    expire_in_hours: data?.expire_in ? Math.round(data.expire_in / 3600) : 'N/A',
    expire_in_days: data?.expire_in ? Math.round(data.expire_in / (3600 * 24)) : 'N/A',
    // Log para confirmar que recebemos novo refresh_token
    refresh_token_changed: data?.refresh_token && data.refresh_token !== args.refresh_token
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

export async function shopeeFetch<T = unknown>(args: {
  path: string;
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  access_token: string;
  shop_id: string | number;
}) {
  const path = args.path.startsWith('/') ? args.path : `/${args.path}`;
  const method = args.method || 'GET';
  // ✅ CORREÇÃO 3: Usar timestamp do servidor Shopee para consistência
  const timestamp = await getShopeeServerTimestamp();
  const baseString = `${SHOPEE_PARTNER_ID}${path}${timestamp}${args.access_token}${args.shop_id}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  const search = new URLSearchParams();
  search.set('partner_id', String(SHOPEE_PARTNER_ID));
  search.set('timestamp', String(timestamp));
  search.set('sign', sign);
  search.set('shop_id', String(args.shop_id));
  search.set('access_token', args.access_token);
  for (const [k, v] of Object.entries(args.query || {})) {
    if (v !== undefined) search.set(k, String(v));
  }
  const url = `${SHOPEE_BASE_URL}${path}?${search.toString()}`;
  
  // 📋 LOG COMPLETO DA REQUEST
  const requestBody = method === 'POST' && args.body ? JSON.stringify(args.body) : null;
  const requestDetails = {
    endpoint: `${SHOPEE_BASE_URL}${path}`,
    method: method,
    shop_id: String(args.shop_id),
    query_params: Object.fromEntries(search.entries()),
    body: requestBody ? JSON.parse(requestBody) : null,
    full_url: url,
    timestamp: timestamp,
    date_range: args.query?.time_from && args.query?.time_to ? {
      from: new Date(Number(args.query.time_from) * 1000).toISOString(),
      to: new Date(Number(args.query.time_to) * 1000).toISOString(),
      from_timestamp: args.query.time_from,
      to_timestamp: args.query.time_to,
      days: args.query.time_from && args.query.time_to ? 
        Math.ceil((Number(args.query.time_to) - Number(args.query.time_from)) / (24 * 60 * 60)) : null
    } : null
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('📡 [shopeeFetch] REQUEST COMPLETA PARA SHOPEE API');
  console.log('='.repeat(80));
  console.log('🔗 Endpoint:', requestDetails.endpoint);
  console.log('📋 Method:', requestDetails.method);
  console.log('🏪 Shop ID:', requestDetails.shop_id);
  console.log('📅 Timestamp:', requestDetails.timestamp);
  if (requestDetails.date_range) {
    console.log('📆 Intervalo de Datas:');
    console.log('   From:', requestDetails.date_range.from);
    console.log('   To:', requestDetails.date_range.to);
    console.log('   Days:', requestDetails.date_range.days);
  }
  console.log('🔑 Query Params:', JSON.stringify(requestDetails.query_params, null, 2));
  if (requestBody) {
    console.log('📦 Body:', JSON.stringify(JSON.parse(requestBody), null, 2));
  }
  console.log('🌐 Full URL:', requestDetails.full_url);
  console.log('='.repeat(80) + '\n');
  
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
  
  // 📋 LOG COMPLETO DA RESPONSE
  console.log('\n' + '='.repeat(80));
  console.log('📥 [shopeeFetch] RESPONSE DA SHOPEE API');
  console.log('='.repeat(80));
  console.log('🔗 Endpoint:', requestDetails.endpoint);
  console.log('📊 Status:', res.status, res.statusText);
  console.log('📦 Response Body:', JSON.stringify(responseData, null, 2));
  console.log('📏 Response Size:', responseText.length, 'bytes');
  console.log('='.repeat(80) + '\n');
  
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
