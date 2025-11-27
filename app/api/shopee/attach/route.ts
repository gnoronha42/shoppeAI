import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { client_id, shop_id, from_client_id } = body || {}

    if (!client_id) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 })
    }

    // Verifica se o cliente destino existe
    const client = await prisma.clients.findUnique({ where: { id: client_id } })
    if (!client) {
      return NextResponse.json({ error: 'Cliente de destino não encontrado' }, { status: 404 })
    }

    // Encontra a integração existente por shop_id ou por client_id origem
    let integration = null as any
    if (shop_id) {
      integration = await prisma.client_integrations.findFirst({
        where: { provider: 'shopee', shop_id: String(shop_id) },
      })
    }
    if (!integration && from_client_id) {
      integration = await prisma.client_integrations.findUnique({
        where: { client_id_provider: { client_id: String(from_client_id), provider: 'shopee' } },
      })
    }

    if (!integration) {
      return NextResponse.json({
        error: 'Integração Shopee não encontrada. Informe shop_id ou from_client_id válido.',
      }, { status: 404 })
    }

    // Atualiza para o cliente destino
    const updated = await prisma.client_integrations.update({
      where: { id: integration.id },
      data: { client_id },
    })

    return NextResponse.json({ success: true, moved: { from: integration.client_id, to: client_id, shop_id: updated.shop_id } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao anexar integração' }, { status: 500 })
  }
}
