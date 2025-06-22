import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';


export async function POST(request: NextRequest) {
  try {
    const { clientId, type, startDate, endDate } = await request.json();

    // Validar parâmetros obrigatórios
    if (!clientId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Parâmetros obrigatórios: clientId, type, startDate, endDate" },
        { status: 400 }
      );
    }

    // Validar tipo de análise
    if (!['account', 'ads', 'express'].includes(type)) {
      return NextResponse.json(
        { error: "Tipo de análise deve ser 'account', 'ads' ou 'express'" },
        { status: 400 }
      );
    }

    // Converter datas para formato ISO
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        { error: "Data inicial deve ser anterior à data final" },
        { status: 400 }
      );
    }

    // Buscar análises no período especificado
    const analyses = await prisma.analyses.findMany({
      where: {
        client_id: clientId,
        type: type,
        created_at: {
          gte: start,
          lte: end,
        },
      },
      include: {
        analysis_results: true,
        clients: {
          select: {
            name: true,
            owner_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Se não houver análises no período, retornar erro
    if (analyses.length === 0) {
      return NextResponse.json(
        { 
          error: "Nenhuma análise encontrada para o período especificado",
          analyses: [],
          count: 0 
        },
        { status: 404 }
      );
    }

    // Preparar dados para envio ao microserviço de análise histórica
    const historicalData = {
      clientName: analyses[0]?.clients?.name || "Cliente",
      clientOwner: analyses[0]?.clients?.owner_name || "Proprietário",
      analysisType: type,
      period: {
        start: startDate,
        end: endDate,
      },
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        title: analysis.title,
        createdAt: analysis.created_at,
        content: analysis.analysis_results?.[0]?.content || "",
      })),
      totalAnalyses: analyses.length,
    };

    // TODO: Aqui você pode chamar seu microserviço para gerar o relatório histórico
    // Por enquanto, vamos retornar os dados estruturados para o frontend
    
    return NextResponse.json({
      success: true,
      data: historicalData,
      message: `Encontradas ${analyses.length} análises do tipo ${type} no período especificado`,
    });

  } catch (error) {
    console.error("Erro ao buscar dados históricos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao buscar dados históricos" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId é obrigatório" },
      { status: 400 }
    );
  }

  try {
    // Buscar resumo das análises disponíveis para o cliente
    const summary = await prisma.analyses.groupBy({
      by: ['type'],
      where: {
        client_id: clientId,
      },
      _count: {
        id: true,
      },
      _min: {
        created_at: true,
      },
      _max: {
        created_at: true,
      },
    });

    return NextResponse.json({
      success: true,
      summary: summary.map(item => ({
        type: item.type,
        count: item._count.id,
        oldestDate: item._min.created_at,
        newestDate: item._max.created_at,
      })),
    });

  } catch (error) {
    console.error("Erro ao buscar resumo histórico:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 