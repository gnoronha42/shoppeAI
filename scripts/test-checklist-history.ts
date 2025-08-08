import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function testChecklistHistory() {
  try {
    console.log('🧪 Testando sistema de histórico do checklist...');

    // Buscar um cliente de teste
    const client = await prisma.clients.findFirst();
    if (!client) {
      console.log('❌ Nenhum cliente encontrado');
      return;
    }

    // Buscar um item do checklist
    const checklistItem = await prisma.checklist_items.findFirst();
    if (!checklistItem) {
      console.log('❌ Nenhum item do checklist encontrado');
      return;
    }

    // Buscar um usuário para simular o analista
    const user = await prisma.users.findFirst();
    if (!user) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }

    console.log(`📋 Cliente: ${client.name}`);
    console.log(`📝 Item: ${checklistItem.title}`);
    console.log(`👤 Analista: ${user.name}`);

    // Criar primeira execução
    console.log('\n1️⃣ Criando primeira execução...');
    const firstExecution = await prisma.checklist_progress.create({
      data: {
        client_id: client.id,
        item_id: checklistItem.id,
        is_completed: true,
        completed_at: new Date(),
        analyst_id: user.id,
        analyst_name: user.name,
        execution_count: 1,
        execution_history: JSON.stringify([{
          executed_at: new Date(),
          analyst_id: user.id,
          analyst_name: user.name,
          is_completed: true,
          execution_number: 1
        }])
      }
    });

    console.log('✅ Primeira execução criada:', firstExecution.id);

    // Simular segunda execução
    console.log('\n2️⃣ Criando segunda execução...');
    const secondExecution = await prisma.checklist_progress.create({
      data: {
        client_id: client.id,
        item_id: checklistItem.id,
        is_completed: true,
        completed_at: new Date(),
        analyst_id: user.id,
        analyst_name: user.name,
        execution_count: 1,
        execution_history: JSON.stringify([{
          executed_at: new Date(),
          analyst_id: user.id,
          analyst_name: user.name,
          is_completed: true,
          execution_number: 2
        }])
      }
    });

    console.log('✅ Segunda execução criada:', secondExecution.id);

    // Buscar histórico completo
    console.log('\n📊 Buscando histórico completo...');
    const history = await prisma.checklist_progress.findMany({
      where: {
        client_id: client.id,
        item_id: checklistItem.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`📈 Total de execuções encontradas: ${history.length}`);
    
    history.forEach((execution, index) => {
      console.log(`   ${index + 1}. ID: ${execution.id} | Analista: ${execution.analyst_name} | Data: ${execution.completed_at}`);
    });

    // Calcular estatísticas
    const totalExecutions = history.reduce((sum, p) => sum + (p.execution_count || 1), 0);
    const latestExecution = history[0];

    console.log('\n📊 Estatísticas:');
    console.log(`   Total de execuções: ${totalExecutions}`);
    console.log(`   Último analista: ${latestExecution?.analyst_name}`);
    console.log(`   Última execução: ${latestExecution?.completed_at}`);

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChecklistHistory(); 