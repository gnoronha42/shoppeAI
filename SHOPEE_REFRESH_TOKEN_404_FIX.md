# 🔧 Solução para Erro 404 no Refresh Token da Shopee

## ❌ Problema

O refresh token está retornando erro 404 (`error_not_found`) mesmo após reconexão recente.

## 🔍 Causas Possíveis

### 1. **URL de Callback Não Registrada** (Mais Provável)
A URL de callback usada durante a autenticação **deve estar registrada** no painel da Shopee Partner.

**Sintomas:**
- Token recém-gerado retorna 404 ao tentar refresh
- Erro: `{"error":"error_not_found"}`

**Solução:**
1. Acesse o [Painel da Shopee Partner](https://open.shopee.com/)
2. Vá em **Settings** > **Callback URL**
3. Verifique se a URL está registrada:
   - **Para desenvolvimento (ngrok):** `https://bob-disquieting-unstoutly.ngrok-free.dev/api/shopee/callback`
   - **Para produção:** `https://www.selleria.com.br/api/shopee/callback`
4. Se não estiver, adicione a URL correta
5. Aguarde alguns minutos após registrar
6. Reconecte a conta

### 2. **URL Temporária (ngrok)**
URLs do ngrok mudam e podem causar problemas.

**Sintomas:**
- Funciona localmente mas falha em produção
- Erro 404 após mudança de URL do ngrok

**Solução:**
- Use uma URL estável para produção (`https://www.selleria.com.br`)
- Atualize a URL no painel da Shopee quando mudar
- Configure `SHOPEE_REDIRECT_URL` no `.env`

### 3. **Token Recém-Gerado Precisa de Tempo**
Tokens recém-gerados podem precisar de alguns minutos para ficarem válidos.

**Sintomas:**
- Reconexão bem-sucedida
- Refresh falha imediatamente após reconexão
- Funciona após alguns minutos

**Solução:**
- Aguarde 5-10 minutos após reconexão
- Teste novamente o refresh

### 4. **Assinatura Incorreta**
A assinatura da requisição pode estar incorreta.

**Sintomas:**
- Erro 404 mesmo com token válido
- Logs mostram assinatura diferente

**Solução:**
- Verifique se `SHOPEE_PARTNER_KEY` está correto
- Confirme que a baseString está sendo gerada corretamente
- Verifique logs do servidor para ver a assinatura gerada

## ✅ Checklist de Verificação

- [ ] URL do callback está registrada no painel da Shopee Partner
- [ ] URL do callback corresponde exatamente à usada na autenticação
- [ ] `SHOPEE_REDIRECT_URL` no `.env` está configurada corretamente
- [ ] Aguardou 5-10 minutos após reconexão antes de testar refresh
- [ ] `SHOPEE_PARTNER_KEY` está correto no `.env`
- [ ] Está usando o ambiente correto (live vs sandbox)

## 🧪 Testes

### Testar Refresh Token
```bash
curl -X POST "https://www.selleria.com.br/api/shopee/test-refresh" \
  -H "Content-Type: application/json" \
  -d '{"client_id": "SEU_CLIENT_ID"}'
```

### Verificar Configuração
```bash
curl "https://www.selleria.com.br/api/shopee/check-callback-url?check_integration=true&client_id=SEU_CLIENT_ID"
```

### Diagnosticar Tokens
```bash
curl "https://www.selleria.com.br/api/shopee/diagnose-tokens?client_id=SEU_CLIENT_ID"
```

## 📝 Configuração Recomendada

### Para Desenvolvimento (ngrok)
```env
SHOPEE_REDIRECT_URL=https://bob-disquieting-unstoutly.ngrok-free.dev/api/shopee/callback
```

### Para Produção
```env
SHOPEE_REDIRECT_URL=https://www.selleria.com.br/api/shopee/callback
```

## 🚨 Ação Imediata

1. **Verifique a URL no painel da Shopee:**
   - Acesse: https://open.shopee.com/
   - Vá em Settings > Callback URL
   - Confirme que `https://bob-disquieting-unstoutly.ngrok-free.dev/api/shopee/callback` está registrada

2. **Se não estiver registrada:**
   - Adicione a URL
   - Aguarde 5 minutos
   - Reconecte a conta

3. **Teste novamente:**
   ```bash
   curl -X POST "https://www.selleria.com.br/api/shopee/test-refresh" \
     -H "Content-Type: application/json" \
     -d '{"client_id": "9e79b6af-fa26-4e7e-89c7-9e2cdd05c6fa"}'
   ```

## 💡 Dica Final

**Use uma URL de produção estável** em vez de ngrok para evitar problemas. O ngrok é útil para desenvolvimento, mas URLs que mudam podem causar problemas com tokens da Shopee.

