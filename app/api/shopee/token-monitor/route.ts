import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 🔍 MONITOR DE TOKENS EM TEMPO REAL
 * 
 * Monitora status dos tokens e prevê quando vão expirar
 * Uso: GET /api/shopee/token-monitor?client_id=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Buscar integração
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ 
        error: 'Integração não encontrada',
        needs_connection: true 
      }, { status: 404 });
    }

    const now = new Date();
    const tokenExpiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
    
    // Calcular tempo restante
    const timeUntilExpiry = tokenExpiry ? tokenExpiry.getTime() - now.getTime() : 0;
    const hoursUntilExpiry = timeUntilExpiry > 0 ? Math.floor(timeUntilExpiry / (1000 * 60 * 60)) : 0;
    const minutesUntilExpiry = timeUntilExpiry > 0 ? Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60)) : 0;

    // Status do token
    let tokenStatus = 'unknown';
    let urgency = 'low';
    let recommendation = '';

    if (!integration.access_token) {
      tokenStatus = 'missing';
      urgency = 'critical';
      recommendation = 'Reconexão necessária - token não encontrado';
    } else if (!tokenExpiry) {
      tokenStatus = 'no_expiry';
      urgency = 'medium';
      recommendation = 'Token sem data de expiração definida';
    } else if (timeUntilExpiry <= 0) {
      tokenStatus = 'expired';
      urgency = 'critical';
      recommendation = 'Token expirado - reconexão necessária';
    } else if (hoursUntilExpiry <= 1) {
      tokenStatus = 'expiring_soon';
      urgency = 'high';
      recommendation = 'Token expira em menos de 1 hora - considere reconectar';
    } else if (hoursUntilExpiry <= 6) {
      tokenStatus = 'expiring_today';
      urgency = 'medium';
      recommendation = 'Token expira hoje - monitore de perto';
    } else {
      tokenStatus = 'healthy';
      urgency = 'low';
      recommendation = 'Token saudável';
    }

    // Testar conectividade (rápido)
    let apiConnectivity = 'unknown';
    try {
      const testResponse = await fetch(`${request.url.split('/api/shopee/token-monitor')[0]}/api/shopee/data?client_id=${clientId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        apiConnectivity = testData.success ? 'working' : 'error';
      } else {
        apiConnectivity = 'error';
      }
    } catch (e) {
      apiConnectivity = 'error';
    }

    // Histórico de refresh (últimas tentativas)
    const recentRefreshAttempts = await prisma.client_integrations.findMany({
      where: { 
        client_id: clientId,
        provider: 'shopee'
      },
      select: {
        updated_at: true,
        created_at: true
      },
      orderBy: { updated_at: 'desc' },
      take: 1
    });

    const lastUpdate = recentRefreshAttempts[0]?.updated_at || null;
    const timeSinceLastUpdate = lastUpdate ? now.getTime() - new Date(lastUpdate).getTime() : 0;
    const hoursSinceLastUpdate = Math.floor(timeSinceLastUpdate / (1000 * 60 * 60));

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      client_id: clientId,
      shop_id: integration.shop_id,
      token_status: {
        status: tokenStatus,
        urgency,
        recommendation,
        has_access_token: !!integration.access_token,
        has_refresh_token: !!integration.refresh_token,
        expiry_date: tokenExpiry?.toISOString() || null,
        hours_until_expiry: hoursUntilExpiry,
        minutes_until_expiry: minutesUntilExpiry,
        time_until_expiry_ms: timeUntilExpiry > 0 ? timeUntilExpiry : 0
      },
      api_connectivity: {
        status: apiConnectivity,
        last_test: now.toISOString()
      },
      refresh_history: {
        last_update: lastUpdate?.toISOString() || null,
        hours_since_last_update: hoursSinceLastUpdate,
        created_at: integration.created_at?.toISOString() || null
      },
      actions: {
        can_refresh: !!integration.refresh_token && tokenStatus !== 'expired',
        needs_reconnection: tokenStatus === 'expired' || tokenStatus === 'missing' || apiConnectivity === 'error',
        should_monitor: urgency === 'high' || urgency === 'medium'
      }
    });

  } catch (err: any) {
    console.error('❌ Erro no monitor de tokens:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
