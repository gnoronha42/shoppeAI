import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
          created_at: existingAnalyst.created_at
        }
      });
    }
    
    // Gerar senha temporária baseada no telefone ou email
    const tempPassword = telefone ? telefone.replace(/\D/g, '').slice(-6) : email.split('@')[0];
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    console.log('🔐 Senha temporária gerada para:', email);
    
    // Criar novo analista
    const newAnalyst = await prisma.analysts.create({
      data: {
        name: nome,
        email: email,
        password: hashedPassword,
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
        created_at: newAnalyst.created_at
      },
      tempPassword: tempPassword // Retornar senha temporária para o usuário
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
    
    console.log(`✅ ${analysts.length} analistas encontrados`);
    
    return NextResponse.json({
      success: true,
      analysts: analysts,
      total: analysts.length
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
