const { PrismaClient } = require('./lib/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function searchForOldTokens() {
  console.log('🔍 Procurando tokens antigos...\n');

  try {
    // 1. Verificar se há logs do servidor que podem conter tokens
    console.log('📋 1. Verificando logs do servidor...');
    const logPaths = [
      '.next/server.log',
      'logs/server.log',
      'npm-debug.log',
      '.npm/_logs',
    ];

    for (const logPath of logPaths) {
      if (fs.existsSync(logPath)) {
        console.log(`   ✅ Encontrado: ${logPath}`);
        try {
          const logContent = fs.readFileSync(logPath, 'utf8');
          if (logContent.includes('access_token') || logContent.includes('refresh_token')) {
            console.log(`   🎯 Log ${logPath} pode conter tokens!`);
          }
        } catch (e) {
          console.log(`   ⚠️ Erro ao ler ${logPath}: ${e.message}`);
        }
      }
    }

    // 2. Verificar histórico de atualizações na tabela
    console.log('\n📊 2. Verificando histórico de integrações...');
    const integrations = await prisma.client_integrations.findMany({
      where: {
        provider: 'shopee',
        client_id: '2a2358c6-ae5c-458c-b50d-d4d23f07daf5'
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    for (const integration of integrations) {
      console.log(`\n   🏪 Shop ID: ${integration.shop_id}`);
      console.log(`   📅 Criado: ${integration.created_at}`);
      console.log(`   📅 Atualizado: ${integration.updated_at}`);
      console.log(`   🔑 Access Token: ${integration.access_token ? `${integration.access_token.substring(0, 10)}...` : 'AUSENTE'}`);
      console.log(`   🔄 Refresh Token: ${integration.refresh_token ? `${integration.refresh_token.substring(0, 10)}...` : 'AUSENTE'}`);
      console.log(`   ⏰ Expiry: ${integration.token_expiry || 'N/A'}`);
    }

    // 3. Verificar se há backups do banco de dados
    console.log('\n💾 3. Verificando backups do banco...');
    const backupPaths = [
      'prisma/backup',
      'backup',
      'db_backup',
      '.backup',
      'database.backup'
    ];

    for (const backupPath of backupPaths) {
      if (fs.existsSync(backupPath)) {
        console.log(`   ✅ Encontrado backup: ${backupPath}`);
        const files = fs.readdirSync(backupPath);
        console.log(`   📁 Arquivos: ${files.join(', ')}`);
      }
    }

    // 4. Verificar variáveis de ambiente ou arquivos de configuração
    console.log('\n⚙️ 4. Verificando arquivos de configuração...');
    const configFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'config.json',
      'shopee-config.json'
    ];

    for (const configFile of configFiles) {
      if (fs.existsSync(configFile)) {
        console.log(`   ✅ Encontrado: ${configFile}`);
        try {
          const content = fs.readFileSync(configFile, 'utf8');
          if (content.includes('SHOPEE') || content.includes('access_token') || content.includes('refresh_token')) {
            console.log(`   🎯 ${configFile} pode conter configurações Shopee!`);
          }
        } catch (e) {
          console.log(`   ⚠️ Erro ao ler ${configFile}: ${e.message}`);
        }
      }
    }

    // 5. Verificar se há dumps SQL recentes
    console.log('\n🗄️ 5. Verificando dumps SQL...');
    const sqlFiles = fs.readdirSync('.').filter(file => 
      file.endsWith('.sql') || file.endsWith('.dump') || file.endsWith('.backup')
    );

    if (sqlFiles.length > 0) {
      console.log(`   ✅ Encontrados arquivos SQL: ${sqlFiles.join(', ')}`);
    } else {
      console.log(`   ❌ Nenhum arquivo SQL encontrado`);
    }

    // 6. Verificar logs do terminal/console
    console.log('\n💻 6. Dicas para recuperação manual...');
    console.log(`   📝 Verifique o histórico do terminal: history | grep -i shopee`);
    console.log(`   📝 Verifique logs do navegador (DevTools → Network → Headers)`);
    console.log(`   📝 Verifique se há screenshots ou anotações com os tokens`);
    console.log(`   📝 Verifique backups do sistema ou nuvem`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchForOldTokens();
