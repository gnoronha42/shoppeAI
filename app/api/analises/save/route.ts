import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.markdown || !body.clientName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: markdown, clientName' },
        { status: 400 }
      );
    }
    
    // Buscar o cliente pelo nome
    const client = await prisma.clients.findFirst({
      where: {
        name: body.clientName
      }
    });
    
    if (!client) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }
    
    // Criar a análise no banco de dados
    const analysisType = body.analysisType || 'account';
    const title = `Análise de ${analysisType === 'account' ? 'Conta' : 'Anúncios'} - ${new Date().toLocaleDateString('pt-BR')}`;
    
    const analysis = await prisma.analyses.create({
      data: {
        client_id: client.id,
        type: analysisType,
        title: title
      },
    });
    
    // Salvar o conteúdo markdown como resultado de análise
    const analysisResult = await prisma.analysis_results.create({
      data: {
        analysis_id: analysis.id,
        content: body.markdown,
        processed_by: 'markdown-pdf'
      }
    });
    
    return NextResponse.json(
      { 
        id: analysis.id,
        result: analysisResult,
        message: 'Análise markdown salva com sucesso'
      }, 
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Erro ao salvar análise markdown:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 