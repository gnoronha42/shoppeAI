import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validatePermissions } from '@/lib/middleware';
import { PERMISSIONS } from '@/lib/permissions';

// GET - Retorna o checklist do cliente
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões - usuários podem visualizar checklist se tiverem view_clients
    const authResult = await validatePermissions(request, ['view_clients']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const clientId = params.id;

    // Busca todos os blocos e seus itens
    const blocks = await prisma.checklist_blocks.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            // Inclui o progresso do cliente específico, ordenado por data de criação (mais recente primeiro)
            progress: {
              where: {
                client_id: clientId
              },
              orderBy: {
                created_at: 'desc'
              }
            }
          }
        }
      }
    });

    // Formata a resposta para incluir histórico de execuções
    const formattedBlocks = blocks.map(block => ({
      id: block.id,
      title: block.title,
      order: block.order,
      items: block.items.map(item => {
        const latestExecution = item.progress[0];
        const totalExecutions = item.progress.reduce((sum, p) => sum + (p.execution_count || 1), 0);
        
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          order: item.order,
          is_completed: latestExecution?.is_completed || false,
          completed_at: latestExecution?.completed_at || null,
          execution_count: totalExecutions,
                     last_analyst: latestExecution?.analyst_name || null,
           execution_history: item.progress.map(p => ({
             id: p.id,
             is_completed: p.is_completed,
             completed_at: p.completed_at,
             analyst_name: p.analyst_name,
             execution_count: p.execution_count || 1,
             created_at: p.created_at
           }))
        }
      })
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
    // Verificar permissões - usuários com manage_client_checklist podem atualizar checklist
    const authResult = await validatePermissions(request, ['manage_client_checklist']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const clientId = params.id;
    const { itemId, isCompleted } = await request.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "ID do item é obrigatório" },
        { status: 400 }
      );
    }

    // Verifica se o item existe
    const item = await prisma.checklist_items.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item não encontrado" },
        { status: 404 }
      );
    }

    // Buscar execuções anteriores para calcular o contador
    const previousExecutions = await prisma.checklist_progress.findMany({
      where: {
        client_id: clientId,
        item_id: itemId
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const totalExecutions = previousExecutions.reduce((sum, p) => sum + (p.execution_count || 1), 0);
    const newExecutionCount = totalExecutions + 1;

    // Criar nova execução
    const progress = await prisma.checklist_progress.create({
      data: {
        client_id: clientId,
        item_id: itemId,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date() : null,
        analyst_id: authResult.user.id,
        analyst_name: authResult.user.name,
        execution_count: 1, // Cada registro representa 1 execução
        execution_history: JSON.stringify([{
          executed_at: new Date(),
          analyst_id: authResult.user.id,
          analyst_name: authResult.user.name,
          is_completed: isCompleted,
          execution_number: newExecutionCount
        }])
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