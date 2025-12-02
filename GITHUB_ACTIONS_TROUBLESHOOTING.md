# 🔧 GitHub Actions - Troubleshooting

## 🚨 **ERRO COMUM: "URL vazia"**

### **Sintomas:**
```
🚀 Iniciando refresh de tokens Shopee...
⏰ Horário: Tue Dec  2 16:14:43 UTC 2025
🌐 URL: 
❌ ERRO: Secret APPURL não configurado!
```

### **Causa:**
O secret `APPURL` não foi configurado no GitHub.

### **✅ SOLUÇÃO:**

#### **1. Configurar Secret:**
1. **Acesse:** https://github.com/SEU_USUARIO/SEU_REPOSITORIO
2. **Clique em:** Settings (aba do repositório)
3. **No menu lateral:** Secrets and variables → Actions
4. **Clique:** "New repository secret"
5. **Preencha:**
   - **Name:** `APP_URL` (exatamente assim, maiúsculo)
   - **Secret:** `https://seu-dominio.com` (sua URL de produção)
6. **Clique:** "Add secret"

#### **2. Testar Novamente:**
1. **Vá em:** Actions → "Refresh Shopee Tokens"
2. **Clique:** "Run workflow" → "Run workflow"
3. **Aguarde:** Execução completar

---

## 🌐 **COMO DESCOBRIR SUA URL DE PRODUÇÃO:**

### **Se hospedado na Vercel:**
1. Acesse https://vercel.com/dashboard
2. Clique no seu projeto
3. Copie a URL (ex: `https://meuapp.vercel.app`)

### **Se hospedado na Netlify:**
1. Acesse https://app.netlify.com/sites
2. Clique no seu site
3. Copie a URL (ex: `https://meuapp.netlify.app`)

### **Se hospedado na Railway:**
1. Acesse https://railway.app/dashboard
2. Clique no seu projeto
3. Copie a URL (ex: `https://meuapp.up.railway.app`)

### **Domínio próprio:**
Use sua URL personalizada (ex: `https://meudominio.com`)

---

## ✅ **LOGS DE SUCESSO ESPERADOS:**

```
🚀 Iniciando refresh de tokens Shopee...
⏰ Horário: Tue Dec  2 16:14:43 UTC 2025
🌐 URL: https://meuapp.vercel.app
📊 Resposta do servidor:
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
🔍 Status HTTP: 200
✅ Refresh executado com sucesso!
```

---

## 🚨 **OUTROS ERROS COMUNS:**

### **Erro: HTTP 404**
```
❌ Falha no refresh! Status: 404
```
**Causa:** Endpoint não encontrado  
**Solução:** Verificar se a aplicação está deployada e o endpoint existe

### **Erro: HTTP 500**
```
❌ Falha no refresh! Status: 500
```
**Causa:** Erro interno na aplicação  
**Solução:** Verificar logs da aplicação e banco de dados

### **Erro: Connection refused**
```
curl: (7) Failed to connect to meuapp.com port 443
```
**Causa:** Aplicação offline ou URL incorreta  
**Solução:** Verificar se a aplicação está rodando

---

## 🧪 **TESTE MANUAL:**

### **Testar endpoint diretamente:**
```bash
curl -X GET "https://sua-url.com/api/shopee/cron-refresh-tokens" \
  -H "Content-Type: application/json"
```

### **Resposta esperada:**
```json
{
  "success": true,
  "message": "Cron job executado com sucesso",
  "summary": {
    "successful_refreshes": 2,
    "failed_refreshes": 0
  }
}
```

---

## 📋 **CHECKLIST DE VERIFICAÇÃO:**

- [ ] Secret `APP_URL` configurado no GitHub
- [ ] URL não tem barra no final
- [ ] URL usa HTTPS (não HTTP)
- [ ] Aplicação está deployada e online
- [ ] Endpoint `/api/shopee/cron-refresh-tokens` existe
- [ ] Banco de dados está acessível
- [ ] Pelo menos uma integração Shopee existe

---

## 🎯 **PRÓXIMOS PASSOS APÓS CORREÇÃO:**

1. **Configure o secret `APP_URL`**
2. **Execute workflow manualmente**
3. **Verifique logs de sucesso**
4. **Aguarde próxima execução automática (a cada 3h)**

**Com isso configurado, seus tokens serão renovados automaticamente! 🎉**
