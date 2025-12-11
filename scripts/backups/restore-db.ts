import { PrismaClient } from '../../lib/generated/prisma/client.js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Ordem de restauração respeitando dependências de chaves estrangeiras
const RESTORE_ORDER = [
  'users',
  'clients', 
  'checklist_blocks',
  'checklist_items',
  'analyses',
  'analysis_results',
  'images',
  'reports',
  'checklist_progress',
  'products',
  'configurations',
  'activity_log',
  'ad_metrics',
  'ai_requests',
  'chat_conversations',
  'chat_messages',
  'report_metrics'
];

async function safelyRestoreModelData(modelName: string, records: any[]): Promise<void> {
  try {
    const model = (prisma as any)[modelName];
    
    if (!model || typeof model.createMany !== 'function') {
      console.log(`${modelName}: modelo não encontrado ou não tem método createMany`);
      return;
    }

    if (records.length === 0) {
      console.log(`${modelName}: nenhum registro para restaurar`);
      return;
    }

    if (typeof model.deleteMany === 'function') {
      await model.deleteMany({});
      console.log(`${modelName}: registros existentes removidos`);
    }

    const problematicModels = ['analyses', 'analysis_results'];
    
    if (problematicModels.includes(modelName)) {
      console.log(`   🔄 ${modelName}: inserindo registros individualmente...`);
      let successCount = 0;
      
      for (const record of records) {
        try {
          const cleanRecord = { ...record };
          
          if (modelName === 'analyses' && !cleanRecord.created_by) {
            cleanRecord.created_by = null;
          }
          
          await model.create({ data: cleanRecord });
          successCount++;
        } catch (error: any) {
          console.log(`${modelName}: erro ao inserir registro ${record.id || 'sem ID'}: ${error.message}`);
        }
      }
      
      console.log(`${modelName}: ${successCount}/${records.length} registros restaurados`);
    } else {
      // Usar createMany para outros modelos
      try {
        const result = await model.createMany({
          data: records,
          skipDuplicates: true
        });
        
        console.log(`  ${modelName}: ${result.count || records.length} registros restaurados`);
      } catch (error: any) {
        console.log(`${modelName}: erro no createMany - ${error.message}`);
        
        // Fallback: tentar inserir individualmente
        console.log(`${modelName}: tentando inserção individual...`);
        let successCount = 0;
        
        for (const record of records) {
          try {
            await model.create({ data: record });
            successCount++;
          } catch (individualError: any) {
            console.log(`${modelName}: erro ao inserir registro individual: ${individualError.message}`);
          }
        }
        
        console.log(`${modelName}: ${successCount}/${records.length} registros restaurados (individual)`);
      }
    }
  } catch (error: any) {
    console.log(`${modelName}: erro geral na restauração - ${error?.message || 'Erro desconhecido'}`);
  }
}

async function main(): Promise<void> {
  const backupFileName = process.argv[2];
  
  if (!backupFileName) {
    console.log('Por favor, forneça o nome do arquivo de backup.');
    console.log('Uso: npm run restore <nome-do-arquivo-backup.json>');
    console.log('Exemplo: npm run restore backup-2025-07-29T21-54-58-123Z.json');
    process.exit(1);
  }

  try {
    const backupPath = path.join(__dirname, backupFileName);
    
    if (!fs.existsSync(backupPath)) {
      console.log(`Arquivo de backup não encontrado: ${backupPath}`);
      console.log('Verifique se o arquivo está na pasta scripts/backups/');
      process.exit(1);
    }

    console.log('Iniciando restauração do banco de dados...');
    console.log(`Arquivo: ${backupFileName}`);
    
    // Ler arquivo de backup
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('Arquivo de backup carregado com sucesso');
    
    // Testar conexão
    console.log('Testando conexão...');
    await prisma.$connect();
    console.log('Conectado ao banco de dados');
    
    // Mostrar resumo do backup
    console.log('Resumo do backup:');
    const totalRecords = Object.entries(backupData).reduce((total, [modelName, records]) => {
      const recordArray = records as any[];
      if (recordArray.length > 0) {
        console.log(`   - ${modelName}: ${recordArray.length} registros`);
        return total + recordArray.length;
      }
      return total;
    }, 0);
    
    console.log(`\nTotal de registros a restaurar: ${totalRecords}`);
    
    // Confirmar antes de prosseguir
    console.log('\nATENÇÃO: Esta operação irá SUBSTITUIR todos os dados existentes!');
    console.log('Iniciando restauração em 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Restaurar dados na ordem correta
    console.log('\nRestaurando dados...');
    
    for (const modelName of RESTORE_ORDER) {
      if (backupData[modelName]) {
        console.log(`\nRestaurando ${modelName}...`);
        await safelyRestoreModelData(modelName, backupData[modelName]);
      }
    }
    
    // Restaurar dados de modelos que não estão na ordem específica
    for (const [modelName, records] of Object.entries(backupData)) {
      if (!RESTORE_ORDER.includes(modelName)) {
        console.log(`\nRestaurando ${modelName} (adicional)...`);
        await safelyRestoreModelData(modelName, records as any[]);
      }
    }

    console.log('\nRestauração concluída com sucesso!');
    console.log('Verificando dados restaurados...');
    
    // Verificar dados restaurados
    const verificationData: Record<string, number> = {};
    for (const modelName of Object.keys(backupData)) {
      const model = (prisma as any)[modelName];
      if (model && typeof model.count === 'function') {
        try {
          const count = await model.count();
          verificationData[modelName] = count;
          console.log(`    ${modelName}: ${count} registros`);
        } catch (error) {
          console.log(`    ${modelName}: erro ao verificar contagem`);
        }
      }
    }
    
    const totalRestored = Object.values(verificationData).reduce((sum, count) => sum + count, 0);
    console.log(`\n Total de registros restaurados: ${totalRestored}`);

  } catch (error: any) {
    console.error(' Erro durante a restauração:', error?.message || error);
    if (error.stack) {
      console.error(' Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 