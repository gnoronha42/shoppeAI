
import {prisma} from '@/lib/prisma-client';
import { NextResponse } from 'next/server';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.clientId || !body.type || !body.results) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientId, type, results' },
        { status: 400 }
      );
    }
    
    // Criar a análise no banco de dados
    const analysis = await prisma.analyses.create({
      data: {
        client_id: body.clientId,
        type: body.type,
        title: body.title || `Análise de ${body.type === 'account' ? 'Conta' : 'Anúncios'}`
      },
    });
    
    // Salvar cada resultado de análise
    const analysisResults = await Promise.all(
      body.results.map(async (result: any) => {
        return prisma.analysis_results.create({
          data: {
            analysis_id: analysis.id,
            content: result.analysis,
            source_image_url: result.imageUrl || null,
            processed_by: 'gemini'
          }
        });
      })
    );
    
    // Salvar referências às imagens
    if (body.imageUrls && body.imageUrls.length > 0) {
      await Promise.all(
        body.imageUrls.map(async (url: string, index: number) => {
          return prisma.images.create({
            data: {
              analysis_id: analysis.id,
              url: url,
              original_filename: body.results[index]?.filename || `image-${index + 1}.jpg`,
              mime_type: 'image/jpeg'
            }
          });
        })
      );
    }
    
    return NextResponse.json(
      { 
        id: analysis.id,
        results: analysisResults,
        message: 'Análise criada com sucesso'
      }, 
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Erro ao criar análise:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    
    const where = clientId ? { client_id: clientId } : {};
    
    const analyses = await prisma.analyses.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        analysis_results: true,
        images: true
      }
    });
    
    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação' },
      { status: 500 }
    );
  }
} 