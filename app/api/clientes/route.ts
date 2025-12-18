// app/api/clients/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validatePermissions } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/permissions';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from "@/lib/generated/prisma";

export async function GET(request: Request) {
  try {
    console.log('\n=== INICIANDO GET /api/clients ===');
    console.log('URL:', request.url);
    console.log('Method:', request.method);
    
    // Verificar permissões - usuários podem visualizar clientes se tiverem view_clients
    const authResult = await validatePermissions(request, ['view_clients']);
    
    if ('error' in authResult) {
      console.log('Falha na autenticação:', authResult);
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    console.log(' Usuário autenticado:', authResult.user);

    // Obter parâmetros de paginação e busca
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 10;
    const search = searchParams.get('search') || '';
    const platform = searchParams.get('platform') || 'shopee'; // Padrão shopee

    console.log('Parâmetros:', { page, pageSize, search, platform });

    // Calcular o offset para paginação
    const skip = (page - 1) * pageSize;

    // Construir a condição de busca
    const where: Prisma.clientsWhereInput = {
      platform: platform, // Filtrar por plataforma
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { owner_name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      } : {})
    };

    console.log('Condição WHERE:', where);

    // Buscar total de registros
    const total = await prisma.clients.count({ where });
    console.log('Total de registros:', total);

    // Buscar clientes com paginação
    const clients = await prisma.clients.findMany({
      where,
      select: {
        id: true,
        name: true,
        owner_name: true,
        shop_url: true,
        followers: true,
        rating: true,
        registration_date: true,
        product_count: true,
        response_rate: true,
        platform: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        name: 'asc'
      },
      skip,
      take: pageSize,
    });
    
    console.log('Clientes encontrados:', clients.length);
    
    const mappedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      ownerName: client.owner_name,
      shopUrl: client.shop_url,
      followers: client.followers,
      rating: client.rating,
      registrationDate: client.registration_date,
      productCount: client.product_count,
      responseRate: client.response_rate,
      platform: client.platform,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    }));

    // Calcular total de páginas
    const totalPages = Math.ceil(total / pageSize);
    
    
    return NextResponse.json({
      data: mappedClients,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
      }
    });
  } catch (error) {
    console.error(' ERRO GERAL:', error);
    
    // Verificar se é um erro do Prisma
    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: `Erro do banco de dados: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Erro genérico
    return NextResponse.json(
      { error: 'Erro interno ao buscar clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verificar permissões - apenas usuários com permissão de criar clientes podem criar
    const authResult = await validatePermissions(request, ['create_clients']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    
    if (!body.name || !body.ownerName) {
      return NextResponse.json(
        { error: 'Nome da loja e nome do proprietário são obrigatórios' },
        { status: 400 }
      );
    }
    
    const newClient = await prisma.clients.create({
      data: {
        name: body.name,
        owner_name: body.ownerName,
        shop_url: body.shopUrl,
        followers: body.followers,
        rating: body.rating,
        registration_date: body.registrationDate,
        product_count: body.productCount,
        response_rate: body.responseRate,
        platform: body.platform || 'shopee', // Salvar plataforma
      },
    });
    
    const mappedClient = {
      id: newClient.id,
      name: newClient.name,
      ownerName: newClient.owner_name,
      shopUrl: newClient.shop_url,
      followers: newClient.followers,
      rating: newClient.rating,
      registrationDate: newClient.registration_date,
      productCount: newClient.product_count,
      responseRate: newClient.response_rate,
      platform: newClient.platform, // Retornar plataforma
      createdAt: newClient.created_at,
      updatedAt: newClient.updated_at,
    };
    
    return NextResponse.json(mappedClient, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    // Verificar permissões - apenas usuários com permissão de editar clientes podem atualizar
    const authResult = await validatePermissions(request, ['edit_clients']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      );
    }

    const updatedClient = await prisma.clients.update({
      where: { id: body.id },
      data: {
        name: body.name,
        owner_name: body.ownerName,
        shop_url: body.shopUrl,
        followers: body.followers,
        rating: body.rating,
        registration_date: body.registrationDate,
        product_count: body.productCount,
        response_rate: body.responseRate,
        platform: body.platform,
      },
    });

    const mappedClient = {
      id: updatedClient.id,
      name: updatedClient.name,
      ownerName: updatedClient.owner_name,
      shopUrl: updatedClient.shop_url,
      followers: updatedClient.followers,
      rating: updatedClient.rating,
      registrationDate: updatedClient.registration_date,
      productCount: updatedClient.product_count,
      responseRate: updatedClient.response_rate,
      platform: updatedClient.platform,
      createdAt: updatedClient.created_at,
      updatedAt: updatedClient.updated_at,
    };

    return NextResponse.json(mappedClient);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    // Verificar permissões - apenas usuários com permissão de deletar clientes podem deletar
    const authResult = await validatePermissions(request, ['delete_clients']);
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
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      );
    }

    await prisma.clients.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar cliente' },
      { status: 500 }
    );
  }
}