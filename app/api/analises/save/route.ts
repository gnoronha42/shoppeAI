import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.markdown) {
      return NextResponse.json(
        { error: 'Campo obrigatório: markdown' },
        { status: 400 }
      );
    }
    
    // Verificar se temos o clientId ou o clientName
    let clientId = body.clientId;
    
    // Se não tiver o ID mas tiver o nome, buscar o cliente pelo nome
    if (!clientId && body.clientName) {
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
      
      clientId = client.id;
    }
    
    // Se ainda não tiver o ID do cliente, retornar erro
    if (!clientId) {
      return NextResponse.json(
        { error: 'É necessário fornecer o ID ou o nome do cliente' },
        { status: 400 }
      );
    }
    
    // Criar a análise no banco de dados
    const analysisType = body.analysisType || 'account';
    const title = `Análise de ${analysisType === 'account' ? 'Conta' : 'Anúncios'} - ${new Date().toLocaleDateString('pt-BR')}`;
    
    const analysis = await prisma.analyses.create({
      data: {
        client_id: clientId,
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
    
    // Retornar os IDs da análise e do resultado
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

// Novo endpoint para excluir uma análise
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID da análise é obrigatório' },
        { status: 400 }
      );
    }
    
    // Primeiro excluir os resultados da análise (devido à restrição de chave estrangeira)
    await prisma.analysis_results.deleteMany({
      where: {
        analysis_id: id
      }
    });
    
    // Depois excluir a análise
    await prisma.analyses.delete({
      where: {
        id: id
      }
    });
    
    return NextResponse.json(
      { message: 'Análise excluída com sucesso' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Erro ao excluir análise:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 