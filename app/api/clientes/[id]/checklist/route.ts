import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Retorna o checklist do cliente
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // Busca todos os blocos e seus itens
    const blocks = await prisma.checklist_blocks.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            // Inclui o progresso do cliente específico
            progress: {
              where: {
                client_id: clientId
              }
            }
          }
        }
      }
    });

    // Formata a resposta para incluir is_completed e completed_at
    const formattedBlocks = blocks.map(block => ({
      id: block.id,
      title: block.title,
      order: block.order,
      items: block.items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        order: item.order,
        is_completed: item.progress[0]?.is_completed || false,
        completed_at: item.progress[0]?.completed_at || null
      }))
    }));

    return NextResponse.json({ blocks: formattedBlocks });
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

    // Atualiza ou cria o progresso do item
    const progress = await prisma.checklist_progress.upsert({
      where: {
        client_id_item_id: {
          client_id: clientId,
          item_id: itemId
        }
      },
      update: {
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null
      },
      create: {
        client_id: clientId,
        item_id: itemId,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null
      }
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Erro ao atualizar checklist:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar checklist" },
      { status: 500 }
    );
  }
} 