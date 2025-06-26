import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const clients = await prisma.clients.findMany({
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
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        name: 'asc' // Ordenar alfabeticamente por nome no banco
      }
    });
    
    // Mapear os campos para coincidir com o tipo TypeScript
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
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    }));
    
    return NextResponse.json(mappedClients);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
      },
    });
    
    // Mapear o resultado para coincidir com o tipo TypeScript
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
