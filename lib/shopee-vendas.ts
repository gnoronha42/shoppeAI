// Status pagos conforme painel 
export const PEDIDOS_PAGOS_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED', 'TO_CONFIRM_RECEIVE', 'TO_SHIP', 'TO_CONFIRM_DELIVER', 'READY_TO_PICKUP', 'TO_RETURN', 'CANCELLED'];

export const PEDIDOS_NAO_PAGOS_STATUSES = ['UNPAID', 'CANCELLED', 'TO_RETURN', 'REFUND'];

// URL do serviço de análise (Render ou Local)
// Prioriza variável de ambiente de serviço interno, fallback para pública ou localhost
const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL || 'http://localhost:3001';

/**
 * Delega o cálculo pesado para o microserviço no Render.
 * Isso evita timeout na Vercel Serverless Functions.
 */
export async function calcularPedidosPagos30Dias(
  access_token: string,
  shop_id: string,
  timeFrom?: number,
  timeTo?: number
): Promise<{
  totalVendas: number;
  totalPedidos: number;
  pedidosProcessados: number;
  statusBreakdown: Record<string, number>;
  periodo: { inicio: string; fim: string };
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
}> {
  console.log(`[PROXY] Delegando cálculo de vendas para microserviço: ${ANALYSIS_SERVICE_URL}`);
  
  try {
    const response = await fetch(`${ANALYSIS_SERVICE_URL}/shopee/vendas-reais`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token,
        shop_id,
        timeFrom,
        timeTo
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Microserviço retornou erro ${response.status}: ${errorText}`);
    }

    const json = await response.json();

    if (!json.success || !json.data) {
      throw new Error('Microserviço retornou formato inválido');
    }

    return json.data;

  } catch (error: any) {
    console.error('[PROXY] Falha ao contatar microserviço:', error.message);
    // Em caso de falha crítica do microserviço, poderíamos ter um fallback local, 
    // mas por enquanto vamos estourar o erro pois a Vercel não aguenta o fallback de qualquer jeito.
    throw error;
  }
}
