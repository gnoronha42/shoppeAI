# 🔄 CONFIGURAÇÃO DE CRON JOB - Renovação Automática de Tokens

## 🎯 **PROBLEMA RESOLVIDO:**

**Antes:** Tokens expiravam quando ninguém acessava o site → Cliente precisava reautenticar
**Agora:** Sistema renova tokens automaticamente a cada 2 horas → Tokens sempre válidos

---

## 🚀 **OPÇÕES DE CONFIGURAÇÃO:**

### **1. VERCEL CRON (RECOMENDADO para produção)**

Se você está usando Vercel, adicione no `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/shopee/cron-refresh-tokens",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Frequência:** Diariamente às 3:00 AM
**Vantagem:** Totalmente automático, não depende de servidor próprio

### **2. GITHUB ACTIONS (GRATUITO)**

Crie `.github/workflows/refresh-tokens.yml`:

```yaml
name: Refresh Shopee Tokens
on:
  schedule:
    - cron: '0 3 * * *'  # Diariamente às 3:00 AM UTC
  workflow_dispatch:  # Permite execução manual

jobs:
  refresh-tokens:
    runs-on: ubuntu-latest
    steps:
      - name: Call Refresh Endpoint
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/shopee/cron-refresh-tokens" \
            -H "Content-Type: application/json" \
            -w "Status: %{http_code}\n"
```

**Configure a secret `APP_URL`:** https://seu-dominio.com

### **3. CRON TRADICIONAL (Servidor Linux)**

```bash
# Editar crontab
crontab -e

# Adicionar linha (executa diariamente às 3:00 AM)
0 3 * * * curl -X GET "https://seu-dominio.com/api/shopee/cron-refresh-tokens" >/dev/null 2>&1
```

### **4. UPTIMEROBOT (GRATUITO)**

1. Acesse https://uptimerobot.com
2. Crie um monitor HTTP(S)
3. URL: `https://seu-dominio.com/api/shopee/cron-refresh-tokens`
4. Intervalo: 1440 minutos (24 horas)
5. Ative o monitor

### **5. CRON-JOB.ORG (GRATUITO)**

1. Acesse https://cron-job.org
2. Crie uma conta gratuita
3. Adicione job:
   - URL: `https://seu-dominio.com/api/shopee/cron-refresh-tokens`
   - Intervalo: `0 3 * * *`
   - Método: GET

---

## 🧪 **TESTE MANUAL:**

### **Executar agora:**
```bash
curl -X GET "http://localhost:3000/api/shopee/cron-refresh-tokens"
```

### **Resposta esperada:**
```json
{
  "success": true,
  "message": "Cron job executado com sucesso",
  "summary": {
    "total_checked": 2,
    "successful_refreshes": 2,
    "failed_refreshes": 0,
    "skipped": 0,
    "execution_time_seconds": 3
  }
}
```

---

## 📊 **MONITORAMENTO:**

### **Logs do Cron Job:**
O endpoint gera logs detalhados que você pode ver no console:

```
🔄 ===== CRON JOB: RENOVAÇÃO AUTOMÁTICA DE TOKENS =====
⏰ Iniciado em: 2025-12-02T12:00:00.000Z
📊 Encontradas 2 integrações que precisam de refresh

🔄 Processando: LOJA_TESTE (9e79b6af-fa26-4e7e-89c7-9e2cdd05c6fa)
   Shop ID: 1013943649
   Expira em: 2025-12-01T14:38:45.000Z (-21h)
   🔄 Fazendo refresh do token...
   ✅ Sucesso! Novo token válido até: 2025-12-02T16:38:45.000Z

📊 ===== RESUMO DO CRON JOB =====
⏱️ Tempo de execução: 3s
✅ Sucessos: 2
❌ Falhas: 0
⏭️ Pulados: 0
🔄 Total processados: 2
```

### **Endpoint de Status:**
```bash
GET /api/shopee/diagnose-tokens
```

Mostra o status atual de todos os tokens.

---

## ⚙️ **CONFIGURAÇÃO RECOMENDADA:**

### **Para Desenvolvimento:**
- **Frequência:** Manual ou a cada 30 minutos (para testes)
- **Método:** Cron local ou script manual

### **Para Produção:**
- **Frequência:** Diariamente às 3:00 AM
- **Método:** Vercel Cron ou GitHub Actions
- **Backup:** UptimeRobot como redundância

### **Configuração Vercel (RECOMENDADA):**

1. **Criar `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/shopee/cron-refresh-tokens",
      "schedule": "0 3 * * *"
    }
  ]
}
```

2. **Deploy:**
```bash
vercel --prod
```

3. **Verificar:**
- Acesse Vercel Dashboard → Seu projeto → Functions → Crons
- Confirme que o cron está ativo

---

## 🎯 **RESULTADO FINAL:**

### **✅ ANTES da configuração:**
- Tokens expiram → Site para de funcionar
- Cliente precisa reautenticar manualmente
- Perda de dados e relatórios

### **✅ DEPOIS da configuração:**
- Tokens renovados automaticamente
- Site sempre funcional
- Zero intervenção manual necessária
- Relatórios sempre atualizados

---

## 🚨 **IMPORTANTE:**

1. **Configure pelo menos 1 método** de cron job
2. **Teste manualmente** antes de ativar
3. **Monitore os logs** nas primeiras execuções
4. **Configure alertas** se possível (email quando falha)

**Com isso configurado, você NUNCA mais precisará cadastrar contas múltiplas vezes!** 🎉
