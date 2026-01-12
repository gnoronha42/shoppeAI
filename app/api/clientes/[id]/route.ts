import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validatePermissions } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/permissions';

// GET - Obter um cliente específico
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões - usuários podem visualizar clientes se tiverem view_clients
    const authResult = await validatePermissions(request, ['view_clients']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const clientId = params.id;
    
    const client = await prisma.clients.findUnique({
      where: {
        id: clientId,
      },
      include: {
        analyses: {
          include: {
            analysis_results: true,
            images: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
    });
    
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }
    
    const mappedClient = {
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
      analyses: client.analyses
    };
    
    return NextResponse.json(mappedClient);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um cliente específico
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões - apenas usuários com edit_clients podem atualizar
    const authResult = await validatePermissions(request, ['edit_clients']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const clientId = params.id;
    const body = await request.json();

    const updatedClient = await prisma.clients.update({
      where: {
        id: clientId,
      },
      data: {
        name: body.name,
        owner_name: body.ownerName,
        shop_url: body.shopUrl,
        followers: body.followers,
        rating: body.rating,
        registration_date: body.registrationDate,
        product_count: body.productCount,
        response_rate: body.responseRate,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cliente' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir um cliente específico
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões - apenas usuários com delete_clients podem excluir
    const authResult = await validatePermissions(request, ['delete_clients']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const clientId = params.id;

    await prisma.clients.delete({
      where: {
        id: clientId,
      },
    });

    return NextResponse.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cliente' },
      { status: 500 }
    );
  }
}
