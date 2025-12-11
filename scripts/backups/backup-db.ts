import { PrismaClient } from '../../lib/generated/prisma/client.js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper function to safely get data from a model
async function safelyGetModelData(modelName: string, model: any): Promise<any[]> {
  try {
    if (model && typeof model.findMany === 'function') {
      const data = await model.findMany();
      console.log(`    ${modelName}: ${data.length} registros`);
      return data;
    } else {
      console.log(`    ${modelName}: modelo não encontrado ou não tem método findMany`);
      return [];  
    }
  } catch (error: any) {
    console.log(`    ${modelName}: erro ao buscar dados - ${error?.message || 'Erro desconhecido'}`);
    return [];
  }
}

async function main(): Promise<void> {
  try {
    // Criar diretório de backup se não existir
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Nome do arquivo com data
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${date}.json`;
    const filePath = path.join(backupDir, fileName);

    console.log('Iniciando backup do banco de dados...');
    
    // Debug: mostrar todas as propriedades disponíveis no prisma client
    const allPrismaKeys = Object.keys(prisma);
    console.log('Todas as chaves do Prisma client:', allPrismaKeys);
    
    // Debug: mostrar tipo da instância
    console.log('Tipo da instância prisma:', typeof prisma);
    console.log('Propriedades da instância:', Object.getOwnPropertyNames(prisma));
    
    // Testar conexão primeiro
    console.log('Testando conexão...');
    await prisma.$connect();
    console.log('Conectado ao banco de dados');
    
    // Filtrar apenas os modelos (que têm método findMany)
    const availableModels = allPrismaKeys.filter(key => {
      const model = (prisma as any)[key];
      return !key.startsWith('$') && 
             !key.startsWith('_') &&
             typeof model === 'object' && 
             model !== null &&
             typeof model.findMany === 'function';
    });
    
    console.log('Modelos disponíveis com findMany:', availableModels);

    // Buscar dados de forma segura
    const data: Record<string, any[]> = {};
    
    // Se não encontrou modelos automaticamente, tentar alguns nomes conhecidos
    if (availableModels.length === 0) {
      console.log('Nenhum modelo encontrado automaticamente, tentando nomes específicos...');
      
      const modelsToTry = [
        'users', 'clients', 'analyses', 'products', 'reports',
        'activity_log', 'ad_metrics', 'ai_requests', 'analysis_results',
        'chat_conversations', 'chat_messages', 'configurations', 'images',
        'report_metrics', 'checklist_blocks', 'checklist_items', 'checklist_progress'
      ];
      
      for (const modelName of modelsToTry) {
        const model = (prisma as any)[modelName];
        if (model && typeof model.findMany === 'function') {
          console.log(`Modelo encontrado: ${modelName}`);
          data[modelName] = await safelyGetModelData(modelName, model);
        }
      }
    } else {
      // Usar os modelos encontrados automaticamente
      console.log('Fazendo backup dos modelos disponíveis...');
      for (const modelName of availableModels) {
        data[modelName] = await safelyGetModelData(modelName, (prisma as any)[modelName]);
      }
    }

    // Salvar em arquivo JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`Backup criado com sucesso: ${fileName}`);
    console.log(`Local: ${filePath}`);
    
    // Mostrar resumo dos dados salvos
    console.log('Resumo do backup:');
    const totalRecords = Object.entries(data).reduce((total, [modelName, records]) => {
      if (records.length > 0) {
        console.log(`   - ${modelName}: ${records.length} registros`);
        return total + records.length;
      }
      return total;
    }, 0);
    
    console.log(`\nTotal de registros salvos: ${totalRecords}`);

  } catch (error: any) {
    console.error('Erro ao criar backup:', error?.message || error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();