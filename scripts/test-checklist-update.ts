import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function testChecklistUpdate() {
  try {
    console.log('🧪 Testando atualização do checklist...');

    // Buscar dados de teste
    const client = await prisma.clients.findFirst();
    const checklistItem = await prisma.checklist_items.findFirst();
    
    if (!client || !checklistItem) {
      console.log('❌ Dados de teste não encontrados');
      return;
    }

    console.log(`📋 Cliente: ${client.name}`);
    console.log(`📝 Item: ${checklistItem.title}`);

    // Buscar progresso atual
    const currentProgress = await prisma.checklist_progress.findMany({
      where: {
        client_id: client.id,
        item_id: checklistItem.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`📊 Execuções atuais: ${currentProgress.length}`);
    
    // Simular busca como a API faz
    const blocks = await prisma.checklist_blocks.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          where: {
            id: checklistItem.id
          },
          orderBy: { order: "asc" },
          include: {
            progress: {
              where: {
                client_id: client.id
              },
              orderBy: {
                created_at: 'desc'
              }
            }
          }
        }
      }
    });

    // Formatar resposta como a API
    const formattedBlocks = blocks.map(block => ({
      id: block.id,
      title: block.title,
      order: block.order,
      items: block.items.map(item => {
        const latestExecution = item.progress[0];
        const totalExecutions = item.progress.reduce((sum, p) => sum + (p.execution_count || 1), 0);
        
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          order: item.order,
          is_completed: latestExecution?.is_completed || false,
          completed_at: latestExecution?.completed_at || null,
          execution_count: totalExecutions,
          last_analyst: latestExecution?.analyst_name || null,
          execution_history: item.progress.map(p => ({
            id: p.id,
            is_completed: p.is_completed,
            completed_at: p.completed_at,
            analyst_name: p.analyst_name,
            execution_count: p.execution_count || 1,
            created_at: p.created_at
          }))
        }
      })
    }));

    console.log('\n📊 Dados formatados como API:');
    formattedBlocks.forEach(block => {
      block.items.forEach(item => {
        console.log(`   ${item.title}: ${item.execution_count}x execuções`);
        console.log(`   Último analista: ${item.last_analyst || 'N/A'}`);
        console.log(`   Status: ${item.is_completed ? 'Concluído' : 'Pendente'}`);
      });
    });

    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testChecklistUpdate(); 