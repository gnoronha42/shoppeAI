import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Retorna o checklist do cliente
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // Busca todos os blocos e seus itens para o cliente
    const blocks = await prisma.checklist_blocks.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          where: { client_id: clientId },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("Erro ao buscar checklist:", error);
    return NextResponse.json(
      { error: "Erro ao buscar checklist" },
      { status: 500 }
    );
  }
}

// POST - Atualiza o status de um item do checklist
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    const { itemId, isCompleted } = await request.json();

    const updatedItem = await prisma.checklist_items.update({
      where: { id: itemId },
      data: {
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error) {
    console.error("Erro ao atualizar item do checklist:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar item do checklist" },
      { status: 500 }
    );
  }
} 