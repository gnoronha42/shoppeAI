import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

export async function POST(request: Request) {
  try {
    const { client_id, shop_id } = await request.json();

    if (!client_id || !shop_id) {
      return NextResponse.json({ 
        error: 'client_id e shop_id são obrigatórios' 
      }, { status: 400 });
    }

    console.log(`🔄 [RECOVER-TOKENS] Tentando recuperar tokens para client_id: ${client_id}, shop_id: ${shop_id}`);

    // 1. Verificar se a loja ainda está autorizada na Shopee
    try {
      const authorizedShops = await shopeeFetch<any>({ 
        path: '/api/v2/public/get_shops_by_partner',
        // Não precisa de access_token nem shop_id para endpoints públicos
        access_token: '',
        shop_id: '',
      });

      const shopList = authorizedShops?.response?.authed_shop_list || 
                      authorizedShops?.authed_shop_list || [];
      
      const targetShop = shopList.find((shop: any) => shop.shop_id.toString() === shop_id.toString());
      
      if (!targetShop) {
        return NextResponse.json({
          success: false,
          error: 'Loja não encontrada na lista de lojas autorizadas da Shopee',
          message: 'A loja pode ter sido desautorizada. É necessário reautenticar via OAuth.',
          available_shops: shopList.map((s: any) => ({
            shop_id: s.shop_id,
            region: s.region,
            auth_time: s.auth_time
          }))
        });
      }

      console.log(`✅ [RECOVER-TOKENS] Loja encontrada na Shopee:`, targetShop);

    } catch (e: any) {
      console.error(`❌ [RECOVER-TOKENS] Erro ao verificar lojas autorizadas:`, e?.message);
      return NextResponse.json({
        success: false,
        error: 'Falha ao verificar autorização na Shopee',
        message: 'Não foi possível verificar se a loja ainda está autorizada. Tente reautenticar via OAuth.',
        details: e?.message
      });
    }

    // 2. Verificar integração local
    const integration = await prisma.client_integrations.findUnique({
      where: { 
        client_id_provider: { 
          client_id: client_id, 
          provider: 'shopee' 
        } 
      },
    });

    if (!integration) {
      return NextResponse.json({
        success: false,
        error: 'Integração não encontrada no banco local',
        message: 'É necessário reautenticar a conta via OAuth.'
      });
    }

    // 3. Se chegou até aqui, a loja está autorizada na Shopee mas os tokens locais foram limpos
    return NextResponse.json({
      success: false,
      error: 'Tokens locais foram limpos pelo sistema',
      message: 'A loja ainda está autorizada na Shopee, mas os tokens locais foram removidos. É necessário reautenticar via OAuth para obter novos tokens.',
      integration_status: {
        has_access_token: !!integration.access_token,
        has_refresh_token: !!integration.refresh_token,
        token_expiry: integration.token_expiry,
        last_updated: integration.updated_at
      },
      next_steps: [
        '1. Acesse a página de integrações da sua aplicação',
        '2. Clique em "Conectar com Shopee" novamente',
        '3. Complete o fluxo OAuth da Shopee',
        '4. Os novos tokens serão salvos automaticamente'
      ]
    });

  } catch (err: any) {
    console.error('❌ [RECOVER-TOKENS] Erro:', err);
    return NextResponse.json({ 
      error: err.message || 'Erro interno',
      success: false
    }, { status: 500 });
  }
}
