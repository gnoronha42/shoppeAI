import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 🧪 TESTE COMPLETO DE AUTOMAÇÃO DO CRON
 * 
 * Simula diferentes cenários para validar se o cron funciona automaticamente
 * Uso: GET /api/shopee/test-cron-automation?scenario=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scenario = searchParams.get('scenario') || 'all';
    const clientId = searchParams.get('client_id') || '9e79b6af-fa26-4e7e-89c7-9e2cdd05c6fa';

    console.log(`🧪 [TEST-CRON] Iniciando teste de automação - Cenário: ${scenario}`);

    const results = {
      timestamp: new Date().toISOString(),
      scenario,
      client_id: clientId,
      tests: [] as any[],
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      automation_status: 'unknown' as 'working' | 'partial' | 'broken',
      recommendations: [] as string[]
    };

    // Buscar integração atual
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({
        success: false,
        error: 'Integração não encontrada',
        client_id: clientId
      }, { status: 404 });
    }

    const now = new Date();
    const tokenExpiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
    const timeUntilExpiry = tokenExpiry ? tokenExpiry.getTime() - now.getTime() : 0;
    const hoursUntilExpiry = timeUntilExpiry > 0 ? Math.floor(timeUntilExpiry / (1000 * 60 * 60)) : 0;
    const minutesUntilExpiry = timeUntilExpiry > 0 ? Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60)) : 0;

    // TESTE 1: Status do Token
    const test1 = {
      name: 'Token Status Check',
      description: 'Verificar se o token está próximo do vencimento',
      status: 'unknown' as 'pass' | 'fail' | 'warning',
      details: {} as any,
      recommendation: ''
    };

    test1.details = {
      has_access_token: !!integration.access_token,
      has_refresh_token: !!integration.refresh_token,
      expiry_date: tokenExpiry?.toISOString() || null,
      hours_until_expiry: hoursUntilExpiry,
      minutes_until_expiry: minutesUntilExpiry,
      is_expired: timeUntilExpiry <= 0,
      needs_refresh_soon: hoursUntilExpiry <= 6
    };

    if (!integration.access_token || !integration.refresh_token) {
      test1.status = 'fail';
      test1.recommendation = 'Token ou refresh token ausente - reconexão necessária';
    } else if (timeUntilExpiry <= 0) {
      test1.status = 'warning';
      test1.recommendation = 'Token expirado - cron deveria ter renovado automaticamente';
    } else if (hoursUntilExpiry <= 1) {
      test1.status = 'warning';
      test1.recommendation = 'Token expira em breve - ideal para testar renovação automática';
    } else {
      test1.status = 'pass';
      test1.recommendation = 'Token saudável';
    }

    results.tests.push(test1);

    // TESTE 2: Cron Job Simulation
    const test2 = {
      name: 'Cron Job Simulation',
      description: 'Simular execução do cron job',
      status: 'unknown' as 'pass' | 'fail' | 'warning',
      details: {} as any,
      recommendation: ''
    };

    try {
      const cronUrl = new URL(`${request.url.split('/api/shopee/test-cron-automation')[0]}/api/shopee/cron-refresh-tokens`);
      const cronResponse = await fetch(cronUrl.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (cronResponse.ok) {
        const cronData = await cronResponse.json();
        test2.details = {
          cron_executed: true,
          cron_success: cronData.success,
          successful_refreshes: cronData.summary?.successful_refreshes || 0,
          failed_refreshes: cronData.summary?.failed_refreshes || 0,
          errors: cronData.summary?.errors || []
        };

        if (cronData.success && cronData.summary?.successful_refreshes > 0) {
          test2.status = 'pass';
          test2.recommendation = 'Cron job funcionando - tokens renovados automaticamente';
        } else if (cronData.summary?.failed_refreshes > 0) {
          test2.status = 'warning';
          test2.recommendation = 'Cron executou mas falhou na renovação - pode ser erro temporário';
        } else {
          test2.status = 'warning';
          test2.recommendation = 'Cron executou mas não havia tokens para renovar';
        }
      } else {
        test2.status = 'fail';
        test2.details = { cron_executed: false, http_status: cronResponse.status };
        test2.recommendation = 'Cron job não está acessível';
      }
    } catch (cronError: any) {
      test2.status = 'fail';
      test2.details = { cron_executed: false, error: cronError.message };
      test2.recommendation = 'Erro ao executar cron job';
    }

    results.tests.push(test2);

    // TESTE 3: Smart Refresh
    const test3 = {
      name: 'Smart Refresh Test',
      description: 'Testar sistema de refresh inteligente',
      status: 'unknown' as 'pass' | 'fail' | 'warning',
      details: {} as any,
      recommendation: ''
    };

    try {
      const smartRefreshUrl = new URL(`${request.url.split('/api/shopee/test-cron-automation')[0]}/api/shopee/smart-refresh`);
      const smartRefreshResponse = await fetch(smartRefreshUrl.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, force: true })
      });

      if (smartRefreshResponse.ok) {
        const smartData = await smartRefreshResponse.json();
        test3.details = {
          smart_refresh_executed: true,
          smart_refresh_success: smartData.success,
          strategies_tried: smartData.strategies_tried || [],
          error: smartData.error || null
        };

        if (smartData.success) {
          test3.status = 'pass';
          test3.recommendation = 'Smart refresh funcionando - múltiplas estratégias disponíveis';
        } else {
          test3.status = 'warning';
          test3.recommendation = `Smart refresh falhou: ${smartData.error || 'Erro desconhecido'}`;
        }
      } else {
        test3.status = 'fail';
        test3.details = { smart_refresh_executed: false, http_status: smartRefreshResponse.status };
        test3.recommendation = 'Smart refresh não está acessível';
      }
    } catch (smartError: any) {
      test3.status = 'fail';
      test3.details = { smart_refresh_executed: false, error: smartError.message };
      test3.recommendation = 'Erro ao executar smart refresh';
    }

    results.tests.push(test3);

    // TESTE 4: Fallback Gracioso
    const test4 = {
      name: 'Graceful Fallback Test',
      description: 'Testar se o sistema funciona graciosamente quando tokens falham',
      status: 'unknown' as 'pass' | 'fail' | 'warning',
      details: {} as any,
      recommendation: ''
    };

    try {
      const dataUrl = new URL(`${request.url.split('/api/shopee/test-cron-automation')[0]}/api/shopee/data`);
      dataUrl.searchParams.set('client_id', clientId);
      
      const dataResponse = await fetch(dataUrl.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (dataResponse.ok) {
        const dataResult = await dataResponse.json();
        test4.details = {
          data_endpoint_accessible: true,
          data_success: dataResult.success,
          needs_reconnection: dataResult.needs_reconnection || false,
          has_fallback_data: !!dataResult.data,
          shop_name: dataResult.data?.shopName || null
        };

        if (dataResult.success) {
          test4.status = 'pass';
          test4.recommendation = 'Endpoint de dados funcionando normalmente';
        } else if (dataResult.needs_reconnection && dataResult.data) {
          test4.status = 'pass';
          test4.recommendation = 'Fallback gracioso funcionando - retorna dados vazios em vez de erro';
        } else {
          test4.status = 'warning';
          test4.recommendation = 'Endpoint de dados com problemas';
        }
      } else {
        test4.status = 'fail';
        test4.details = { data_endpoint_accessible: false, http_status: dataResponse.status };
        test4.recommendation = 'Endpoint de dados não está acessível';
      }
    } catch (dataError: any) {
      test4.status = 'fail';
      test4.details = { data_endpoint_accessible: false, error: dataError.message };
      test4.recommendation = 'Erro ao acessar endpoint de dados';
    }

    results.tests.push(test4);

    // TESTE 5: GitHub Actions Workflow
    const test5 = {
      name: 'GitHub Actions Workflow',
      description: 'Verificar se o workflow do GitHub Actions está configurado',
      status: 'unknown' as 'pass' | 'fail' | 'warning',
      details: {} as any,
      recommendation: ''
    };

    try {
      // Verificar se o arquivo de workflow existe
      const fs = require('fs');
      const path = require('path');
      const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'refresh-shopee-tokens.yml');
      
      if (fs.existsSync(workflowPath)) {
        const workflowContent = fs.readFileSync(workflowPath, 'utf8');
        const hasCronSchedule = workflowContent.includes('cron:') && workflowContent.includes('*/3 * * *');
        const hasCorrectUrl = workflowContent.includes('selleria.com.br') || workflowContent.includes('NEXTAUTH_URL');
        
        test5.details = {
          workflow_file_exists: true,
          has_cron_schedule: hasCronSchedule,
          has_correct_url: hasCorrectUrl,
          cron_frequency: hasCronSchedule ? 'A cada 3 horas' : 'Não configurado'
        };

        if (hasCronSchedule && hasCorrectUrl) {
          test5.status = 'pass';
          test5.recommendation = 'GitHub Actions configurado corretamente - execução automática a cada 3 horas';
        } else {
          test5.status = 'warning';
          test5.recommendation = 'GitHub Actions parcialmente configurado - verificar cron e URL';
        }
      } else {
        test5.status = 'fail';
        test5.details = { workflow_file_exists: false };
        test5.recommendation = 'Arquivo de workflow do GitHub Actions não encontrado';
      }
    } catch (workflowError: any) {
      test5.status = 'warning';
      test5.details = { error: workflowError.message };
      test5.recommendation = 'Não foi possível verificar o GitHub Actions workflow';
    }

    results.tests.push(test5);

    // Calcular resumo
    results.summary.total_tests = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'pass').length;
    results.summary.failed = results.tests.filter(t => t.status === 'fail').length;
    results.summary.warnings = results.tests.filter(t => t.status === 'warning').length;

    // Determinar status geral da automação
    if (results.summary.failed === 0 && results.summary.passed >= 3) {
      results.automation_status = 'working';
    } else if (results.summary.failed <= 1 && results.summary.passed >= 2) {
      results.automation_status = 'partial';
    } else {
      results.automation_status = 'broken';
    }

    // Recomendações gerais
    if (results.automation_status === 'working') {
      results.recommendations.push('✅ Sistema de automação funcionando corretamente');
      results.recommendations.push('🔄 Tokens serão renovados automaticamente a cada 3 horas');
      results.recommendations.push('🛡️ Fallback gracioso protege a UX quando há problemas');
    } else if (results.automation_status === 'partial') {
      results.recommendations.push('⚠️ Sistema parcialmente funcional - alguns componentes precisam de atenção');
      results.recommendations.push('🔧 Verificar logs e corrigir problemas identificados');
    } else {
      results.recommendations.push('❌ Sistema de automação com problemas críticos');
      results.recommendations.push('🚨 Intervenção manual pode ser necessária');
    }

    // Recomendações específicas baseadas no token
    if (hoursUntilExpiry <= 1 && minutesUntilExpiry > 0) {
      results.recommendations.push(`⏰ Token expira em ${minutesUntilExpiry} minutos - momento ideal para observar renovação automática`);
    } else if (timeUntilExpiry <= 0) {
      results.recommendations.push('🔄 Token expirado - verificar se o cron conseguiu renovar ou se precisa reconectar');
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (err: any) {
    console.error('❌ [TEST-CRON] Erro no teste de automação:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
