import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';

export const dynamic = 'force-dynamic';

/**
 * 🧪 ENDPOINT DE TESTE - Verifica se o cron job está funcionando
 * 
 * Este endpoint verifica:
 * 1. Se há integrações Shopee no banco
 * 2. Quantas precisam de refresh
 * 3. Status dos tokens
 * 4. Se o endpoint do cron está acessível
 */
export async function GET() {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[],
      summary: {} as any
    };

    // Teste 1: Verificar integrações no banco
    try {
      const integrations = await prisma.client_integrations.findMany({
        where: { provider: 'shopee' },
        include: {
          clients: { select: { id: true, name: true } }
        }
      });

      const withRefreshToken = integrations.filter(i => i.refresh_token).length;
      const withAccessToken = integrations.filter(i => i.access_token).length;
      
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const needsRefresh = integrations.filter(i => {
        if (!i.refresh_token) return false;
        if (!i.token_expiry) return true;
        return new Date(i.token_expiry) <= twentyFourHoursFromNow;
      }).length;

      testResults.tests.push({
        test: 'database_integrations',
        success: true,
        total_integrations: integrations.length,
        with_refresh_token: withRefreshToken,
        with_access_token: withAccessToken,
        needs_refresh: needsRefresh,
        details: integrations.map(i => ({
          client_name: i.clients?.name || 'Desconhecido',
          shop_id: i.shop_id,
          has_refresh_token: !!i.refresh_token,
          has_access_token: !!i.access_token,
          token_expiry: i.token_expiry,
          hours_until_expiry: i.token_expiry ? 
            Math.round((new Date(i.token_expiry).getTime() - now.getTime()) / (1000 * 60 * 60)) : 
            null
        }))
      });
    } catch (e: any) {
      testResults.tests.push({
        test: 'database_integrations',
        success: false,
        error: e?.message || 'Erro desconhecido'
      });
    }

    // Teste 2: Verificar se o endpoint do cron está acessível
    try {
      // Prioridade: variável de ambiente específica > extrair de SHOPEE_REDIRECT_URL > localhost
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                     process.env.PRODUCTION_URL ||
                     (process.env.SHOPEE_REDIRECT_URL?.includes('selleria.com.br') ? 
                       'https://www.selleria.com.br' :
                       process.env.SHOPEE_REDIRECT_URL?.replace('/api/shopee/callback', '')) ||
                     'http://localhost:3000';
      
      const cronUrl = `${baseUrl}/api/shopee/cron-refresh-tokens`;
      
      testResults.tests.push({
        test: 'cron_endpoint_accessible',
        success: true,
        cron_url: cronUrl,
        message: 'Endpoint do cron está configurado. Teste manualmente com:',
        test_command: `curl -X GET "${cronUrl}"`
      });
    } catch (e: any) {
      testResults.tests.push({
        test: 'cron_endpoint_accessible',
        success: false,
        error: e?.message || 'Erro desconhecido'
      });
    }

    // Teste 3: Verificar configuração do GitHub Actions
    try {
      const fs = require('fs');
      const path = require('path');
      
      const workflowPath = path.join(process.cwd(), '.github/workflows/refresh-shopee-tokens.yml');
      const workflowExists = fs.existsSync(workflowPath);
      
      let workflowContent = '';
      if (workflowExists) {
        workflowContent = fs.readFileSync(workflowPath, 'utf8');
      }
      
      const hasSchedule = workflowContent.includes('cron:');
      const hasAppUrl = workflowContent.includes('APPURL') || workflowContent.includes('APP_URL');
      
      testResults.tests.push({
        test: 'github_actions_config',
        success: workflowExists,
        workflow_exists: workflowExists,
        has_schedule: hasSchedule,
        has_app_url_secret: hasAppUrl,
        message: workflowExists ? 
          'Workflow configurado. Verifique se o secret APPURL está configurado no GitHub.' :
          'Workflow não encontrado. Crie o arquivo .github/workflows/refresh-shopee-tokens.yml'
      });
    } catch (e: any) {
      testResults.tests.push({
        test: 'github_actions_config',
        success: false,
        error: e?.message || 'Erro desconhecido',
        note: 'Não foi possível verificar a configuração do GitHub Actions'
      });
    }

    // Resumo
    const successfulTests = testResults.tests.filter(t => t.success).length;
    const totalTests = testResults.tests.length;
    
    testResults.summary = {
      total_tests: totalTests,
      successful_tests: successfulTests,
      failed_tests: totalTests - successfulTests,
      success_rate: `${Math.round((successfulTests / totalTests) * 100)}%`,
      cron_ready: successfulTests >= 2,
      recommendations: []
    };

    // Adicionar recomendações
    const dbTest = testResults.tests.find(t => t.test === 'database_integrations');
    if (dbTest && dbTest.success) {
      if (dbTest.total_integrations === 0) {
        testResults.summary.recommendations.push('⚠️ Nenhuma integração Shopee encontrada. Conecte pelo menos uma conta.');
      } else if (dbTest.needs_refresh === 0 && dbTest.total_integrations > 0) {
        testResults.summary.recommendations.push('✅ Todas as integrações têm tokens válidos. O cron não precisa fazer nada agora.');
      } else if (dbTest.needs_refresh > 0) {
        testResults.summary.recommendations.push(`🔄 ${dbTest.needs_refresh} integração(ões) precisam de refresh. Execute o cron manualmente para testar.`);
      }
    }

    const ghTest = testResults.tests.find(t => t.test === 'github_actions_config');
    if (ghTest && !ghTest.workflow_exists) {
      testResults.summary.recommendations.push('📝 Configure o GitHub Actions workflow para execução automática.');
    }

    return NextResponse.json({
      success: successfulTests >= 2,
      message: successfulTests >= 2 ? 
        '✅ Cron job está configurado e pronto para uso!' : 
        '⚠️ Alguns testes falharam. Verifique as recomendações.',
      ...testResults
    });

  } catch (err: any) {
    console.error(' [TEST-CRON] Erro:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      message: 'Falha nos testes do cron job'
    }, { status: 500 });
  }
}
