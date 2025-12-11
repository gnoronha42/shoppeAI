import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all', 'account', 'ads'
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    console.log('Buscando histórico de análises:', { type, search, page, limit });
    
    // Construir filtros
    let where: any = {};
    
    // Filtro por tipo
    if (type && type !== 'all') {
      where.type = type;
    }
    
    // Filtro por busca (cliente ou proprietário)
    if (search) {
      where.clients = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { owner_name: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    
    // Buscar análises com paginação
    const [analyses, total] = await Promise.all([
      prisma.analyses.findMany({
        where,
        orderBy: {
          created_at: 'desc'
        },
        include: {
          clients: {
            select: {
              name: true,
              owner_name: true,
            }
          },
          creator: {
            select: {
              name: true,
            }
          },
          analysis_results: {
            select: {
              id: true,
              content: true,
            },
            take: 1 // Apenas o primeiro resultado para calcular tamanho
          },
          images: {
            select: {
              id: true,
              file_size: true,
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      
      // Contar total para paginação
      prisma.analyses.count({ where })
    ]);
    
    // Formatar dados para o frontend
    const formattedAnalyses = analyses.map(analysis => {
      // Calcular tamanho estimado do relatório
      const contentSize = analysis.analysis_results[0]?.content?.length || 0;
      const imagesSize = analysis.images.reduce((sum, img) => sum + (img.file_size || 0), 0);
      const totalSize = contentSize + imagesSize;
      
      // Formatar tamanho
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };
      
      return {
        id: analysis.id,
        clientId: analysis.client_id,
        clientName: analysis.clients?.name || 'Cliente não informado',
        ownerName: analysis.clients?.owner_name || 'Proprietário não informado',
        type: analysis.type,
        title: analysis.title,
        createdAt: analysis.created_at,
        createdBy: analysis.creator?.name || 'Sistema',
        size: formatSize(totalSize),
        hasResults: analysis.analysis_results.length > 0,
        imagesCount: analysis.images.length,
      };
    });
    
    // Estatísticas gerais
    const stats = await prisma.analyses.groupBy({
      by: ['type'],
      _count: {
        id: true,
      },
      where: search ? {
        clients: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { owner_name: { contains: search, mode: 'insensitive' } }
          ]
        }
      } : undefined,
    });
    
    const response = {
      analyses: formattedAnalyses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      stats: {
        total,
        byType: stats.reduce((acc, stat) => {
          acc[stat.type] = stat._count.id;
          return acc;
        }, {} as Record<string, number>)
      }
    };
    
  
    return NextResponse.json(response);
    
  } catch (error) {
    console.error(' Erro ao buscar histórico:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 