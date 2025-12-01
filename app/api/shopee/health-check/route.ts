import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 🔍 ENDPOINT DE MONITORAMENTO - Verifica status das integrações Shopee
 * 
 * Uso: GET /api/shopee/health-check?client_id=xxx
 * 
 * Retorna:
 * - Status da integração (conectada/desconectada)
 * - Validade dos tokens
 * - Última vez que dados foram buscados com sucesso
 * - Resumo rápido dos dados disponíveis
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      // Se não tem client_id, mostra status geral de todas as integrações
      const allIntegrations = await prisma.client_integrations.findMany({
        where: { provider: 'shopee' },
        include: { clients: { select: { name: true } } },
        orderBy: { updated_at: 'desc' }
      });

      const summary = allIntegrations.map(integration => {
        const now = new Date();
        const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
        const isExpired = expiry ? expiry.getTime() < now.getTime() : true;
        const hoursUntilExpiry = expiry ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;

        return {
          client_id: integration.client_id,
          client_name: integration.clients?.name || 'N/A',
          shop_id: integration.shop_id,
          status: integration.access_token && !isExpired ? 'connected' : 'disconnected',
          token_expires_in_hours: hoursUntilExpiry,
          last_updated: integration.updated_at,
          has_refresh_token: !!integration.refresh_token
        };
      });

      return NextResponse.json({
        success: true,
        total_integrations: allIntegrations.length,
        connected: summary.filter(s => s.status === 'connected').length,
        disconnected: summary.filter(s => s.status === 'disconnected').length,
        integrations: summary
      });
    }

    // Verificação específica para um cliente
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
      include: { clients: { select: { name: true } } }
    });

    if (!integration) {
      return NextResponse.json({
        success: false,
        client_id: clientId,
        status: 'not_found',
        message: 'Integração Shopee não encontrada para este cliente'
      });
    }

    const now = new Date();
    const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
    const isExpired = expiry ? expiry.getTime() < now.getTime() : true;
    const hoursUntilExpiry = expiry ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : 0;
    const daysUntilExpiry = Math.round(hoursUntilExpiry / 24);

    // Teste rápido de conectividade (sem buscar dados pesados)
    let connectivityTest = {
      can_connect: false,
      error: null as string | null,
      response_time_ms: 0
    };

    if (!isExpired && integration.access_token) {
      try {
        const startTime = Date.now();
        
        // Fazer uma chamada simples para testar conectividade
        const testResponse = await fetch('/api/shopee/data?' + new URLSearchParams({
          client_id: clientId
        }), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        connectivityTest.response_time_ms = Date.now() - startTime;
        connectivityTest.can_connect = testResponse.ok;
        
        if (!testResponse.ok) {
          const errorData = await testResponse.json();
          connectivityTest.error = errorData.error || `HTTP ${testResponse.status}`;
        }
      } catch (e: any) {
        connectivityTest.error = e.message || 'Erro de conectividade';
      }
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      client_name: integration.clients?.name || 'N/A',
      shop_id: integration.shop_id,
      status: integration.access_token && !isExpired ? 'connected' : 'disconnected',
      token_info: {
        has_access_token: !!integration.access_token,
        has_refresh_token: !!integration.refresh_token,
        expires_at: integration.token_expiry,
        expires_in_hours: hoursUntilExpiry,
        expires_in_days: daysUntilExpiry,
        is_expired: isExpired,
        needs_refresh_soon: hoursUntilExpiry < 2 && hoursUntilExpiry > 0
      },
      connectivity: connectivityTest,
      last_updated: integration.updated_at,
      created_at: integration.created_at,
      recommendations: [
        ...(isExpired ? ['🚨 Token expirado - reautenticação necessária'] : []),
        ...(hoursUntilExpiry < 2 && hoursUntilExpiry > 0 ? ['⚠️ Token expira em breve - será renovado automaticamente'] : []),
        ...(!integration.refresh_token ? ['❌ Refresh token ausente - reautenticação necessária'] : []),
        ...(connectivityTest.can_connect ? ['✅ Conectividade OK'] : ['❌ Falha na conectividade']),
        ...(connectivityTest.response_time_ms > 5000 ? ['⚠️ Resposta lenta da API'] : [])
      ]
    });

  } catch (err: any) {
    console.error('❌ Erro no health check:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
