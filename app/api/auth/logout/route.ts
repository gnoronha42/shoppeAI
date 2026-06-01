import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Fazendo logout do usuário...');
    
    // Criar resposta que remove o cookie de autenticação
    const response = NextResponse.json({ 
      message: 'Logout realizado com sucesso' 
    });
    
    // Remover o cookie auth_token
    response.cookies.set('auth_token', '', {
      expires: new Date(0), // Data no passado para expirar o cookie
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    
    return response;
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 
export const dynamic = 'force-dynamic';
