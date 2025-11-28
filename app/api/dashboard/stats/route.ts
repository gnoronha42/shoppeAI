import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopStats } from '@/lib/shopee-stats';

export const dynamic = 'force-dynamic'; // Garante que não cacheie

export async function GET() {
  try {
    // 1. Buscar todas as integrações Shopee (limitado a 3 para performance, conforme solicitado)
    const integrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      take: 3,
    });

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        totalSellers: 0,
        totalGmv: 0,
        totalPedidos: 0,
        ticketMedio: 0,
        activeStores: [],
      });
    }

    // 2. Calcular estatísticas para cada loja em paralelo
    const statsPromises = integrations.map(async (integration) => {
      try {
        return await getShopStats(integration);
      } catch (e) {
        console.error(`Erro ao buscar stats para loja ${integration.shop_id}:`, e);
        return null;
      }
    });

    const results = await Promise.all(statsPromises);
    const validResults = results.filter((r) => r !== null) as any[];

    // 3. Agregar dados
    const totalSellers = validResults.length;
    const totalGmv = validResults.reduce((acc, curr) => acc + curr.gmv, 0);
    const totalPedidos = validResults.reduce((acc, curr) => acc + curr.orders, 0);
    const ticketMedio = totalPedidos > 0 ? totalGmv / totalPedidos : 0;

    // 4. Retornar dados agregados e lista de lojas ativas
    return NextResponse.json({
      totalSellers,
      totalGmv,
      totalPedidos,
      ticketMedio,
      activeStores: validResults.map(r => ({
        name: r.shopName,
        gmv: r.gmv,
        orders: r.orders
      })),
    });

  } catch (err: any) {
    console.error('Erro no dashboard stats:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

