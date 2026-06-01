import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { v4 as uuidv4 } from 'uuid';
import { calcularPedidosPagos30Dias, PEDIDOS_PAGOS_STATUSES, PEDIDOS_NAO_PAGOS_STATUSES } from '@/lib/shopee-vendas';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');
    const timeFrom = searchParams.get('time_from') ? Number(searchParams.get('time_from')) : undefined;
    const timeTo = searchParams.get('time_to') ? Number(searchParams.get('time_to')) : undefined;
    const jobId = searchParams.get('job_id'); 
    const forceSync = searchParams.get('force_sync') === 'true'; 

    // 1. CONSULTA DE STATUS DO JOB
    if (jobId) {
      const job = await prisma.jobResult.findUnique({
        where: { jobId }
      });

      if (!job) {
        // Job ainda não criado no banco (pode estar na fila do Inngest ainda)
        return NextResponse.json({
          status: 'processing',
          jobId,
          message: 'Job na fila ou processando.'
        });
      }

      if (job.status === 'completed' && job.result) {
        return NextResponse.json({
          success: true,
          status: 'completed',
          data: job.result
        });
      }

      if (job.status === 'failed') {
        return NextResponse.json({
          success: false,
          status: 'failed',
          error: job.error
        });
      }

      return NextResponse.json({
        status: 'processing',
        jobId,
        message: 'Job em processamento.'
      });
    }

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    // 2. MODO SÍNCRONO (force_sync=true)
    // Útil para dashboard rápido ou debug
    if (forceSync) {
    console.log(`\n${'='.repeat(80)}`);
      console.log(` [VENDAS-REAIS] Executando em modo SÍNCRONO (force_sync=true)`);

    const resultado = await calcularPedidosPagos30Dias(access_token, shop_id, timeFrom, timeTo);

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
            metodo: 'SÍNCRONO',
            periodo: 'custom'
          }
        }
      });
    }

    // 3. MODO ASSÍNCRONO (PADRÃO)
    const newJobId = uuidv4();

    console.log(`\n${'='.repeat(80)}`);
    console.log(` [VENDAS-REAIS] Disparando job Inngest`);
    console.log(` Job ID: ${newJobId}`);
    
    // Disparar evento Inngest
    await inngest.send({
      name: 'vendas/processar',
      data: {
        access_token,
        shop_id,
        timeFrom,
        timeTo,
        jobId: newJobId,
      },
    });

    // Retornar imediatamente com jobId para polling
    return NextResponse.json({
      success: true,
      jobId: newJobId,
      status: 'processing',
      message: 'Processamento iniciado em background.',
      pollUrl: `/api/shopee/vendas-reais?job_id=${newJobId}`,
    }, { status: 202 });

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

import { guardShopeeRoute } from '@/lib/shopee-route-guard';
