import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/login', '/api/auth'];

export function middleware(request: NextRequest) {
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  // Se for rota pública, permite o acesso
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Verifica se existe token de autenticação
  const token = request.cookies.get('auth_token')?.value || request.headers.get('authorization')?.split(' ')[1];

  // Se não houver token, redireciona para o login
  if (!token) {
    // Se for uma rota da API, retorna erro 401
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }
    
    // Se for uma rota de página, redireciona para o login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configurar em quais rotas o middleware será executado
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth (authentication routes)
     * 2. /login (login page)
     * 3. /_next (Next.js internals)
     * 4. /fonts (static files)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!api/auth|login|_next|fonts|favicon.ico|sitemap.xml).*)',
  ],
}; 