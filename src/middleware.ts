import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-sistema-loja-roupas-infantil-adolescente-2026-production'
);

const COOKIE_NAME = 'auth_session_token';

// Rotas públicas que não exigem autenticação administrativa
const publicRoutes = ['/login', '/forgot-password', '/shop', '/produto', '/carrinho', '/checkout'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignorar arquivos estáticos, favicon, imagens, APIs de webhook e loja pública
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Se o usuário está tentando acessar a página de login
  if (pathname === '/login' || pathname === '/forgot-password') {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        // Se já está logado e acessou /login, redireciona para o dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch {
        // Token inválido, segue para o login normalmente
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Rotas da Loja Online Pública (Shop)
  if (pathname.startsWith('/shop') || pathname.startsWith('/produto') || pathname.startsWith('/carrinho')) {
    return NextResponse.next();
  }

  // Redireciona a raiz para /login se não logado ou /dashboard se logado
  if (pathname === '/') {
    if (token) {
      try {
        await jwtVerify(token, JWT_SECRET);
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Se não houver token, redireciona imediatamente para o /login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Valida o token JWT
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Injeta os dados do usuário nos headers para os Server Components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-store-id', payload.storeId as string);
    requestHeaders.set('x-user-role', payload.role as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (err) {
    // Token inválido ou expirado -> remove cookie e redireciona para login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
