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
    const where: Prisma.AnalystsWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          ],
        }
      : {};

    // Buscar total de registros
    const total = await prisma.analysts.count({ where });

    // Buscar analistas com paginação
    const analysts = await prisma.analysts.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        created_at: true,
        updated_at: true,
        last_login: true,
        analyses_count: true,
        created_by_user: {
          select: {
            name: true,
          },
        },
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
    const existingAnalyst = await prisma.analysts.findUnique({
      where: { email },
    });

    if (existingAnalyst) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      );
    }

    console.log('Criando analista:', { name, email }); // Log para debug

    // Criar novo analista
    const analyst = await prisma.analysts.create({
      data: {
        name,
        email,
        password,
        created_by: authResult.user.id,
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
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_ANALYSTS]);
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

    // Atualizar analista
    const analyst = await prisma.analysts.update({
      where: { id },
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

// DELETE - Remover analista
export async function DELETE(request: Request) {
  try {
    // Verificar permissões
    const authResult = await validatePermissions(request, [PERMISSIONS.MANAGE_ANALYSTS]);
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

    // Remover analista (soft delete)
    await prisma.analysts.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: 'Analista removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover analista:', error);
    return NextResponse.json(
      { error: 'Erro ao remover analista' },
      { status: 500 }
    );
  }
} 