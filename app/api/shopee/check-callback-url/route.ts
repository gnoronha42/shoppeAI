import { NextResponse } from 'next/server';
import { getShopeeEnv } from '@/lib/shopee';

export const dynamic = 'force-dynamic';

/**
 * 🔍 ENDPOINT DE VERIFICAÇÃO - Verifica configuração da URL de callback
 * 
 * Ajuda a diagnosticar problemas com URLs de callback e refresh tokens
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIntegration = searchParams.get('check_integration') === 'true';
    
    const env = getShopeeEnv();
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;
    
    // URLs possíveis
    const configuredRedirectUrl = env.redirectUrl || '';
    const dynamicCallbackUrl = `${origin}/api/shopee/callback`;
    
    const result = {
      current_request: {
        origin: origin,
        full_url: request.url,
        callback_url_dynamic: dynamicCallbackUrl,
      },
      environment: {
        configured_redirect_url: configuredRedirectUrl,
        using_configured: !!configuredRedirectUrl,
        using_dynamic: !configuredRedirectUrl,
        shopee_base_url: process.env.SHOPEE_BASE_URL,
        partner_id: process.env.SHOPEE_PARTNER_ID,
      },
      recommendations: [] as string[],
      warnings: [] as string[],
    };

    // Verificações
    if (!configuredRedirectUrl) {
      result.warnings.push('⚠️ SHOPEE_REDIRECT_URL não está configurada no .env');
      result.recommendations.push('Configure SHOPEE_REDIRECT_URL no .env para garantir consistência');
    }

    if (origin.includes('ngrok')) {
      result.warnings.push('⚠️ Você está usando ngrok - URLs podem mudar');
      result.recommendations.push('Registre a URL do callback no painel da Shopee Partner');
      result.recommendations.push('URL a registrar: ' + dynamicCallbackUrl);
    }

    if (configuredRedirectUrl && !configuredRedirectUrl.includes(origin)) {
      result.warnings.push('⚠️ URL configurada não corresponde à URL atual');
      result.warnings.push(`Configurada: ${configuredRedirectUrl}`);
      result.warnings.push(`Atual: ${dynamicCallbackUrl}`);
      result.recommendations.push('Atualize SHOPEE_REDIRECT_URL no .env para corresponder à URL atual');
    }

    // Verificar integração se solicitado
    if (checkIntegration) {
      const clientId = searchParams.get('client_id');
      if (clientId) {
        try {
          const { PrismaClient } = await import('@prisma/client');
          const prisma = new PrismaClient();
          
          const integration = await prisma.client_integrations.findUnique({
            where: {
              client_id_provider: {
                client_id: clientId,
                provider: 'shopee'
              }
            },
            include: {
              clients: { select: { id: true, name: true } }
            }
          });

          if (integration) {
            (result as any).integration = {
              client_name: integration.clients?.name,
              shop_id: integration.shop_id,
              has_access_token: !!integration.access_token,
              has_refresh_token: !!integration.refresh_token,
              token_expiry: integration.token_expiry,
              updated_at: integration.updated_at,
            };

            if (integration.token_expiry) {
              const expiry = new Date(integration.token_expiry);
              const now = new Date();
              const hoursUntilExpiry = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60));
              
              (result as any).integration.hours_until_expiry = hoursUntilExpiry;
              
              if (hoursUntilExpiry < 0) {
                result.warnings.push('⚠️ Token de acesso expirado');
                result.recommendations.push('Reconecte a conta para obter novos tokens');
              } else if (hoursUntilExpiry < 6) {
                result.warnings.push(`⚠️ Token expira em ${hoursUntilExpiry} horas`);
                result.recommendations.push('O cron job deve renovar automaticamente');
              }
            }
          } else {
            result.warnings.push('⚠️ Integração não encontrada para este client_id');
          }
        } catch (err: any) {
          result.warnings.push(`Erro ao buscar integração: ${err.message}`);
        }
      }
    }

    // Recomendações gerais
    if (result.warnings.length === 0) {
      result.recommendations.push('✅ Configuração parece correta');
      result.recommendations.push('Se o refresh token ainda falhar, verifique:');
      result.recommendations.push('1. URL do callback está registrada no painel da Shopee Partner');
      result.recommendations.push('2. Aguarde alguns minutos após reconexão antes de testar refresh');
      result.recommendations.push('3. Verifique se está usando o ambiente correto (live vs sandbox)');
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro ao verificar configuração'
    }, { status: 500 });
  }
}

