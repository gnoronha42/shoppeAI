import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testTimestamp = searchParams.get('timestamp') || Math.floor(Date.now() / 1000).toString();
    
    const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '';
    const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
    const SHOPEE_BASE_URL = process.env.SHOPEE_BASE_URL || '';
    
    console.log(' [DEBUG-SIGNATURE] Configurações:');
    console.log(`   Partner ID: ${SHOPEE_PARTNER_ID}`);
    console.log(`   Partner Key: ${SHOPEE_PARTNER_KEY.substring(0, 10)}...`);
    console.log(`   Base URL: ${SHOPEE_BASE_URL}`);
    console.log(`   Timestamp: ${testTimestamp}`);
    
    // Teste 1: Assinatura para auth_partner (OAuth)
    const authPath = '/api/v2/shop/auth_partner';
    const authBaseString = `${SHOPEE_PARTNER_ID}${authPath}${testTimestamp}`;
    const authSign = crypto.createHmac('sha256', SHOPEE_PARTNER_KEY).update(authBaseString).digest('hex');
    
   
    
    // Teste 2: Assinatura para token/get
    const tokenPath = '/api/v2/auth/token/get';
    const tokenBaseString = `${SHOPEE_PARTNER_ID}${tokenPath}${testTimestamp}`;
    const tokenSign = crypto.createHmac('sha256', SHOPEE_PARTNER_KEY).update(tokenBaseString).digest('hex');
    
 
    
    // Teste 3: Assinatura para endpoint público
    const publicPath = '/api/v2/public/get_shops_by_partner';
    const publicBaseString = `${SHOPEE_PARTNER_ID}${publicPath}${testTimestamp}`;
    const publicSign = crypto.createHmac('sha256', SHOPEE_PARTNER_KEY).update(publicBaseString).digest('hex');
    
 
    
    // Teste 4: Verificar se a Partner Key está correta
    const keyTests = {
      original_key: SHOPEE_PARTNER_KEY,
      key_length: SHOPEE_PARTNER_KEY.length,
      starts_with_shpk: SHOPEE_PARTNER_KEY.startsWith('shpk'),
      key_without_prefix: SHOPEE_PARTNER_KEY.startsWith('shpk') ? SHOPEE_PARTNER_KEY.substring(4) : SHOPEE_PARTNER_KEY
    };
    
    // Teste com chave sem prefixo (caso seja necessário)
    const keyWithoutPrefix = keyTests.key_without_prefix;
    const authSignNoPrefix = crypto.createHmac('sha256', keyWithoutPrefix).update(authBaseString).digest('hex');
    
    console.log(' [DEBUG-SIGNATURE] Teste sem prefixo:');
    console.log(`   Key sem prefixo: ${keyWithoutPrefix.substring(0, 10)}...`);
    console.log(`   Signature sem prefixo: ${authSignNoPrefix}`);
    
    // Gerar URL completa para teste
    const redirect = encodeURIComponent(process.env.SHOPEE_REDIRECT_URL + '?hint_client_id=test');
    const state = encodeURIComponent(JSON.stringify({ test: true }));
    
    const testUrl = `${SHOPEE_BASE_URL}${authPath}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${testTimestamp}&sign=${authSign}&redirect=${redirect}&state=${state}`;
    const testUrlNoPrefix = `${SHOPEE_BASE_URL}${authPath}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${testTimestamp}&sign=${authSignNoPrefix}&redirect=${redirect}&state=${state}`;
    
    return NextResponse.json({
      success: true,
      timestamp: testTimestamp,
      config: {
        partner_id: SHOPEE_PARTNER_ID,
        partner_key_prefix: SHOPEE_PARTNER_KEY.substring(0, 10) + '...',
        base_url: SHOPEE_BASE_URL
      },
      signatures: {
        auth_partner: {
          path: authPath,
          base_string: authBaseString,
          signature: authSign,
          signature_no_prefix: authSignNoPrefix
        },
        token_get: {
          path: tokenPath,
          base_string: tokenBaseString,
          signature: tokenSign
        },
        public_endpoint: {
          path: publicPath,
          base_string: publicBaseString,
          signature: publicSign
        }
      },
      key_analysis: keyTests,
      test_urls: {
        with_prefix: testUrl,
        without_prefix: testUrlNoPrefix
      },
      recommendations: [
        'Teste ambas as URLs (com e sem prefixo) no navegador',
        'Verifique se o timestamp está sincronizado com o servidor Shopee',
        'Confirme se a Partner Key está correta no painel da Shopee'
      ]
    });
    
  } catch (err: any) {
    console.error(' [DEBUG-SIGNATURE] Erro:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno'
    }, { status: 500 });
  }
}
