import { NextResponse } from 'next/server';

export async function GET() {
  try {
    
    const funcionarios = [
      { id: 1, nome: "João Silva", cargo: "Desenvolvedor" },
      { id: 2, nome: "Maria Santos", cargo: "Designer" },
      { id: 3, nome: "Carlos Oliveira", cargo: "Gerente" }
    ];
    
    return NextResponse.json({ funcionarios }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { erro: "Falha ao buscar funcionários" },
      { status: 500 }
    );
  }
}
