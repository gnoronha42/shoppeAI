import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refreshAccessToken } from '@/lib/shopee';

export const dynamic = 'force-dynamic';

/**
 * 🧪 ENDPOINT DE TESTE - Testa refresh de token diretamente
 * 
 * Permite testar se um refresh_token está funcionando corretamente
 */
export async function POST(request: Request) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { refresh_token, client_id } = await request.json();

    if (!refresh_token && !client_id) {
      return NextResponse.json({ 
        error: 'Forneça refresh_token OU client_id' 
      }, { status: 400 });
    }

    let tokenToTest = refresh_token;
    let shopIdToUse: string | undefined;

    // Se forneceu client_id, buscar refresh_token do banco
    if (!tokenToTest && client_id) {
      const integration = await prisma.client_integrations.findUnique({
        where: { 
          client_id_provider: { 
            client_id: client_id, 
            provider: 'shopee' 
          } 
        },
        include: {
          clients: { select: { id: true, name: true } }
        }
      });

      if (!integration) {
        return NextResponse.json({ 
          error: 'Integração não encontrada para este client_id' 
        }, { status: 404 });
      }

      if (!integration.refresh_token) {
        return NextResponse.json({ 
          error: 'Esta integração não tem refresh_token salvo' 
        }, { status: 400 });
      }

      tokenToTest = integration.refresh_token;
      shopIdToUse = integration.shop_id || undefined;

    
    }

    if (!tokenToTest) {
      return NextResponse.json({ 
        error: 'refresh_token não encontrado' 
      }, { status: 400 });
    }

   
    // Tentar fazer refresh
    try {
      const refreshed = await refreshAccessToken({ 
        refresh_token: tokenToTest,
        shop_id: shopIdToUse
      });

      console.log(` [TEST-REFRESH] Refresh bem-sucedido!`, {
        has_access_token: !!refreshed.access_token,
        has_refresh_token: !!refreshed.refresh_token,
        access_token_length: refreshed.access_token?.length || 0,
        refresh_token_length: refreshed.refresh_token?.length || 0,
        expire_in_seconds: refreshed.expire_in,
        expire_in_hours: refreshed.expire_in ? Math.round(refreshed.expire_in / 3600) : 'N/A'
      });

      return NextResponse.json({
        success: true,
        message: 'Refresh token está funcionando corretamente!',
        result: {
          has_access_token: !!refreshed.access_token,
          has_refresh_token: !!refreshed.refresh_token,
          access_token_length: refreshed.access_token?.length || 0,
          refresh_token_length: refreshed.refresh_token?.length || 0,
          expire_in_seconds: refreshed.expire_in,
          expire_in_hours: refreshed.expire_in ? Math.round(refreshed.expire_in / 3600) : 'N/A',
          new_token_expiry: new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000).toISOString()
        },
        test_details: {
          original_token_length: tokenToTest.length,
          environment: process.env.SHOPEE_BASE_URL,
          partner_id: process.env.SHOPEE_PARTNER_ID
        }
      });

    } catch (error: any) {
      console.error(` [TEST-REFRESH] Erro ao fazer refresh:`, {
        error: error.message,
        code: error.code,
        status: error.status,
        response: error.response
      });

      return NextResponse.json({
        success: false,
        error: error.message || 'Erro desconhecido',
        code: error.code,
        status: error.status,
        details: {
          original_token_length: tokenToTest.length,
          environment: process.env.SHOPEE_BASE_URL,
          partner_id: process.env.SHOPEE_PARTNER_ID,
          error_type: error.code === 'REFRESH_TOKEN_EXPIRED' ? 'Token expirado' :
                     error.status === 404 ? 'Token não encontrado (404)' :
                     error.status === 403 ? 'Token inválido (403)' :
                     'Erro desconhecido'
        },
        recommendations: error.code === 'REFRESH_TOKEN_EXPIRED' ? [
          'O refresh_token expirou após ~30 dias',
          'Reconecte a conta via OAuth'
        ] : error.status === 404 ? [
          'O refresh_token não foi encontrado pela Shopee',
          'Verifique se o token está completo (não truncado)',
          'Verifique se está usando o ambiente correto (live vs sandbox)',
          'Tente reconectar a conta'
        ] : [
          'Verifique os logs do servidor para mais detalhes',
          'Confirme se está usando o ambiente correto'
        ]
      }, { status: 400 });
    }

  } catch (err: any) {
    console.error(' [TEST-REFRESH] Erro geral:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      message: 'Falha no teste de refresh token'
    }, { status: 500 });
  }
}

import { guardShopeeRoute } from '@/lib/shopee-route-guard';
