import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    console.log('🔄 Recebida requisição para salvar análise');
    
    const body = await request.json();
    console.log('📋 Dados recebidos:', {
      hasMarkdown: !!body.markdown,
      markdownLength: body.markdown?.length,
      clientId: body.clientId,
      clientName: body.clientName,
      analysisType: body.analysisType
    });
    
    // Validar campos obrigatórios
    if (!body.markdown) {
      console.log('❌ Erro: Campo markdown obrigatório não fornecido');
      return NextResponse.json(
        { error: 'Campo obrigatório: markdown' },
        { status: 400 }
      );
    }
    
    // Verificar se temos o clientId ou o clientName
    let clientId = body.clientId;
    
    // Se não tiver o ID mas tiver o nome, buscar o cliente pelo nome
    if (!clientId && body.clientName) {
      console.log('🔍 Buscando cliente pelo nome:', body.clientName);
      const client = await prisma.clients.findFirst({
        where: {
          name: body.clientName
        }
      });
      
      if (!client) {
        console.log('❌ Cliente não encontrado:', body.clientName);
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        );
      }
      
      clientId = client.id;
      console.log('✅ Cliente encontrado:', clientId);
    }
    
    // Se ainda não tiver o ID do cliente, retornar erro
    if (!clientId) {
      console.log('❌ Erro: ID do cliente não fornecido');
      return NextResponse.json(
        { error: 'É necessário fornecer o ID ou o nome do cliente' },
        { status: 400 }
      );
    }
    
        // Criar a análise no banco de dados
    // Mapear 'express' para 'account' pois o banco não aceita 'express'
    const originalAnalysisType = body.analysisType || 'account';
    const analysisType = originalAnalysisType === 'express' ? 'account' : originalAnalysisType;
    const title = `Análise de ${originalAnalysisType === 'account' ? 'Conta' : originalAnalysisType === 'ads' ? 'Anúncios' : 'Express'} - ${new Date().toLocaleDateString('pt-BR')}`;

    console.log('💾 Criando análise no banco:', {
      clientId,
      originalAnalysisType,
      analysisType,
      title
    });

    const analysis = await prisma.analyses.create({
      data: {
        client_id: clientId,
        type: analysisType,
        title: title
      },
    });

    console.log('✅ Análise criada:', analysis.id);

    // Salvar o conteúdo markdown como resultado de análise
    console.log('💾 Salvando resultado da análise...');
    const analysisResult = await prisma.analysis_results.create({
      data: {
        analysis_id: analysis.id,
        content: body.markdown,
        processed_by: 'markdown-pdf'
      }
    });

    console.log('✅ Resultado salvo:', analysisResult.id);

    // Retornar os IDs da análise e do resultado
    const response = {
      id: analysis.id,
      result: analysisResult,
      message: 'Análise markdown salva com sucesso'
    };
    
    console.log('🎉 Salvamento concluído com sucesso');
    return NextResponse.json(response, { status: 201 });
    
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