import { inngest } from './client';
import { calcularPedidosPagos30Dias } from '@/lib/shopee-vendas';
import prisma from '@/lib/prisma';

export const processarVendasReais = inngest.createFunction(
  { id: 'processar-vendas-reais' },
  { event: 'vendas/processar' },
  async ({ event, step }) => {
    const { access_token, shop_id, timeFrom, timeTo, jobId } = event.data;

    // 1. Criar registro inicial do job (se ainda não existir)
    await step.run('criar-registro-job', async () => {
      try {
        await prisma.jobResult.create({
          data: {
            jobId,
            status: 'processing'
          }
        });
      } catch (e) {
        // Ignorar erro se já existir (idempotência)
        console.log('Job já registrado ou erro ao criar:', e);
      }
    });

    try {
      // 2. Processar vendas
      const resultado = await step.run('calcular-vendas', async () => {
        console.log(`[Inngest] Iniciando processamento de vendas para job ${jobId}`);
        return await calcularPedidosPagos30Dias(
          access_token,
          shop_id,
          timeFrom,
          timeTo
        );
      });

      // 3. Salvar sucesso
      await step.run('salvar-sucesso', async () => {
        await prisma.jobResult.update({
          where: { jobId },
          data: {
            status: 'completed',
            result: resultado as any // Prisma JSON type
          }
        });
      });

      return { success: true, jobId };

    } catch (error: any) {
      // 4. Salvar erro
      await step.run('salvar-erro', async () => {
        await prisma.jobResult.update({
          where: { jobId },
          data: {
            status: 'failed',
            error: error.message || 'Erro desconhecido'
          }
        });
      });
      throw error;
    }
  }
);
