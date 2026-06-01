import { NextRequest, NextResponse } from 'next/server';

const SHOPEE_PREFIXES = ['/api/shopee', '/api/shopee-ads'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isShopeeApi = SHOPEE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (!isShopeeApi) return NextResponse.next();

  if (process.env.SHOPEE_INTEGRATION_ENABLED === 'false') {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        message:
          'Integração Shopee temporariamente desativada (SHOPEE_INTEGRATION_ENABLED=false).',
      },
      { status: 503 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/shopee/:path*', '/api/shopee-ads/:path*'],
};
