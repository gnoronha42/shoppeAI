import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// GET - Obter um cliente específico
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
    
    return NextResponse.json(client);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar um cliente
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    const body = await request.json();
    
    // Validar dados obrigatórios
    if (!body.name || !body.ownerName) {
      return NextResponse.json(
        { error: 'Nome da loja e nome do proprietário são obrigatórios' },
        { status: 400 }
      );
    }
    
    const updatedClient = await prisma.clients.update({
      where: {
        id: clientId,
      },
      data: {
        name: body.name,
        owner_name: body.ownerName,
        shop_url: body.shopUrl || null,
        followers: body.followers || null,
        rating: body.rating || null,
        registration_date: body.registrationDate || null,
        product_count: body.productCount || null,
        response_rate: body.responseRate || null,
        updated_at: new Date()
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

// DELETE - Excluir um cliente
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    
    await prisma.clients.delete({
      where: {
        id: clientId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cliente' },
      { status: 500 }
    );
  }
}
