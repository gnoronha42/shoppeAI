const { PrismaClient } = require('../lib/generated/prisma');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function restore() {
  try {
    console.log('Criando tabelas no banco de dados...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    console.log('Carregando dados do backup...');
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync('backup.json', 'utf-8'));
    const { clients, users, checklist_blocks } = backup.data;

    console.log('Iniciando restauração dos dados...');

    // Restaurando usuários primeiro
    console.log('Restaurando usuários...');
    for (const user of users) {
      const { activity_log, ai_requests, chat_conversations, configurations, id, created_at, updated_at, ...userData } = user;
      await prisma.users.create({
        data: {
          id,
          ...userData,
          created_at: new Date(created_at),
          updated_at: new Date(updated_at),
          configurations: configurations ? {
            create: configurations.map(config => {
              const { id, created_at, updated_at, ...configData } = config;
              return {
                id,
                ...configData,
                created_at: new Date(created_at),
                updated_at: new Date(updated_at)
              };
            })
          } : undefined
        }
      });
    }

    // Restaurando checklist blocks
    console.log('Restaurando blocos de checklist...');
    for (const block of checklist_blocks) {
      const { items, id, created_at, updated_at, ...blockData } = block;
      await prisma.checklist_blocks.create({
        data: {
          id,
          ...blockData,
          created_at: new Date(created_at),
          updated_at: new Date(updated_at)
        }
      });
    }

    // Restaurando clients e seus relacionamentos
    console.log('Restaurando clientes e seus dados...');
    for (const client of clients) {
      const {
        activity_log,
        ad_metrics,
        ai_requests,
        analyses,
        chat_conversations,
        products,
        checklist_items,
        id,
        created_at,
        updated_at,
        ...clientData
      } = client;

      // Primeiro criamos o cliente
      const createdClient = await prisma.clients.create({
        data: {
          id,
          ...clientData,
          created_at: new Date(created_at),
          updated_at: new Date(updated_at)
        }
      });

      // Depois criamos os produtos
      if (products && products.length > 0) {
        console.log(`Restaurando ${products.length} produtos para o cliente ${client.name}...`);
        for (const product of products) {
          const { ad_metrics, id, created_at, updated_at, ...productData } = product;
          await prisma.products.create({
            data: {
              id,
              ...productData,
              client_id: createdClient.id,
              created_at: new Date(created_at),
              updated_at: new Date(updated_at)
            }
          });
        }
      }

      // Criando análises e seus relacionamentos
      if (analyses && analyses.length > 0) {
        console.log(`Restaurando ${analyses.length} análises para o cliente ${client.name}...`);
        for (const analysis of analyses) {
          const { analysis_results, images, reports, id, created_at, ...analysisData } = analysis;
          
          // Criando a análise
          const createdAnalysis = await prisma.analyses.create({
            data: {
              id,
              ...analysisData,
              client_id: createdClient.id,
              created_at: new Date(created_at)
            }
          });

          // Criando resultados da análise
          if (analysis_results && analysis_results.length > 0) {
            for (const result of analysis_results) {
              const { id, created_at, ...resultData } = result;
              await prisma.analysis_results.create({
                data: {
                  id,
                  ...resultData,
                  analysis_id: createdAnalysis.id,
                  created_at: new Date(created_at)
                }
              });
            }
          }

          // Criando imagens da análise
          if (images && images.length > 0) {
            for (const image of images) {
              const { id, created_at, ...imageData } = image;
              await prisma.images.create({
                data: {
                  id,
                  ...imageData,
                  analysis_id: createdAnalysis.id,
                  created_at: new Date(created_at)
                }
              });
            }
          }

          // Criando relatórios
          if (reports && reports.length > 0) {
            for (const report of reports) {
              const { report_metrics, images, id, created_at, ...reportData } = report;
              const createdReport = await prisma.reports.create({
                data: {
                  id,
                  ...reportData,
                  client_id: createdClient.id,
                  analysis_id: createdAnalysis.id,
                  created_at: new Date(created_at)
                }
              });

              // Criando métricas do relatório
              if (report_metrics && report_metrics.length > 0) {
                for (const metric of report_metrics) {
                  const { id, created_at, ...metricData } = metric;
                  await prisma.report_metrics.create({
                    data: {
                      id,
                      ...metricData,
                      report_id: createdReport.id,
                      created_at: new Date(created_at)
                    }
                  });
                }
              }

              // Criando imagens do relatório
              if (images && images.length > 0) {
                for (const image of images) {
                  const { id, created_at, ...imageData } = image;
                  await prisma.images.create({
                    data: {
                      id,
                      ...imageData,
                      report_id: createdReport.id,
                      created_at: new Date(created_at)
                    }
                  });
                }
              }
            }
          }
        }
      }

      // Criando itens do checklist
      if (checklist_items && checklist_items.length > 0) {
        console.log(`Restaurando ${checklist_items.length} itens de checklist para o cliente ${client.name}...`);
        for (const item of checklist_items) {
          const { id, created_at, updated_at, ...itemData } = item;
          await prisma.checklist_items.create({
            data: {
              id,
              ...itemData,
              client_id: createdClient.id,
              created_at: new Date(created_at),
              updated_at: new Date(updated_at)
            }
          });
        }
      }
    }

    console.log('Restauração concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao restaurar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restore(); 