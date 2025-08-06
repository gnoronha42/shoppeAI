// lib/middleware.ts
import { verify } from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { PERMISSIONS, DEFAULT_PERMISSIONS, type Permission, type Role } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Tipos para melhor type safety
interface AuthError {
  error: string;
  status: number;
}

interface AuthSuccess {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  permissions: Permission[];
}

type AuthResult = AuthError | AuthSuccess;

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

interface UserFromDB {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[] | null;
  // ❌ REMOVIDO: is_active: boolean;
}

/**
 * Função para extrair token do request (header ou cookie)
 */
function extractToken(request: Request): string | null {
  // Primeiro tenta extrair do header Authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Se não encontrou no header, tenta extrair do cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const authTokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    if (authTokenMatch) {
      return authTokenMatch[1];
    }
    
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}

/**
 * Função para validar permissões de usuário
 * @param request - Request object do Next.js
 * @param requiredPermissions - Array de permissões necessárias
 * @returns Resultado da validação
 */
export async function validatePermissions(
  request: Request, 
  requiredPermissions: string[] = []
): Promise<AuthResult> {
  try {
    console.log('=== VALIDANDO PERMISSÕES ===');
    console.log('Permissões necessárias:', requiredPermissions);
    
    // Extrair token do header Authorization ou cookies
    const token = extractToken(request);
    
    console.log('Token extraído:', token ? 'presente' : 'ausente');

    if (!token) {
      console.log('❌ Token não encontrado');
      return {
        error: 'Token de autorização necessário',
        status: 401
      };
    }

    // Verificar e decodificar JWT
    let decoded: JWTPayload;
    try {
      decoded = verify(token, JWT_SECRET) as JWTPayload;
      console.log('✅ Token JWT válido para usuário:', decoded.userId);
    } catch (jwtError: any) {
      console.log('❌ Erro JWT:', jwtError.message);
      return {
        error: 'Token inválido ou expirado',
        status: 401
      };
    }

    // Buscar usuário no banco de dados - ✅ CORRIGIDO: removido is_active
    const user: any = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        // ❌ REMOVIDO: is_active: true,
      },
    });

    if (!user) {
      console.log('❌ Usuário não encontrado:', decoded.userId);
      return {
        error: 'Usuário não encontrado',
        status: 404
      };
    }

    // ❌ REMOVIDO: Verificação de is_active
    // if (!user.is_active) {
    //   console.log('❌ Usuário inativo:', user.email);
    //   return {
    //     error: 'Usuário inativo',
    //     status: 403
    //   };
    // }

    console.log('✅ Usuário encontrado:', {
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Determinar permissões do usuário
    const defaultRolePermissions = DEFAULT_PERMISSIONS[user.role as Role] || DEFAULT_PERMISSIONS.user;
    const userPermissions = user.permissions && user.permissions.length > 0 
      ? user.permissions as Permission[]
      : defaultRolePermissions;

    console.log('Permissões do usuário:', userPermissions);

    // Verificar se o usuário tem todas as permissões necessárias
    if (requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission as Permission)
      );

      if (!hasAllPermissions) {
        console.log('❌ Permissões insuficientes');
        console.log('Necessárias:', requiredPermissions);
        console.log('Usuário possui:', userPermissions);
        return {
          error: 'Permissões insuficientes para esta ação',
          status: 403
        };
      }
    }

    console.log('✅ Validação de permissões bem-sucedida');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      permissions: userPermissions
    };

  } catch (error) {
    console.error('❌ Erro na validação de permissões:', error);
    return {
      error: 'Erro interno na validação de permissões',
      status: 500
    };
  }
}

/**
 * Função para verificar uma permissão específica
 * @param request - Request object
 * @param permission - Permissão específica a verificar
 * @returns True se o usuário tem a permissão
 */
export async function hasPermission(request: Request, permission: string): Promise<boolean> {
  const result = await validatePermissions(request, [permission]);
  return !('error' in result);
}

/**
 * Função para verificar se o usuário tem pelo menos uma das permissões
 * @param request - Request object
 * @param permissions - Array de permissões (OR logic)
 * @returns Resultado da validação
 */
export async function hasAnyPermission(request: Request, permissions: string[]): Promise<AuthResult> {
  try {
    const authResult = await validatePermissions(request, []);
    
    if ('error' in authResult) {
      return authResult;
    }

    const userPermissions = authResult.permissions;
    const hasAtLeastOne = permissions.some(permission => 
      userPermissions.includes(permission as Permission)
    );

    if (!hasAtLeastOne) {
      return {
        error: 'Você não possui nenhuma das permissões necessárias',
        status: 403
      };
    }

    return authResult;
  } catch (error) {
    console.error('Erro em hasAnyPermission:', error);
    return {
      error: 'Erro interno na validação',
      status: 500
    };
  }
}

/**
 * Middleware para verificar se o usuário é admin ou superuser
 * @param request - Request object
 * @returns Resultado da validação
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const authResult = await validatePermissions(request, []);
  
  if ('error' in authResult) {
    return authResult;
  }

  const userRole = authResult.user.role;
  if (!['admin', 'superuser'].includes(userRole)) {
    return {
      error: 'Acesso negado - permissão de administrador necessária',
      status: 403
    };
  }

  return authResult;
}

/**
 * Middleware para verificar se o usuário é superuser
 * @param request - Request object
 * @returns Resultado da validação
 */
export async function requireSuperuser(request: Request): Promise<AuthResult> {
  const authResult = await validatePermissions(request, []);
  
  if ('error' in authResult) {
    return authResult;
  }

  const userRole = authResult.user.role;
  if (userRole !== 'superuser') {
    return {
      error: 'Acesso negado - permissão de superusuário necessária',
      status: 403
    };
  }

  return authResult;
}

/**
 * Função utilitária para extrair informações do usuário do token
 * @param request - Request object
 * @returns Informações do usuário ou erro
 */
export async function getCurrentUser(request: Request): Promise<AuthResult> {
  return await validatePermissions(request, []);
}

/**
 * Função para atualizar permissões de um usuário (apenas para admins)
 * @param userId - ID do usuário
 * @param newPermissions - Novas permissões
 * @param request - Request object (para validar quem está fazendo a alteração)
 * @returns Resultado da operação
 */
export async function updateUserPermissions(
  userId: string, 
  newPermissions: string[], 
  request: Request
): Promise<AuthResult | { success: boolean; user: any }> {
  try {
    // Verificar se quem está fazendo a alteração tem permissão
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_USERS]);
    
    if ('error' in authResult) {
      return authResult;
    }

    // Validar se as permissões são válidas
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = newPermissions.filter(p => !validPermissions.includes(p as Permission));
    
    if (invalidPermissions.length > 0) {
      return {
        error: `Permissões inválidas: ${invalidPermissions.join(', ')}`,
        status: 400
      };
    }

    // Atualizar permissões no banco
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { permissions: newPermissions },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
      }
    });

    return {
      success: true,
      user: updatedUser
    };

  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    return {
      error: 'Erro interno ao atualizar permissões',
      status: 500
    };
  }
}