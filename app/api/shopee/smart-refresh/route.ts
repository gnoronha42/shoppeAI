import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/shopee';

export const dynamic = 'force-dynamic';

/**
 * 🧠 REFRESH INTELIGENTE COM MÚLTIPLAS ESTRATÉGIAS
 * 
 * Tenta renovar tokens usando diferentes abordagens para evitar falhas
 * Uso: POST /api/shopee/smart-refresh
 */
export async function POST(request: Request) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { client_id, force = false } = await request.json();

    if (!client_id) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Buscar integração
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id, provider: 'shopee' } },
    });

    if (!integration || !integration.refresh_token) {
      return NextResponse.json({ 
        error: 'Integração não encontrada ou refresh token ausente',
        needs_reconnection: true 
      }, { status: 404 });
    }

    const now = new Date();
    const tokenExpiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
    const timeUntilExpiry = tokenExpiry ? tokenExpiry.getTime() - now.getTime() : 0;
    const hoursUntilExpiry = timeUntilExpiry > 0 ? Math.floor(timeUntilExpiry / (1000 * 60 * 60)) : 0;

    // Verificar se realmente precisa renovar
    if (!force && hoursUntilExpiry > 6) {
      return NextResponse.json({
        success: true,
        message: 'Token ainda válido, refresh não necessário',
        hours_until_expiry: hoursUntilExpiry,
        skipped: true
      });
    }

    console.log(` [SMART-REFRESH] Iniciando refresh inteligente para ${client_id}`);
    console.log(`   Token expira em: ${hoursUntilExpiry} horas`);
    console.log(`   Modo: ${force ? 'FORÇADO' : 'AUTOMÁTICO'}`);

    // Estratégias de refresh (em ordem de prioridade)
    const strategies = [
      {
        name: 'com_shop_id',
        description: 'Refresh com shop_id (formato atual)',
        shop_id: integration.shop_id
      },
      {
        name: 'sem_shop_id',
        description: 'Refresh sem shop_id (formato original)',
        shop_id: undefined
      }
    ];

    let lastError: Error | null = null;
    let successStrategy: string | null = null;

    for (const strategy of strategies) {
      try {
        console.log(`[SMART-REFRESH] Tentando estratégia: ${strategy.name}`);
        console.log(`    ${strategy.description}`);

        const refreshResult = await refreshAccessToken({
          refresh_token: integration.refresh_token,
          shop_id: strategy.shop_id ?? undefined
        });

        // Calcular nova data de expiração
        const newExpiryDate = new Date(Date.now() + (refreshResult.expire_in * 1000));

        // Atualizar no banco
        await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: refreshResult.access_token,
            refresh_token: refreshResult.refresh_token, 
            token_expiry: newExpiryDate,
            updated_at: new Date()
          }
        });

        successStrategy = strategy.name;
        console.log(`[SMART-REFRESH] Sucesso com estratégia: ${strategy.name}`);
        console.log(`    Novo token expira em: ${newExpiryDate.toISOString()}`);

        return NextResponse.json({
          success: true,
          message: `Token renovado com sucesso usando estratégia: ${strategy.name}`,
          strategy_used: strategy.name,
          new_expiry: newExpiryDate.toISOString(),
          hours_until_new_expiry: Math.floor(refreshResult.expire_in / 3600),
          client_id,
          shop_id: integration.shop_id
        });

      } catch (error: any) {
        console.warn(`⚠️ [SMART-REFRESH] Estratégia ${strategy.name} falhou:`, error.message);
        lastError = error;

        // Se for erro 404, pode ser temporário - continua tentando
        if (error.message.includes('404')) {
          console.log(`    Erro 404 detectado, tentando próxima estratégia...`);
          continue;
        }

        // Se for erro de token expirado, para as tentativas
        if ((error as any).code === 'REFRESH_TOKEN_EXPIRED') {
          console.error(`[SMART-REFRESH] Refresh token expirado - reautenticação necessária`);
          break;
        }
      }
    }

    // Se chegou aqui, todas as estratégias falharam
    console.error(` [SMART-REFRESH] Todas as estratégias falharam para ${client_id}`);

    // Determinar se precisa de reconexão
    const needsReconnection = (lastError as any)?.code === 'REFRESH_TOKEN_EXPIRED' || 
                             lastError?.message.includes('403') ||
                             lastError?.message.includes('invalid') ||
                             lastError?.message.includes('expired');

    return NextResponse.json({
      success: false,
      message: 'Falha em todas as estratégias de refresh',
      error: lastError?.message || 'Erro desconhecido',
      error_code: (lastError as any)?.code || 'UNKNOWN',
      needs_reconnection: needsReconnection,
      strategies_tried: strategies.map(s => s.name),
      client_id,
      shop_id: integration.shop_id,
      recommendation: needsReconnection 
        ? 'Reconexão manual necessária - refresh token expirado'
        : 'Erro temporário - tente novamente em alguns minutos'
    }, { status: needsReconnection ? 401 : 500 });

  } catch (err: any) {
    console.error(' [SMART-REFRESH] Erro interno:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}

/**
 * 🔍 GET: Status do refresh inteligente
 */
export async function GET(request: Request) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Buscar integração
    const integration:any = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ 
        error: 'Integração não encontrada' 
      }, { status: 404 });
    }

    const now = new Date();
    const tokenExpiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
    const timeUntilExpiry = tokenExpiry ? tokenExpiry.getTime() - now.getTime() : 0;
    const hoursUntilExpiry = timeUntilExpiry > 0 ? Math.floor(timeUntilExpiry / (1000 * 60 * 60)) : 0;

    // Determinar se deve fazer refresh
    let shouldRefresh = false;
    let urgency = 'low';
    let recommendation = '';

    if (!integration.access_token) {
      shouldRefresh = true;
      urgency = 'critical';
      recommendation = 'Token ausente - refresh necessário';
    } else if (timeUntilExpiry <= 0) {
      shouldRefresh = true;
      urgency = 'critical';
      recommendation = 'Token expirado - refresh urgente';
    } else if (hoursUntilExpiry <= 1) {
      shouldRefresh = true;
      urgency = 'high';
      recommendation = 'Token expira em menos de 1 hora - refresh recomendado';
    } else if (hoursUntilExpiry <= 6) {
      shouldRefresh = true;
      urgency = 'medium';
      recommendation = 'Token expira em menos de 6 horas - refresh preventivo';
    } else {
      recommendation = 'Token saudável - refresh não necessário';
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      shop_id: integration.shop_id,
      client_name: clientId, // Nome do cliente não está disponível neste contexto
      token_status: {
        has_access_token: !!integration.access_token,
        has_refresh_token: !!integration.refresh_token,
        expiry_date: tokenExpiry?.toISOString() || null,
        hours_until_expiry: hoursUntilExpiry,
        time_until_expiry_ms: timeUntilExpiry > 0 ? timeUntilExpiry : 0
      },
      refresh_recommendation: {
        should_refresh: shouldRefresh,
        urgency,
        recommendation
      },
      last_update: integration.updated_at?.toISOString() || null
    });

  } catch (err: any) {
    console.error(' [SMART-REFRESH] Erro no GET:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno'
    }, { status: 500 });
  }
}

import { guardShopeeRoute } from '@/lib/shopee-route-guard';
