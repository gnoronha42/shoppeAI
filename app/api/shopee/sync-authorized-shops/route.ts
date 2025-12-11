import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch} from '@/lib/shopee';

/**
 * 🔄 SINCRONIZAÇÃO MESTRA - Sincroniza lojas autorizadas com a Shopee
 * 
 * Endpoint: /api/shopee/sync-authorized-shops
 * Documentação: https://open.shopee.com/documents/v2/v2.public.get_shops_by_partner?module=104&type=1
 * 
 * Função:
 * 1. Busca todas as lojas autorizadas na Shopee para este Partner ID
 * 2. Compara com o banco de dados local
 * 3. Identifica lojas desautorizadas ou novas
 */
export async function GET(request: Request) {
  try {
    
    // 1. Buscar lista de lojas autorizadas na Shopee
    // Nota: Este endpoint é público e usa autenticação de parceiro, não de loja
    const response = await shopeeFetch<any>({
      path: '/api/v2/public/get_shops_by_partner',
      access_token: '', // Não precisa de access token de loja
      shop_id: 0, // Não precisa de shop_id
      query: {
        page_size: 100,
        page_no: 1
      }
    });

    if (!response) {
      throw new Error('Resposta vazia da Shopee');
    }

    // A estrutura pode variar: response.response.authed_shops ou response.authed_shop_list
    const shopeeShops = response.response?.authed_shop_list || response.authed_shop_list || [];
    console.log(`Shopee retornou ${shopeeShops.length} lojas autorizadas`);

    // 2. Buscar integrações locais
    const localIntegrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      include: { clients: true }
    });
    console.log(` Banco local tem ${localIntegrations.length} integrações`);

    const results = {
      total_shopee: shopeeShops.length,
      total_local: localIntegrations.length,
      synced: 0,
      missing_local: [] as any[],
      revoked_shopee: [] as any[]
    };

    // 3. Cruzar dados
    const shopeeShopIds = new Set(shopeeShops.map((s: any) => String(s.shop_id)));
    const localShopIds = new Set(localIntegrations.map(i => i.shop_id));

    // Verificar lojas no banco que não estão mais na Shopee (Revogadas)
    for (const local of localIntegrations) {
      if (local.shop_id && !shopeeShopIds.has(local.shop_id)) {
        console.log(` Loja ${local.shop_id} (${local.clients?.name}) não está mais autorizada na Shopee`);
        results.revoked_shopee.push({
          shop_id: local.shop_id,
          client_name: local.clients?.name,
          integration_id: local.id
        });
        
        // Opcional: Marcar como inativa no banco
        // await prisma.client_integrations.delete({ where: { id: local.id } });
      } else {
        results.synced++;
      }
    }

    // Verificar lojas na Shopee que não estão no banco (Novas ou perdidas)
    for (const shopeeShop of shopeeShops) {
      const shopId = String(shopeeShop.shop_id);
      if (!localShopIds.has(shopId)) {
        console.log(` Loja ${shopId} está autorizada na Shopee mas não está no banco local`);
        results.missing_local.push({
          shop_id: shopId,
          region: shopeeShop.region,
          auth_time: new Date(shopeeShop.auth_time * 1000).toISOString()
        });
      }
    }

    console.log('Sincronização finalizada');
    return NextResponse.json({ success: true, results });

  } catch (err: any) {
    console.error(' Erro na sincronização mestra:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
