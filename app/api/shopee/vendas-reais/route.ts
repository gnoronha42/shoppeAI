import { NextRequest, NextResponse } from 'next/server';
import { calcularPedidosPagos30Dias, PEDIDOS_PAGOS_STATUSES, PEDIDOS_NAO_PAGOS_STATUSES } from '@/lib/shopee-vendas';

export const runtime = 'edge';
// export const maxDuration = 60; // Edge tem limite fixo (geralmente 30s), maxDuration é ignorado ou causa erro
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');
    const timeFrom = searchParams.get('time_from') ? Number(searchParams.get('time_from')) : undefined;
    const timeTo = searchParams.get('time_to') ? Number(searchParams.get('time_to')) : undefined;

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(` [VENDAS-REAIS] Buscando pedidos pagos`);
    console.log(` Período: ${timeFrom ? 'Customizado' : 'Últimos 30 dias'}`);
    if (timeFrom && timeTo) {
      console.log(` De: ${new Date(timeFrom * 1000).toISOString().split('T')[0]} até ${new Date(timeTo * 1000).toISOString().split('T')[0]}`);
    }
    console.log(`${'='.repeat(80)}`);

    const resultado = await calcularPedidosPagos30Dias(access_token, shop_id, timeFrom, timeTo);

    console.log(`\n${'='.repeat(80)}`);
    console.log(` [VENDAS-REAIS] RESULTADO FINAL - PEDIDOS PAGOS:`);
    console.log(`    Vendas de Pedidos Pagos: R$ ${resultado.totalVendas.toFixed(2)}`);


    const canceladosNoPeriodo = resultado.statusBreakdown['CANCELLED'] || 0;

    console.log(`    Pedidos Pagos (Sistema): ${resultado.totalPedidos}`);
    console.log(`    Cancelados (Total Encontrado): ${canceladosNoPeriodo}`);
    console.log(`    Total Processados: ${resultado.pedidosProcessados}`);
    console.log(`    Período: ${resultado.periodo.inicio} até ${resultado.periodo.fim}`);
    console.log(`    Status de Pedidos Pagos: ${PEDIDOS_PAGOS_STATUSES.join(', ')}`);
    console.log(`    Status Não Pagos: ${PEDIDOS_NAO_PAGOS_STATUSES.join(', ')}`);
    console.log(`${'='.repeat(80)}\n`);

    return NextResponse.json({
      success: true,
      data: {
        vendas: resultado.totalVendas,
        pedidos: resultado.totalPedidos,
        pedidosProcessados: resultado.pedidosProcessados,
        statusBreakdown: resultado.statusBreakdown,
        periodo: resultado.periodo,
        topProducts: resultado.topProducts,
        criterios: {
          statusPedidosPagos: PEDIDOS_PAGOS_STATUSES,
          statusNaoPagos: PEDIDOS_NAO_PAGOS_STATUSES,
          metodo: 'get_order_list + paginacao_completa + filtro status painel + paid_time/create_time + soma paid_price/total_amount',
          periodo: 'ultimos_30_dias'
        }
      }
    });

  } catch (error) {
    console.error(' [VENDAS-REAIS] Erro geral:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
