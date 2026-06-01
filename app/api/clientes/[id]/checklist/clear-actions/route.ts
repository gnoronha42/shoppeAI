import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validatePermissions } from '@/lib/middleware';

// POST - Limpa todas as ações do checklist (remove histórico de execuções)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões - usuários com manage_client_checklist podem limpar ações
    const authResult = await validatePermissions(request, ['manage_client_checklist']);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const clientId = params.id;

 

    // Contar registros antes da limpeza
    const countBefore = await prisma.checklist_progress.count({
      where: {
        client_id: clientId
      }
    });


    // Deletar todos os registros de progresso do cliente
    const deleteResult = await prisma.checklist_progress.deleteMany({
      where: {
        client_id: clientId
      }
    });

   

    // Log da ação para auditoria
   
    return NextResponse.json({
      success: true,
      message: 'Todas as ações foram limpas com sucesso',
      recordsDeleted: deleteResult.count,
      analystName: authResult.user.name,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erro ao limpar ações do checklist:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao limpar ações" },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
