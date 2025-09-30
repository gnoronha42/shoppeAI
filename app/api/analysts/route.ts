import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    console.log('📝 Iniciando criação de analista...');
    
    const body = await request.json();
    console.log('📊 Dados recebidos:', JSON.stringify(body, null, 2));
    
    const { nome, email, telefone } = body;
    
    // Validações básicas
    if (!nome || !email) {
      console.log('❌ Dados obrigatórios faltando');
      return NextResponse.json(
        { error: "Nome e email são obrigatórios." },
        { status: 400 }
      );
    }
    
    // Verificar se o email já existe
    const existingAnalyst = await prisma.analysts.findUnique({
      where: { email: email }
    });
    
    if (existingAnalyst) {
      console.log('⚠️ Analista já existe:', email);
      return NextResponse.json({
        success: true,
        message: "Analista já cadastrado",
        analyst: {
          id: existingAnalyst.id,
          name: existingAnalyst.name,
          email: existingAnalyst.email,
          telefone: existingAnalyst.password, // Campo password contém o telefone
          created_at: existingAnalyst.created_at
        }
      });
    }
    
    // Usar o telefone no campo password (adaptação do schema existente)
    const telefoneFormatado = telefone ? telefone.replace(/\D/g, '') : '';
    
    console.log('📱 Salvando telefone para:', email, '- Telefone:', telefoneFormatado);
    
    // Criar novo analista
    const newAnalyst = await prisma.analysts.create({
      data: {
        name: nome,
        email: email,
        password: telefoneFormatado, // Salvando telefone no campo password
        active: true,
        analyses_count: 0
      }
    });
    
    console.log('✅ Analista criado com sucesso:', newAnalyst.id);
    
    return NextResponse.json({
      success: true,
      message: "Analista cadastrado com sucesso!",
      analyst: {
        id: newAnalyst.id,
        name: newAnalyst.name,
        email: newAnalyst.email,
        telefone: telefoneFormatado,
        created_at: newAnalyst.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar analista:', error);
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('📋 Listando analistas...');
    
    const analysts = await prisma.analysts.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: true, // Campo que contém o telefone
        active: true,
        created_at: true,
        updated_at: true,
        last_login: true,
        analyses_count: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    
    // Mapear para renomear password para telefone na resposta
    const analystsFormatted = analysts.map(analyst => ({
      id: analyst.id,
      name: analyst.name,
      email: analyst.email,
      telefone: analyst.password, // Renomear password para telefone
      active: analyst.active,
      created_at: analyst.created_at,
      updated_at: analyst.updated_at,
      last_login: analyst.last_login,
      analyses_count: analyst.analyses_count
    }));
    
    console.log(`✅ ${analysts.length} analistas encontrados`);
    
    return NextResponse.json({
      success: true,
      analysts: analystsFormatted,
      total: analystsFormatted.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar analistas:', error);
    return NextResponse.json(
      { 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido"
      },
      { status: 500 }
    );
  }
}
