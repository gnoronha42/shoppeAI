import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas
const publicRoutes = ['/login', '/api/auth', '/api/analysts', '/selleria', '/obrigado', '/calculadora'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 🔓 Se for rota pública, deixa passar
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 🔒 Pega token
  const token =
    request.cookies.get('auth_token')?.value ||
    request.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 🔎 Middleware só roda em páginas protegidas
export const config = {
  matcher: ['/((?!_next|fonts|favicon.ico|sitemap.xml).*)'],
};
