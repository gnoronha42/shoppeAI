import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validatePermissions } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/permissions';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Prisma } from "@/lib/generated/prisma";

// Configuração da API
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Listar analistas
export async function GET(request: Request) {
  try {
    // Verificar permissões - apenas superusers podem gerenciar analistas
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_CLIENTS]);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Obter parâmetros de paginação e busca
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 10;
    const search = searchParams.get('search') || '';

    // Calcular o offset para paginação
    const skip = (page - 1) * pageSize;

    // Construir a condição de busca
    const where: Prisma.usersWhereInput = {
      role: 'analyst',
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      } : {}),
    };

    // Buscar total de registros
    const total = await prisma.users.count({ where });

    // Buscar analistas
    const analysts = await prisma.users.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: pageSize,
    });

    // Calcular total de páginas
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      data: analysts,
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

// POST - Criar novo analista
export async function POST(request: Request) {
  try {
    // Verificar permissões
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_CLIENTS]);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    console.log('Criando analista:', { name, email }); // Log para debug

    // Criar novo usuário como analista
    const analyst = await prisma.users.create({
      data: {
        name,
        email,
        password,
        role: 'analyst',
        permissions: [
          PERMISSIONS.MANAGE_ANALYSIS,
          PERMISSIONS.VIEW_DASHBOARD,
        ],
      },
    });

    console.log('Analista criado:', analyst); // Log para debug

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
    // Verificar permissões
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_CLIENTS]);
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

    // Garantir que não pode mudar o role
    delete data.role;

    // Atualizar usuário
    const analyst = await prisma.users.update({
      where: { 
        id,
        role: 'analyst', // Garantir que só atualiza analistas
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

// DELETE - Desativar analista
export async function DELETE(request: Request) {
  try {
    // Verificar permissões
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_CLIENTS]);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do analista é obrigatório' },
        { status: 400 }
      );
    }


    await prisma.users.update({
      where: { 
        id,
        role: 'analyst', 
      },
      data: { 
        role: 'inactive_analyst', 
      },
    });

    return NextResponse.json({ message: 'Analista desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar analista:', error);
    return NextResponse.json(
      { error: 'Erro ao desativar analista' },
      { status: 500 }
    );
  }
} 