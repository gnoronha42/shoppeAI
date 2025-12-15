import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';
import { calcularPedidosPagos30Dias } from '../vendas-reais/route';

export const dynamic = 'force-dynamic';

/**
 * HELPER ROBUSTO PARA GERENCIAR TOKENS SHOPEE
 * 
 * Problemas corrigidos:
 * 1. Sempre atualiza refresh_token quando recebido (Shopee retorna novo a cada refresh)
 * 2. Buffer reduzido para 30 minutos (evita refreshes desnecessários)
 * 3. Tratamento específico para refresh_token expirado
 * 4. Logs detalhados para debug
 */
async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const expiryValid = !!expiry && !isNaN(expiry.getTime());
  
  // Buffer reduzido: 30 minutos (1800s) em vez de 1 hora
  // Access tokens Shopee geralmente expiram em 4 horas, então renovar 30min antes é suficiente
  const bufferSeconds = 1800; // 30 minutos
  
  const remainingSeconds = expiryValid && expiry ? Math.floor((expiry.getTime() - now.getTime()) / 1000) : 0;
  const remainingHours = remainingSeconds > 0 ? Math.round(remainingSeconds / 3600) : 0;
  
  console.log(`[getValidAccessToken] Verificando token para shop ${integration.shop_id}:`, {
    token_expiry: integration.token_expiry,
    remaining_seconds: remainingSeconds,
    remaining_hours: remainingHours,
    buffer_seconds: bufferSeconds,
    should_refresh: expiryValid && remainingSeconds <= bufferSeconds,
    has_refresh_token: !!integration.refresh_token
  });
  
  // Tenta refresh se:
  // 1. Há refresh_token
  // 2. Token está perto de expirar OU já expirou (dentro do buffer)
  const shouldRefresh =
    Boolean(integration.refresh_token) &&
    expiryValid &&
    (remainingSeconds <= bufferSeconds);

  if (shouldRefresh) {
    try {
      console.log(`[getValidAccessToken] Token expirado/expirando, renovando...`);
      
      const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
      
      console.log(`[getValidAccessToken] Novo token recebido:`, {
        expire_in_seconds: refreshed.expire_in,
        expire_in_hours: refreshed.expire_in ? Math.round(refreshed.expire_in / 3600) : 'N/A',
        expire_in_days: refreshed.expire_in ? Math.round(refreshed.expire_in / (3600 * 24)) : 'N/A',
        has_new_refresh_token: !!refreshed.refresh_token,
        refresh_token_changed: refreshed.refresh_token !== integration.refresh_token
      });
      
      const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
      
      // Sempre salva o novo refresh_token (Shopee retorna novo a cada refresh)
      // Se não atualizarmos, o refresh_token antigo pode expirar e perderemos a conexão
      const updatedIntegration = await prisma.client_integrations.update({
        where: { id: integration.id },
        data: {
          access_token: refreshed.access_token,
          // Sempre usa o novo refresh_token (nunca mantém o antigo)
          refresh_token: refreshed.refresh_token,
          token_expiry: newExpiry,
          updated_at: new Date(),
        },
      });
      
      console.log(`[getValidAccessToken] Token atualizado com sucesso. Nova expiração: ${newExpiry.toISOString()}`);
      return updatedIntegration;
      
    } catch (e: any) {
      console.error('[getValidAccessToken] Falha ao refrescar token:', {
        error: e?.message || e,
        code: e?.code,
        status: e?.status
      });
      
      // Detecta se o refresh_token expirou (após ~30 dias)
      if (e?.code === 'REFRESH_TOKEN_EXPIRED' || e?.message?.includes('expired') || e?.message?.includes('invalid')) {
        console.error('[getValidAccessToken] Refresh token expirado - reautenticação necessária');
        throw Object.assign(new Error('Refresh token expirado - reautenticação necessária'), { 
          code: 'REFRESH_TOKEN_EXPIRED' 
        });
      }
      
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }
  
  // Se não precisa refresh, verifica se o token ainda é válido
  if (!integration.access_token) {
    // Se não tem access_token mas tem refresh_token, tenta usar o refresh_token
    if (integration.refresh_token) {
      console.log(`[getValidAccessToken] Access token ausente, tentando renovar com refresh_token...`);
      try {
        const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        const updated = await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token,
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });
        return updated;
      } catch (e: any) {
        throw Object.assign(new Error('Falha ao obter access token via refresh'), { code: 'RECONNECT_REQUIRED' });
      }
    }
    throw Object.assign(new Error('Access token ausente'), { code: 'RECONNECT_REQUIRED' });
  }
  
  console.log(`[getValidAccessToken] Token válido por mais ${remainingHours} horas`);
  return integration;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const dateFromParam = searchParams.get('date_from');
    const dateToParam = searchParams.get('date_to');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Processar datas personalizadas
    let customTimeTo: number | null = null;
    let customTimeFrom: number | null = null;
    let customPeriodDays: number | null = null;

    if (dateFromParam && dateToParam) {
      try {
        const dateFrom = new Date(dateFromParam);
        const dateTo = new Date(dateToParam);
        
        if (!isNaN(dateFrom.getTime()) && !isNaN(dateTo.getTime())) {
          customTimeFrom = Math.floor(dateFrom.getTime() / 1000);
          customTimeTo = Math.floor(dateTo.getTime() / 1000);
          customPeriodDays = Math.ceil((customTimeTo - customTimeFrom) / (24 * 60 * 60));
        }
      } catch (e) {
        console.warn('[GET /api/shopee/data] Erro ao processar datas personalizadas:', e);
      }
    }

    let integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração Shopee não encontrada para este cliente' }, { status: 404 });
    }

    // Garante token válido ANTES de qualquer chamada à API
    try {
    integration = await getValidAccessToken(integration);
    } catch (e: any) {
      if (e?.code === 'REFRESH_TOKEN_EXPIRED') {
        return NextResponse.json({ 
          error: 'Refresh token expirado - reautenticação necessária', 
          reconnect_required: true,
          reason: 'refresh_token_expired'
        }, { status: 401 });
      }
      return NextResponse.json({ 
        error: 'Falha ao validar token', 
        reconnect_required: true 
      }, { status: 401 });
    }

    const { access_token, shop_id, refresh_token } = integration as any;
    const integrationId = (integration as any).id;

    // Helper para refresh forçado em caso de 403 invalid_access_token
    const forceRefreshTokens = async () => {
      if (!refresh_token) {
         console.log('[forceRefreshTokens] Não é possível fazer refresh: refresh_token ausente');
        return null;
      }
      try {
         console.log('[forceRefreshTokens] Executando refresh forçado...');
        const refreshed = await refreshAccessToken({ refresh_token });
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        const updated = await prisma.client_integrations.update({
          where: { id: integrationId },
          data: {
            access_token: refreshed.access_token,
             refresh_token: refreshed.refresh_token,
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });
         console.log(`[forceRefreshTokens] Refresh forçado concluído. Nova expiração: ${newExpiry.toISOString()}`);
        return updated;
       } catch (e: any) {
         console.error('[forceRefreshTokens] Falha:', e?.message || e);
         if (e?.code === 'REFRESH_TOKEN_EXPIRED') {
           throw Object.assign(new Error('Refresh token expirado'), { code: 'REFRESH_TOKEN_EXPIRED' });
         }
        return null;
      }
    };

    // 1. Shop Info e Produtos
    let shopInfo: any = {};
    let productInfo: any = { response: { item: [], total_count: 0 } };
    
    try {
      shopInfo = await shopeeFetch<any>({
        path: '/api/v2/shop/get_shop_info',
        access_token,
        shop_id,
      });
      
      // A API retorna dados diretamente, não em response.campo
      if (shopInfo && !shopInfo.response && shopInfo.shop_name) {
        shopInfo = { response: shopInfo };
      }

      // Testar endpoint correto de produtos
      try {
        productInfo = await shopeeFetch<any>({
          path: '/api/v2/product/get_item_list',
          access_token,
          shop_id,
          query: { offset: 0, page_size: 50, item_status: 'NORMAL' }
        });
      } catch (productError: any) {
        console.warn('[GET /api/shopee/data] Endpoint get_item_list falhou:', productError?.message);
        // Se falhar, definir resposta vazia
        productInfo = { response: { item: [], total_count: 0 } };
      }
    } catch (e: any) {
       if (e?.message?.includes('invalid_access_token') || e?.message?.includes('403')) {
          console.log('[GET] Token inválido detectado, tentando refresh forçado...');
        const updated = await forceRefreshTokens();
        if (!updated) {
            // FALLBACK GRACIOSO: Retornar dados vazios em vez de erro 401
            console.log('[GET] Refresh falhou, retornando dados vazios para manter UX');
            return NextResponse.json({
              success: false,
              error: 'Token expirado - dados indisponíveis',
              code: 'TOKEN_EXPIRED',
              clientId: integration?.client_id || clientId,
              shopId: integration?.shop_id || 'N/A',
              data: {
                shopName: 'Reconexão Necessária',
                totalOrdersLast30Days: 0,
                gmvLast30Days: 0,
                ticketMedioLast30Days: 0,
                topProductsLast30Days: [],
                period: {
                  from: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                  to: new Date().toISOString()
                },
                totalProducts: 0,
                activeProducts: 0,
                visitors: 0,
                pageViews: 0,
                conversionRate: 0,
                ads: {
                  spend: 0,
                  roas: 0,
                  impressions: 0,
                  clicks: 0,
                  ctr: 0,
                  cpa: 0
                },
                debug: {
                  periodDays: 15,
                  totalOrdersFound: 0,
                  error: 'Token expirado - reconexão necessária'
                }
              },
              needs_reconnection: true,
              message: 'Dados indisponíveis devido a token expirado. Clique em "Reconectar" na página de integrações.'
            }, { status: 200 });
        }
          // Retry com novo token
          integration = updated;
        shopInfo = await shopeeFetch<any>({
          path: '/api/v2/shop/get_shop_info',
            access_token: updated.access_token || '', 
            shop_id: updated.shop_id || shop_id 
        });
      } else {
        throw e;
      }
    }

    // 2. Pedidos e GMV - MELHORADO: Incluir pedidos pagos e comparativo
    const timeTo = customTimeTo || Math.floor(Date.now() / 1000);
    const maxDays = 30; // Ajustado para 30 dias para análise completa
    const requestedDays = customPeriodDays || 30;
    const timeFrom = customTimeFrom || (timeTo - requestedDays * 24 * 60 * 60);
    
    // Calcular período anterior para comparativo
    const previousPeriodDuration = timeTo - timeFrom;
    const previousTimeFrom = timeFrom - previousPeriodDuration;
    const previousTimeTo = timeFrom;
    
    // Validar que time_from < time_to
    if (timeFrom >= timeTo) {
      console.error('[GET /api/shopee/data] Erro: time_from >= time_to');
      return NextResponse.json({ 
        error: 'Intervalo de datas inválido: data inicial deve ser menor que data final' 
      }, { status: 400 });
    }

    // USAR LÓGICA PRECISA DE VENDAS REAIS (a mesma do dashboard)
    console.log('[GET /api/shopee/data] Buscando dados precisos via calcularPedidosPagos30Dias...');
    let gmv = 0;
    let totalOrders = 0;
    let ticketMedio = 0;
    
    try {
        const dadosPrecisos = await calcularPedidosPagos30Dias(
            (integration as any).access_token,
            (integration as any).shop_id,
            timeFrom,
            timeTo
        );
        
        gmv = dadosPrecisos.totalVendas;
        totalOrders = dadosPrecisos.totalPedidos;
        ticketMedio = totalOrders > 0 ? gmv / totalOrders : 0;
        
        console.log(`[GET /api/shopee/data] Dados precisos obtidos: GMV R$${gmv}, Pedidos ${totalOrders}`);
        
    } catch (e: any) {
        console.error('[GET /api/shopee/data] Erro ao buscar dados precisos:', e);
        // Fallback para lógica antiga ou zerado se falhar
    }

    /* LÓGICA ANTIGA DE BUSCA POR BLOCOS (COMENTADA PARA USAR A NOVA)
    // Função para dividir intervalo em blocos de 15 dias
    const createDateBlocks = ...
    */

    // 3. Performance (Insights) - Visitantes e Conversão
    let visitors = 0;
    let conversionRate = 0;
    let pageViews = 0;
    
    try {
         console.log('[Analytics] Tentando buscar métricas de visitantes (Business Advisor)...');
         // Tentativa no endpoint de performance
         const bizResp = await shopeeFetch<any>({
            path: '/api/v2/shop/performance',
            access_token,
            shop_id,
            query: { time_from: timeFrom, time_to: timeTo }
        });
        
        if (bizResp && !bizResp.error) {
             console.log('[Analytics] Dados de visitantes encontrados!', JSON.stringify(bizResp));
             const data = bizResp.response || {};
             // Campos comuns em APIs da Shopee (uv = unique visitors, pv = page views)
             visitors = Number(data.uv || data.visitors || data.visit_uv || 0);
             pageViews = Number(data.pv || data.page_views || data.visit_pv || 0);
             
             if (visitors > 0) {
                 // Taxa de conversão: Pedidos / Visitantes
                 conversionRate = (totalOrders / visitors) * 100;
             }
        } else {
             console.log('[Analytics] Endpoint /shop/performance retornou erro ou não existe:', bizResp?.error);
        }
    } catch(e: any) {
        console.log('[Analytics] Falha ao buscar dados (provável falta de permissão):', e.message);
    }
    
    // 4. Ads Performance (Busca Robusta em Múltiplos Endpoints)
    let adsSpend = 0;
    let adsRoas = 0;
    let adsImpressions = 0;
    let adsClicks = 0;
    let adsCtr = 0;
    let adsConversions = 0;

    try {
        console.log('[Ads] Iniciando busca de métricas de publicidade...');

        // Lista de endpoints possíveis para tentar (em ordem de probabilidade)
        const adsEndpoints = [
            '/api/v2/ads/get_account_performance', // Mais provável para dados agregados
            '/api/v2/ads/get_ads_performance',     // Tentativa anterior
            '/api/v2/marketing_solution/get_ads_performance',
             // Novo endpoint sugerido na documentação
            '/api/v2/ads/get_gms_campaign_performance'
        ];

        let adsData: any = null;
        let successEndpoint = '';

        for (const endpoint of adsEndpoints) {
            try {
                console.log(`[Ads] Tentando endpoint: ${endpoint}`);
                const resp = await shopeeFetch<any>({
                    path: endpoint,
                    access_token,
                    shop_id,
                    query: {
                        time_from: timeFrom,
                        time_to: timeTo,
                        granularity: 'daily'
                    }
                });

                if (resp && !resp.error) {
                    adsData = resp.response || resp.data;
                    successEndpoint = endpoint;
                    console.log(`[Ads] SUCESSO no endpoint: ${endpoint}`);
                    break; // Parar no primeiro que funcionar
                } else {
                    console.log(`[Ads] Falha no endpoint ${endpoint}:`, resp?.error || 'Retorno vazio');
                }
            } catch (innerErr: any) {
                console.log(`[Ads] Erro no endpoint ${endpoint}:`, innerErr.message);
                
                // Se for 403, nem adianta tentar outros se for problema de permissão global
                if (innerErr.message?.includes('403')) {
                    console.warn('[Ads] Permissão negada (403). Verifique se o app tem permissão para Ads.');
                }
            }
        }

        if (adsData) {
            console.log('[Ads] Processando dados encontrados...');
            
            // Normalizar dados (se for lista ou objeto único)
            const performanceList = Array.isArray(adsData) ? adsData : 
                                  (adsData.performance_list || adsData.nodes || []);
            
            // Se tiver performance_list, iterar e somar
            if (performanceList.length > 0) {
                performanceList.forEach((day: any) => {
                    adsSpend += Number(day.expense || day.spend || day.cost || 0);
                    adsImpressions += Number(day.impression || day.impressions || 0);
                    adsClicks += Number(day.click || day.clicks || 0);
                    adsConversions += Number(day.conversion || day.conversions || day.direct_conversion || 0);
                    // Tentar capturar GMV direto se disponível para ROAS mais preciso
                    // adsGmv += Number(day.gmv || day.direct_gmv || 0);
                });
            } else if (adsData.total_expense || adsData.expense) {
                // Se retornar totais diretos
                adsSpend = Number(adsData.total_expense || adsData.expense || 0);
                adsImpressions = Number(adsData.total_impression || adsData.impression || 0);
                adsClicks = Number(adsData.total_click || adsData.click || 0);
                adsConversions = Number(adsData.total_conversion || adsData.conversion || 0);
            }

            // Calcular derivados
            if (adsSpend > 0) {
                 // Tentar achar GMV de ads na resposta para ROAS
                 // Se não tiver GMV explícito, não podemos calcular ROAS real aqui
                 const adsGmv = Number(adsData.total_gmv || adsData.gmv || adsData.direct_gmv || 0); 
                 
                 if (adsGmv > 0) {
                    adsRoas = adsGmv / adsSpend;
                 }
                 
                 adsCtr = adsImpressions > 0 ? (adsClicks / adsImpressions) * 100 : 0;
            }
            
            console.log(`[Ads] Métricas finais: Spend R$${adsSpend.toFixed(2)}, ROAS ${adsRoas.toFixed(2)}x`);
        } else {
            console.log('[Ads] Nenhum endpoint retornou dados válidos.');
            
            // Teste de conectividade básico (Balance) para diagnosticar permissão
            try {
                console.log('[Ads] Testando acesso básico (get_total_balance)...');
                const balanceResp = await shopeeFetch<any>({
                    path: '/api/v2/ads/get_total_balance',
                    access_token,
                    shop_id
                });
                if (balanceResp && !balanceResp.error) {
                     console.log('[Ads] Acesso ao módulo Ads CONFIRMADO (Balance disponível). Provável erro de endpoint de performance.');
                } else {
                     console.log('[Ads] Acesso ao módulo Ads NEGADO ou falho (Balance erro):', balanceResp?.error);
                }
            } catch (e) {
                console.log('[Ads] Falha no teste de Balance.');
            }
        }

    } catch (e: any) {
        console.log('[Ads] Erro geral na busca:', e.message);
    }

    // Ticket médio já calculado anteriormente
    // const ticketMedio = totalOrders > 0 ? gmv / totalOrders : 0;
    
    // Top products não é retornado pela função simplificada de vendas reais
    const topProducts: any[] = []; 

    const aggregatedData = {
        shopName: shopInfo?.shop_name || 'N/A',
        totalOrdersLast30Days: totalOrders,
        gmvLast30Days: gmv,
        ticketMedioLast30Days: ticketMedio,
        topProductsLast30Days: topProducts,
        period: {
          from: new Date(timeFrom * 1000).toISOString(),
          to: new Date(timeTo * 1000).toISOString(),
        },
        totalProducts: (productInfo as any)?.response?.total_count || 0,
        activeProducts: (productInfo as any)?.response?.item?.length || 0,
        
        // Novos campos para o relatório completo
        visitors: visitors,
        pageViews: pageViews,
        conversionRate: conversionRate, // em %
        ads: {
            spend: adsSpend,
            roas: adsRoas,
            impressions: adsImpressions,
            clicks: adsClicks,
            ctr: adsCtr,
            conversions: adsConversions, // Adicionado campo de conversões
            cpa: adsConversions > 0 && adsSpend > 0 ? adsSpend / adsConversions : 0
        },
        
        debug: {
          periodDays: requestedDays,
          totalOrdersFound: totalOrders
        }
    };

    return NextResponse.json({
      success: true,
      clientId,
      shopId: shop_id,
      data: aggregatedData,
    });

  } catch (err: any) {
    console.error('[GET /api/shopee/data] Erro:', err);
    if (err?.code === 'REFRESH_TOKEN_EXPIRED') {
      return NextResponse.json({ 
        error: 'Refresh token expirado - reautenticação necessária', 
        reconnect_required: true,
        reason: 'refresh_token_expired'
      }, { status: 401 });
    }
    if (err?.code === 'RECONNECT_REQUIRED') {
      return NextResponse.json({ 
        error: 'Reautenticação necessária', 
        reconnect_required: true 
      }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
  