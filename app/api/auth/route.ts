// app/api/auth/route.ts
import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { sign, verify } from 'jsonwebtoken';
import { PERMISSIONS, DEFAULT_PERMISSIONS, type Role, type Permission } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface User {
  id: string;
  email: string;
  password: string;
  role: string | null;
  name: string;
  permissions: string[] | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Busca o usuário no banco
    const user: User | null = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        name: true,
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Comparação direta da senha
    const isValidPassword = user.password === password;

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Remove a senha dos dados retornados
    const { password: _, ...userWithoutPassword } = user;

    // Determina as permissões do usuário
    const defaultRolePermissions = DEFAULT_PERMISSIONS[user.role as Role] || DEFAULT_PERMISSIONS.user;
    const permissions = user.permissions?.length ? user.permissions : defaultRolePermissions;

    // Gera o token JWT
    const token = sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      user: userWithoutPassword,
      permissions,
      token
    });
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Rota para verificar permissões do usuário atual
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Extrai o token do header (formato: "Bearer <token>")
    const token = authHeader.split(' ')[1];

    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      );
    }

    // Verifica e decodifica o token
    const decoded = verify(token, JWT_SECRET) as { userId: string };
    
    // Busca o usuário e suas permissões
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        role: true,
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Determina as permissões do usuário
    const defaultRolePermissions = DEFAULT_PERMISSIONS[user.role as Role] || DEFAULT_PERMISSIONS.user;
    const permissions = user.permissions?.length ? user.permissions : defaultRolePermissions;

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Re-exportar as permissões para compatibilidade com código existente
export { PERMISSIONS };