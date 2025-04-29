import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';


export async function GET() {
  try {
    const clients = await prisma.clients.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });
    
    return NextResponse.json(clients);
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
    
    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cliente' },
      { status: 500 }
    );
  }
}
