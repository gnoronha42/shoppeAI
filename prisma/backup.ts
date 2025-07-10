const { PrismaClient } = require('../lib/generated/prisma');

const prisma = new PrismaClient();

async function backup() {
  try {
    // Backup de todos os dados
    const clients = await prisma.clients.findMany({
      include: {
        activity_log: true,
        ad_metrics: true,
        ai_requests: true,
        analyses: {
          include: {
            analysis_results: true,
            images: true,
            reports: {
              include: {
                report_metrics: true,
                images: true
              }
            }
          }
        },
        chat_conversations: {
          include: {
            chat_messages: true
          }
        },
        products: {
          include: {
            ad_metrics: true
          }
        },
        checklist_items: true
      }
    });

    const users = await prisma.users.findMany({
      include: {
        activity_log: true,
        ai_requests: true,
        chat_conversations: {
          include: {
            chat_messages: true
          }
        },
        configurations: true
      }
    });

    const checklist_blocks = await prisma.checklist_blocks.findMany({
      include: {
        items: true
      }
    });

    // Salvando os dados em um arquivo JSON
    const fs = require('fs');
    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        clients,
        users,
        checklist_blocks
      }
    };

    fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2));
    console.log('Backup realizado com sucesso!');
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backup(); 