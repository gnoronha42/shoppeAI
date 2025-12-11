import { createHmac } from 'crypto';

const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '2008642';
const SHOPEE_SECRET = process.env.SHOPEE_PARTNER_KEY || '477545635946466766487151426e6b6e59497a4e7a57794f4d6e63435744715a';
const SHOPEE_BASE_URL = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com';

export { SHOPEE_PARTNER_ID, SHOPEE_SECRET, SHOPEE_BASE_URL };

// ... (funções auxiliares: toHexHmacSHA256, getShopeeServerTimestamp)

function toHexHmacSHA256(str: string, secret: string): string {
  return createHmac('sha256', secret).update(str).digest('hex');
}

async function getShopeeServerTimestamp(): Promise<number> {
  return Math.floor(Date.now() / 1000);
}

// ... (outras funções existentes)

export async function shopeeFetch<T = unknown>(args: {
  path: string;
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  access_token?: string; // Opcional para endpoints públicos
  shop_id?: string | number; // Opcional para endpoints públicos
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

  if (!isPublic) {
    search.set('shop_id', String(args.shop_id));
    search.set('access_token', args.access_token!);
  }

  for (const [k, v] of Object.entries(args.query || {})) {
    if (v !== undefined) search.set(k, String(v));
  }
  const url = `${SHOPEE_BASE_URL}${path}?${search.toString()}`;
  
  // 📋 LOG DA REQUEST
  const requestBody = method === 'POST' && args.body ? JSON.stringify(args.body) : null;
  console.log(`[shopeeFetch] ${method} ${path} | Public: ${isPublic} | Shop: ${args.shop_id || 'N/A'}`);
  
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
  
  // Log de erro se a API retornar erro no corpo JSON
  if (responseData.error) {
    console.warn(`⚠️ [shopeeFetch] API Error: ${responseData.error} - ${responseData.message || ''}`);
  }

  return responseData as T;
}

// ... (exportar outras funções necessárias)
export async function buildAuthUrlAsync(params: { state: string; redirectUrl?: string }) {
  // Re-implementar se necessário ou manter existente no arquivo
  // ...
  // Simplificado para o exemplo, manter o original
  return '';
}
export function ensureShopeeEnv() {}
export async function getAccessToken(args: any) { return {} as any; }
export async function refreshAccessToken(args: any) { return {} as any; }

