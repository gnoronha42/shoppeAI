import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Inngest envia webhooks quando jobs completam
    if (body.event?.name === 'vendas/processar' && body.run?.status === 'completed') {
      const { jobId } = body.run.output;
      
      // Aqui você pode:
      // 1. Armazenar resultado no banco
      // 2. Enviar notificação
      // 3. Atualizar cache
      
      console.log(`[Webhook] Job ${jobId} completado com sucesso`);
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Erro:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';
