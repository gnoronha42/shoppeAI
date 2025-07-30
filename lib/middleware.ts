import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function validatePermissions(request: Request, requiredPermissions: string[]) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('Auth Header:', authHeader);
    
    if (!authHeader) {
      console.log('Nenhum header de autorização encontrado');
      return {
        error: 'Não autorizado',
        status: 401
      };
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token ? 'Presente' : 'Ausente');

    if (!token) {
      console.log('Token não fornecido no header');
      return {
        error: 'Token não fornecido',
        status: 401
      };
    }

    // Verificar e decodificar o token
    const decoded = verify(token, JWT_SECRET) as { userId: string };
    console.log('Token decodificado, userId:', decoded.userId);
    
    // Buscar usuário e suas permissões
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        role: true,
        permissions: true,
      },
    });

    console.log('Usuário encontrado:', user ? 'Sim' : 'Não');
    if (user) {
      console.log('Role:', user.role);
      console.log('Permissões:', user.permissions);
    }

    if (!user) {
      console.log('Usuário não encontrado no banco');
      return {
        error: 'Usuário não encontrado',
        status: 404
      };
    }

    // Se for superuser, tem todas as permissões
    if (user.role === 'superuser') {
      console.log('Usuário é superuser, acesso permitido');
      return { isAuthorized: true };
    }

    // Verificar se o usuário tem todas as permissões necessárias
    const hasAllPermissions = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );

    console.log('Permissões requeridas:', requiredPermissions);
    console.log('Tem todas as permissões?', hasAllPermissions);

    if (!hasAllPermissions) {
      console.log('Permissão negada');
      return {
        error: 'Permissão negada',
        status: 403
      };
    }

    console.log('Acesso autorizado');
    return { isAuthorized: true };
  } catch (error) {
    console.error('Erro na validação de permissões:', error);
    return {
      error: 'Erro na autenticação',
      status: 401
    };
  }
} 