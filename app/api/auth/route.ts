import { NextResponse } from 'next/server';
import prisma from "@/lib/prisma";
import { sign, verify } from 'jsonwebtoken';

// Lista de todas as permissões possíveis
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_CLIENTS: 'manage_clients', // Criar, editar e visualizar clientes
  MANAGE_ANALYSIS: 'manage_analysis', // Gerar e visualizar análises
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  VIEW_HISTORY: 'view_history',
  USE_AI: 'use_ai',
} as const;

// Permissões padrão para cada tipo de usuário
const DEFAULT_PERMISSIONS = {
  superuser: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.MANAGE_ANALYSIS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.USE_AI,
  ],
  user: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_ANALYSIS,
    PERMISSIONS.VIEW_HISTORY,
    PERMISSIONS.USE_AI,
  ],
} as const;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Tentativa de login para:', email);

    // Busca o usuário no banco
    const user = await prisma.users.findUnique({
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

    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
    if (user) {
      console.log('Role do usuário:', user.role);
      console.log('ID do usuário:', user.id);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Comparação direta da senha
    const isValidPassword = user.password === password;
    console.log('Senha válida:', isValidPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Remove a senha dos dados retornados
    const { password: _, ...userWithoutPassword } = user;

    // Determina as permissões do usuário
    const defaultRolePermissions = DEFAULT_PERMISSIONS[user.role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.user;
    const permissions = user.permissions?.length ? user.permissions : defaultRolePermissions;

    console.log('Role do usuário:', user.role);
    console.log('Permissões atribuídas:', permissions);

    // Gera o token JWT
    const tokenData = { 
      userId: user.id,
      email: user.email,
      role: user.role 
    };
    console.log('Dados do token:', tokenData);

    const token = sign(tokenData, JWT_SECRET, { expiresIn: '24h' });
    console.log('Token gerado:', token ? 'Sim' : 'Não');

    const response = {
      user: userWithoutPassword,
      permissions,
      token
    };

    console.log('Login bem-sucedido para:', email);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro detalhado na autenticação:', error);
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
    const defaultRolePermissions = DEFAULT_PERMISSIONS[user.role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.user;
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