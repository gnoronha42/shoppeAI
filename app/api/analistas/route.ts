import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validatePermissions } from '@/lib/middleware';
import { PERMISSIONS, DEFAULT_PERMISSIONS } from '@/lib/permissions';
import type { Prisma } from "@/lib/generated/prisma";


export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(request: Request) {
  try {
    // Usar a CHAVE da permissão, não a descrição
    const authResult = await validatePermissions(request, ['manage_users']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }


    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 10;
    const search = searchParams.get('search') || '';


    const skip = (page - 1) * pageSize;


    const where: Prisma.usersWhereInput = {
      role: {
        in: ['analyst', 'superuser', 'inactive_analyst']
      },
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      } : {}),
    };


    const total = await prisma.users.count({ where });


    const analysts = await prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
        created_analyses: {
          select: {
            id: true,
          }
        },
        creator: {
          select: {
            name: true,
          }
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: pageSize,
    });


    const analystsWithCounts = analysts.map(analyst => ({
      id: analyst.id,
      name: analyst.name,
      email: analyst.email,
      role: analyst.role,
      active: analyst.role !== 'inactive_analyst', // ativo se role não for 'inactive_analyst'
      created_at: analyst.created_at?.toISOString() || new Date().toISOString(),
      last_login: null, // Por enquanto null, implementar depois
      analyses_count: analyst.created_analyses.length,
      created_by_user: analyst.creator ? { name: analyst.creator.name } : null,
    }));


    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: analystsWithCounts,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar analistas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar analistas' },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    // Usar a CHAVE da permissão, não a descrição
    const authResult = await validatePermissions(request, ['manage_users']);
    if ('error' in authResult) {
      console.log(' Erro de permissão ao criar analista:', authResult.error);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    console.log('Usuário autorizado a criar analista:', authResult.user?.name);
    console.log('Permissões do usuário:', authResult.permissions);

    const body = await request.json();
    const { name, email, password, role = 'analyst' } = body;

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar role
    if (!['analyst', 'superuser'].includes(role)) {
      return NextResponse.json(
        { error: 'Tipo de usuário inválido. Deve ser "analyst" ou "superuser"' },
        { status: 400 }
      );
    }


    const existingUser = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    console.log('Criando usuário:', { name, email, role }); // Log para debug
    console.log(' Permissões padrão para role:', role, DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS]);

    // Criar novo usuário com o role especificado e permissões padrão
    const analyst = await prisma.users.create({
      data: {
        name,
        email,
        password,
        role,
        permissions: [...(DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.analyst)],
        created_by: authResult.user?.id, // ID do usuário que está criando o usuário
      },
    });

    console.log('Usuário criado com sucesso:', {
      id: analyst.id,
      name: analyst.name,
      email: analyst.email,
      role: analyst.role,
      permissions: analyst.permissions
    });

    return NextResponse.json(analyst, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar analista:', error);
    return NextResponse.json(
      { error: 'Erro ao criar analista' },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar analista
export async function PATCH(request: Request) {
  try {
    // Usar a CHAVE da permissão, não a descrição
    const authResult = await validatePermissions(request, ['manage_users']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do analista é obrigatório' },
        { status: 400 }
      );
    }

    delete data.role;


    const analyst = await prisma.users.update({
      where: {
        id,
        role: 'analyst',
      },
      data,
    });

    return NextResponse.json(analyst);
  } catch (error) {
    console.error('Erro ao atualizar analista:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar analista' },
      { status: 500 }
    );
  }
}


export async function DELETE(request: Request) {
  try {
    // Usar a CHAVE da permissão, não a descrição
    const authResult = await validatePermissions(request, ['manage_users']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do analista é obrigatório' },
        { status: 400 }
      );
    }

    if (action === 'delete_analyses') {

      const deletedAnalyses = await prisma.analyses.deleteMany({
        where: {
          created_by: id,
        },
      });

      return NextResponse.json({
        message: `${deletedAnalyses.count} análises excluídas com sucesso`,
        deletedCount: deletedAnalyses.count
      });
    } else {
      const currentUser = await prisma.users.findUnique({
        where: { id },
        select: { role: true, name: true }
      });

      if (!currentUser) {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      if (currentUser.role === 'inactive_analyst') {
        // Reativar usuário - determinar role original baseado em permissões ou usar 'analyst' como padrão
        const user = await prisma.users.findUnique({
          where: { id },
          select: { permissions: true }
        });
        
        // Se tem permissão de manage_users, provavelmente era superuser
        const originalRole = user?.permissions?.includes('manage_users') ? 'superuser' : 'analyst';
        
        await prisma.users.update({
          where: { id },
          data: { role: originalRole },
        });

        return NextResponse.json({
          message: `${originalRole === 'superuser' ? 'Super usuário' : 'Analista'} reativado com sucesso`,
          action: 'reactivated'
        });
      } else if (currentUser.role && ['analyst', 'superuser'].includes(currentUser.role)) {
        // Desativar usuário
        await prisma.users.update({
          where: { id },
          data: { role: 'inactive_analyst' },
        });

        return NextResponse.json({
          message: `${currentUser.role === 'superuser' ? 'Super usuário' : 'Analista'} desativado com sucesso. O usuário não poderá mais fazer login.`,
          action: 'deactivated'
        });
      } else {
        return NextResponse.json(
          { error: 'Usuário não é um analista ou super usuário' },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Erro ao processar solicitação DELETE:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação' },
      { status: 500 }
    );
  }
} 