# 🧪 Guia de Teste do Cron Job - Refresh de Tokens Shopee

Este guia mostra como testar se o cron job de renovação automática de tokens está funcionando corretamente.

## 📋 Índice

1. [Teste Manual do Endpoint](#1-teste-manual-do-endpoint)
2. [Teste via GitHub Actions](#2-teste-via-github-actions)
3. [Verificar Logs](#3-verificar-logs)
4. [Teste com Dados Reais](#4-teste-com-dados-reais)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Teste Manual do Endpoint

### Teste Local (Servidor Rodando)

```bash
# Testar o endpoint diretamente
curl -X GET "http://localhost:3000/api/shopee/cron-refresh-tokens" | jq '.'
```

### Teste em Produção (via ngrok)

```bash
# Substitua pela sua URL do ngrok
curl -X GET "https://bob-disquieting-unstoutly.ngrok-free.dev/api/shopee/cron-refresh-tokens" | jq '.'
```

### Resposta Esperada

```json
{
  "success": true,
  "message": "Cron job executado com sucesso",
  "summary": {
    "execution_time_ms": 91,
    "execution_time_seconds": 0,
    "timestamp": "2025-12-03T03:32:11.000Z",
    "total_checked": 2,
    "successful_refreshes": 1,
    "failed_refreshes": 0,
    "skipped": 1,
    "errors": [],
    "details": [
      {
        "client_id": "...",
        "client_name": "Nome da Loja",
        "shop_id": "123456789",
        "status": "refreshed",
        "old_expiry": "2025-12-03T04:00:00.000Z",
        "new_expiry": "2025-12-03T08:00:00.000Z",
        "hours_extended": 4
      }
    ]
  }
}
```

---

## 2. Teste via GitHub Actions

### Verificar se o Workflow Está Configurado

1. Acesse: `https://github.com/seu-usuario/shoppeAI/actions`
2. Procure pelo workflow: **"🔄 Refresh Shopee Tokens"**
3. Verifique se está ativo e quando foi executado pela última vez

### Executar Manualmente (Workflow Dispatch)

1. Vá para: `https://github.com/seu-usuario/shoppeAI/actions/workflows/refresh-shopee-tokens.yml`
2. Clique em **"Run workflow"**
3. Selecione a branch `main`
4. Clique em **"Run workflow"**
5. Aguarde a execução e verifique os logs

### Verificar Configuração do Secret

```bash
# Verificar se o secret APPURL está configurado
# No GitHub: Settings → Secrets → Actions → APPURL
```

O secret deve conter sua URL completa (sem barra no final):
```
https://bob-disquieting-unstoutly.ngrok-free.dev
```

---

## 3. Verificar Logs

### Logs do Servidor Next.js

```bash
# Se o servidor estiver rodando em background com log
tail -f server.log | grep -i "cron\|token\|refresh"
```

### Logs do GitHub Actions

1. Acesse a execução do workflow
2. Clique em **"🔄 Refresh Shopee Tokens"**
3. Expanda os steps para ver os logs detalhados

### Logs Esperados

```
🔄 ===== CRON JOB: RENOVAÇÃO AUTOMÁTICA DE TOKENS =====
⏰ Iniciado em: 2025-12-03T03:32:11.000Z
📊 Encontradas 2 integrações que precisam de refresh

🔄 Processando: Nome da Loja (client-id)
   Shop ID: 123456789
   Expira em: 2025-12-03T04:00:00.000Z (1h)
   🔄 Fazendo refresh do token...
   ✅ Sucesso! Novo token válido até: 2025-12-03T08:00:00.000Z

📊 ===== RESUMO DO CRON JOB =====
⏱️ Tempo de execução: 2s
✅ Sucessos: 1
❌ Falhas: 0
⏭️ Pulados: 1
🔄 Total processados: 2
```

---

## 4. Teste com Dados Reais

### Verificar Status Atual dos Tokens

```bash
curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.all_integrations[] | {client_name, has_refresh_token, token_expiry, hours_until_expiry}'
```

### Simular Token Próximo de Expirar

1. **Verificar tokens atuais:**
   ```bash
   curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.all_integrations[]'
   ```

2. **Executar o cron:**
   ```bash
   curl -X GET "http://localhost:3000/api/shopee/cron-refresh-tokens" | jq '.summary'
   ```

3. **Verificar se os tokens foram atualizados:**
   ```bash
   curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.all_integrations[] | {client_name, token_expiry, hours_until_expiry}'
   ```

### Teste de Refresh Forçado

Se você quiser testar o refresh mesmo que o token ainda não esteja perto de expirar, você pode temporariamente modificar a lógica do cron para buscar tokens que expiram em até 48 horas:

```typescript
// No arquivo cron-refresh-tokens/route.ts, linha 23
const twentyFourHoursFromNow = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas
```

---

## 5. Troubleshooting

### Problema: `total_checked: 0`

**Causa:** Não há integrações com `refresh_token` válido ou tokens não estão próximos de expirar.

**Solução:**
1. Verifique se há integrações no banco:
   ```bash
   curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.summary'
   ```

2. Se não houver integrações, reconecte as contas Shopee.

3. Se houver integrações mas `total_checked: 0`, os tokens podem estar válidos por mais de 24 horas. Isso é normal!

### Problema: `failed_refreshes > 0`

**Causa:** Refresh tokens expirados ou inválidos.

**Solução:**
1. Verifique os erros no campo `errors` da resposta
2. Se o erro for `REFRESH_TOKEN_EXPIRED` ou `error_not_found`, a conta precisa ser reconectada
3. Execute o diagnóstico:
   ```bash
   curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.all_integrations[] | select(.problems | length > 0)'
   ```

### Problema: GitHub Actions não executa

**Causa:** Workflow não configurado ou secret ausente.

**Solução:**
1. Verifique se o arquivo `.github/workflows/refresh-shopee-tokens.yml` existe
2. Verifique se o secret `APPURL` está configurado
3. Verifique se o workflow está ativo (não está pausado)
4. Execute manualmente via "Run workflow"

### Problema: `APPURL empty` no GitHub Actions

**Causa:** Secret `APPURL` não configurado.

**Solução:**
1. Vá para: `Settings → Secrets → Actions`
2. Clique em **"New repository secret"**
3. Name: `APPURL`
4. Value: `https://sua-url-ngrok.com` (sem barra no final)
5. Clique em **"Add secret"**

### Problema: Endpoint retorna 404

**Causa:** Servidor não está rodando ou URL incorreta.

**Solução:**
1. Verifique se o servidor está rodando:
   ```bash
   curl -X GET "http://localhost:3000/api/health" || echo "Servidor não está rodando"
   ```

2. Se estiver usando ngrok, verifique se o túnel está ativo:
   ```bash
   curl -X GET "https://sua-url-ngrok.com/api/shopee/sandbox-test"
   ```

---

## ✅ Checklist de Teste Completo

- [ ] Endpoint responde com status 200
- [ ] Resposta contém `success: true`
- [ ] Campo `summary` está presente
- [ ] `total_checked` reflete o número de integrações
- [ ] Tokens são renovados quando próximos de expirar
- [ ] GitHub Actions executa automaticamente
- [ ] Logs mostram informações detalhadas
- [ ] Tokens atualizados aparecem no diagnóstico

---

## 🎯 Teste Rápido (1 minuto)

```bash
# 1. Verificar status atual
curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.summary'

# 2. Executar cron manualmente
curl -X GET "http://localhost:3000/api/shopee/cron-refresh-tokens" | jq '.summary'

# 3. Verificar se algo mudou
curl -X GET "http://localhost:3000/api/shopee/diagnose-tokens" | jq '.summary'
```

Se o `total_checked` for maior que 0 e `successful_refreshes` ou `skipped` aparecerem, o cron está funcionando! ✅

