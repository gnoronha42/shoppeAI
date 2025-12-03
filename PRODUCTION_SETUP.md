# 🚀 Configuração de Produção - SellerIA

Este documento contém as configurações necessárias para rodar a aplicação em produção.

## 🌐 URL de Produção

**URL Principal:** `https://www.selleria.com.br`

## ⚙️ Configurações Necessárias

### 1. Variáveis de Ambiente (.env)

Certifique-se de que seu arquivo `.env` contém:

```env
# URL de Produção
NEXT_PUBLIC_APP_URL=https://www.selleria.com.br
PRODUCTION_URL=https://www.selleria.com.br

# Shopee API (Live/Produção)
SHOPEE_BASE_URL=https://partner.shopeemobile.com
SHOPEE_PARTNER_ID=2013669
SHOPEE_PARTNER_KEY=<sua-live-api-partner-key>
SHOPEE_REDIRECT_URL=https://www.selleria.com.br/api/shopee/callback
```

### 2. GitHub Actions Secret

Configure o secret `APPURL` no GitHub:

1. Acesse: `https://github.com/gnoronha42/shoppeAI/settings/secrets/actions`
2. Clique em **"New repository secret"**
3. **Name:** `APPURL`
4. **Value:** `https://www.selleria.com.br` (sem barra no final)
5. Clique em **"Add secret"**

### 3. Verificar Workflow do Cron

O workflow está configurado para executar a cada 3 horas:
- **Arquivo:** `.github/workflows/refresh-shopee-tokens.yml`
- **Frequência:** `0 */3 * * *` (a cada 3 horas)
- **Endpoint:** `https://www.selleria.com.br/api/shopee/cron-refresh-tokens`

## ✅ Testes de Produção

### Testar Endpoint do Cron

```bash
curl -X GET "https://www.selleria.com.br/api/shopee/cron-refresh-tokens" | jq '.'
```

### Testar Diagnóstico de Tokens

```bash
curl -X GET "https://www.selleria.com.br/api/shopee/diagnose-tokens" | jq '.summary'
```

### Testar Configuração Completa

```bash
curl -X GET "https://www.selleria.com.br/api/shopee/test-cron" | jq '.summary'
```

## 🔍 Verificar Status do Cron

1. Acesse: `https://github.com/gnoronha42/shoppeAI/actions`
2. Procure pelo workflow: **"🔄 Refresh Shopee Tokens"**
3. Verifique se está executando corretamente
4. Clique em uma execução para ver os logs

## 📝 Checklist de Produção

- [ ] Variável `NEXT_PUBLIC_APP_URL` configurada com `https://www.selleria.com.br`
- [ ] Secret `APPURL` configurado no GitHub Actions
- [ ] `SHOPEE_REDIRECT_URL` aponta para `https://www.selleria.com.br/api/shopee/callback`
- [ ] Workflow do GitHub Actions está ativo
- [ ] Endpoint do cron responde corretamente
- [ ] Tokens estão sendo renovados automaticamente

## 🚨 Troubleshooting

### Problema: Cron não executa

**Solução:**
1. Verifique se o secret `APPURL` está configurado
2. Verifique se o workflow está ativo (não pausado)
3. Execute manualmente via "Run workflow" no GitHub

### Problema: Endpoint retorna 404

**Solução:**
1. Verifique se a aplicação está rodando em produção
2. Verifique se a URL está correta (sem barra no final)
3. Teste o endpoint manualmente com curl

### Problema: Tokens não são renovados

**Solução:**
1. Execute o diagnóstico: `GET /api/shopee/diagnose-tokens`
2. Verifique se há integrações com `refresh_token` válido
3. Verifique os logs do GitHub Actions para erros

## 📞 Suporte

Se encontrar problemas, verifique:
- Logs do servidor de produção
- Logs do GitHub Actions
- Status dos tokens via `/api/shopee/diagnose-tokens`

