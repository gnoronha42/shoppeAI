#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DIRETO NO BANCO - Script para identificar problemas de tokens
 * 
 * Executa: node diagnose-tokens-direct.js
 */

const { PrismaClient } = require('./lib/generated/prisma');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('\n🔍 ===== DIAGNÓSTICO DIRETO DOS TOKENS SHOPEE =====\n');

    // 1. Buscar todas as integrações Shopee
    const integrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      include: { 
        clients: { 
          select: { id: true, name: true, created_at: true } 
        } 
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`📊 Total de integrações Shopee encontradas: ${integrations.length}\n`);

    if (integrations.length === 0) {
      console.log('❌ PROBLEMA IDENTIFICADO: Nenhuma integração Shopee encontrada!');
      console.log('💡 SOLUÇÃO: Você precisa conectar pelo menos uma conta Shopee primeiro.\n');
      return;
    }

    // 2. Analisar cada integração
    const now = new Date();
    let problemsFound = 0;
    
    integrations.forEach((integration, index) => {
      console.log(`\n--- INTEGRAÇÃO ${index + 1} ---`);
      console.log(`🆔 Client ID: ${integration.client_id}`);
      console.log(`🏪 Shop ID: ${integration.shop_id}`);
      console.log(`👤 Cliente: ${integration.clients?.name || '❌ CLIENTE NÃO ENCONTRADO'}`);
      
      // Verificar tokens
      const hasAccessToken = !!integration.access_token;
      const hasRefreshToken = !!integration.refresh_token;
      
      console.log(`🔑 Access Token: ${hasAccessToken ? '✅ Presente' : '❌ Ausente'} (${integration.access_token?.length || 0} chars)`);
      console.log(`🔄 Refresh Token: ${hasRefreshToken ? '✅ Presente' : '❌ Ausente'} (${integration.refresh_token?.length || 0} chars)`);
      
      // Verificar expiração
      if (integration.token_expiry) {
        const expiry = new Date(integration.token_expiry);
        const isExpired = expiry.getTime() < now.getTime();
        const hoursUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
        
        console.log(`⏰ Expira em: ${expiry.toLocaleString('pt-BR')}`);
        console.log(`📅 Status: ${isExpired ? '❌ EXPIRADO' : '✅ Válido'} (${hoursUntilExpiry}h restantes)`);
        
        if (isExpired) problemsFound++;
      } else {
        console.log(`⏰ Expiração: ❌ NÃO DEFINIDA`);
        problemsFound++;
      }
      
      // Verificar timestamps
      console.log(`📅 Criado: ${new Date(integration.created_at).toLocaleString('pt-BR')}`);
      console.log(`📅 Atualizado: ${new Date(integration.updated_at).toLocaleString('pt-BR')}`);
      
      // Identificar problemas
      const problems = [];
      if (!hasAccessToken) problems.push('Access token ausente');
      if (!hasRefreshToken) problems.push('Refresh token ausente');
      if (!integration.clients) problems.push('Cliente não existe (órfã)');
      if (integration.token_expiry && new Date(integration.token_expiry).getTime() < now.getTime()) {
        problems.push('Token expirado');
      }
      
      if (problems.length > 0) {
        console.log(`🚨 PROBLEMAS: ${problems.join(', ')}`);
        problemsFound++;
      } else {
        console.log(`✅ Status: OK`);
      }
    });

    // 3. Verificar duplicatas
    const shopIdCounts = {};
    integrations.forEach(integration => {
      if (integration.shop_id) {
        shopIdCounts[integration.shop_id] = (shopIdCounts[integration.shop_id] || 0) + 1;
      }
    });

    const duplicates = Object.entries(shopIdCounts).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log(`\n🔍 DUPLICATAS ENCONTRADAS:`);
      duplicates.forEach(([shopId, count]) => {
        console.log(`   Shop ID ${shopId}: ${count} integrações`);
        problemsFound++;
      });
    }

    // 4. Resumo final
    console.log(`\n\n📋 ===== RESUMO DO DIAGNÓSTICO =====`);
    console.log(`📊 Total de integrações: ${integrations.length}`);
    console.log(`✅ Integrações ativas: ${integrations.filter(i => i.access_token && i.refresh_token && (!i.token_expiry || new Date(i.token_expiry) > now)).length}`);
    console.log(`❌ Integrações com problemas: ${problemsFound}`);
    console.log(`🔄 Duplicatas: ${duplicates.length}`);

    // 5. Recomendações
    console.log(`\n🎯 ===== RECOMENDAÇÕES =====`);
    
    if (problemsFound === 0) {
      console.log(`🎉 PARABÉNS! Todas as integrações estão funcionando corretamente!`);
    } else {
      console.log(`🔧 AÇÕES NECESSÁRIAS:`);
      
      const expiredCount = integrations.filter(i => i.token_expiry && new Date(i.token_expiry) < now).length;
      const missingTokens = integrations.filter(i => !i.access_token || !i.refresh_token).length;
      const orphaned = integrations.filter(i => !i.clients).length;
      
      if (expiredCount > 0) {
        console.log(`   1. 🔄 Executar refresh em ${expiredCount} integrações expiradas`);
      }
      
      if (missingTokens > 0) {
        console.log(`   2. 🔐 Reautenticar ${missingTokens} contas com tokens ausentes`);
      }
      
      if (orphaned > 0) {
        console.log(`   3. 🗑️ Limpar ${orphaned} integrações órfãs`);
      }
      
      if (duplicates.length > 0) {
        console.log(`   4. 🔗 Consolidar ${duplicates.length} grupos de duplicatas`);
      }
    }

    console.log(`\n💡 Para executar correções automáticas:`);
    console.log(`   - Refresh: POST /api/shopee/fix-tokens {"action": "refresh_all"}`);
    console.log(`   - Limpar órfãs: POST /api/shopee/fix-tokens {"action": "clean_orphaned"}`);
    console.log(`   - Consolidar: POST /api/shopee/fix-tokens {"action": "merge_duplicates"}`);

  } catch (error) {
    console.error('\n❌ ERRO NO DIAGNÓSTICO:', error.message);
    
    if (error.message.includes('database server')) {
      console.log('\n💡 SOLUÇÃO: Verifique se o banco de dados está rodando e acessível.');
      console.log('   - Confirme as credenciais no .env');
      console.log('   - Teste a conexão com o banco');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
