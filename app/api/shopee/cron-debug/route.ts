import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 🔍 ENDPOINT DE DIAGNÓSTICO RÁPIDO DO CRON
 * 
 * Este endpoint mostra exatamente o que o cron job verifica
 * e por que encontra ou não encontra integrações para renovar
 */
export async function GET() {
  try {
    const sixHoursFromNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
    
    // Buscar TODAS as integrações Shopee
    const allIntegrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      include: {
        clients: { select: { id: true, name: true } }
      }
    });

    // Separar por status
    const withRefreshToken = allIntegrations.filter(i => i.refresh_token);
    const withoutRefreshToken = allIntegrations.filter(i => !i.refresh_token);
    
    // Das que têm refresh_token, quais precisam de refresh?
    const needsRefresh = withRefreshToken.filter(i => {
      if (!i.token_expiry) return true; // Sem data = precisa renovar
      return new Date(i.token_expiry) <= sixHoursFromNow;
    });

    const validMoreThan6h = withRefreshToken.filter(i => {
      if (!i.token_expiry) return false;
      return new Date(i.token_expiry) > sixHoursFromNow;
    });

    const expired = allIntegrations.filter(i => {
      if (!i.token_expiry) return true;
      return new Date(i.token_expiry) <= new Date();
    });

    // Detalhes de cada integração
    const details = allIntegrations.map(i => {
      const hoursUntilExpiry = i.token_expiry ? 
        Math.round((new Date(i.token_expiry).getTime() - Date.now()) / (1000 * 60 * 60)) : 
        null;
      
      const needsRefreshCheck = !i.token_expiry || new Date(i.token_expiry) <= sixHoursFromNow;
      
      return {
        client_id: i.client_id,
        client_name: i.clients?.name || 'Desconhecido',
        shop_id: i.shop_id,
        has_refresh_token: !!i.refresh_token,
        has_access_token: !!i.access_token,
        token_expiry: i.token_expiry,
        hours_until_expiry: hoursUntilExpiry,
        is_expired: i.token_expiry ? new Date(i.token_expiry) <= new Date() : true,
        needs_refresh: needsRefreshCheck && !!i.refresh_token,
        reason: !i.refresh_token ? 'Sem refresh_token - precisa reconectar' :
                !i.token_expiry ? 'Sem data de expiração - precisa renovar' :
                hoursUntilExpiry !== null && hoursUntilExpiry > 6 ? `Token válido por mais ${hoursUntilExpiry}h - não precisa renovar agora` :
                hoursUntilExpiry !== null && hoursUntilExpiry <= 6 && hoursUntilExpiry > 0 ? `Token expira em ${hoursUntilExpiry}h - PRECISA RENOVAR` :
                hoursUntilExpiry !== null && hoursUntilExpiry <= 0 ? 'Token expirado - PRECISA RENOVAR' :
                'Status desconhecido'
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_integrations: allIntegrations.length,
        with_refresh_token: withRefreshToken.length,
        without_refresh_token: withoutRefreshToken.length,
        needs_refresh: needsRefresh.length,
        valid_more_than_6h: validMoreThan6h.length,
        expired: expired.length
      },
      cron_will_find: needsRefresh.length,
      cron_will_skip: validMoreThan6h.length,
      cron_will_error: withoutRefreshToken.length,
      details,
      explanation: {
        why_total_checked_is_zero: needsRefresh.length === 0 ? 
          (allIntegrations.length === 0 ? 
            'Não há integrações Shopee no banco de dados' :
            withoutRefreshToken.length === allIntegrations.length ?
              'Todas as integrações não têm refresh_token - precisam ser reconectadas' :
              validMoreThan6h.length > 0 ?
                `Todas as integrações com refresh_token têm tokens válidos por mais de 6 horas (${validMoreThan6h.length} integração(ões))` :
                'Status desconhecido - verifique os detalhes'
          ) :
          `O cron DEVERIA encontrar ${needsRefresh.length} integração(ões) para renovar`,
        next_steps: needsRefresh.length === 0 && allIntegrations.length > 0 ?
          (withoutRefreshToken.length > 0 ?
            ['1. Reconecte as integrações que não têm refresh_token', '2. Aguarde os tokens expirarem ou execute o cron manualmente'] :
            ['1. Aguarde os tokens expirarem (quando faltar <= 6 horas)', '2. Ou reconecte as contas para forçar renovação']
          ) :
          needsRefresh.length > 0 ?
            ['1. Execute o cron manualmente para renovar os tokens', '2. Verifique se o código atualizado está em produção'] :
            ['1. Conecte pelo menos uma integração Shopee', '2. Aguarde o cron executar automaticamente']
      }
    });

  } catch (err: any) {
    console.error('❌ [CRON-DEBUG] Erro:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      message: 'Falha no diagnóstico do cron'
    }, { status: 500 });
  }
}
