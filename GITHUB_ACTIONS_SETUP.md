# 🔄 Configuração GitHub Actions - Refresh Automático de Tokens

## 🎯 **CONFIGURAÇÃO COMPLETA:**

### **1. Arquivos Criados:**
- ✅ `.github/workflows/refresh-shopee-tokens.yml` - Workflow do cron job
- ✅ Configurado para executar **a cada 3 horas**

### **2. Configurar Secret no GitHub:**

#### **Passo a passo:**
1. **Acesse seu repositório no GitHub**
2. **Vá em:** Settings → Secrets and variables → Actions
3. **Clique em:** "New repository secret"
4. **Adicione:**
   - **Name:** `APP_URL`
   - **Value:** `https://seu-dominio.com` (sem barra no final)

#### **Exemplo de URLs:**
```
# Se hospedado na Vercel
https://seu-app.vercel.app

# Se hospedado na Netlify  
https://seu-app.netlify.app

# Domínio próprio
https://seudominio.com

# Railway
https://seu-app.up.railway.app
```

### **3. Horários de Execução:**
```
00:00 UTC (21:00 BRT) - Noite
03:00 UTC (00:00 BRT) - Madrugada  
06:00 UTC (03:00 BRT) - Madrugada
09:00 UTC (06:00 BRT) - Manhã
12:00 UTC (09:00 BRT) - Manhã
15:00 UTC (12:00 BRT) - Meio-dia
18:00 UTC (15:00 BRT) - Tarde
21:00 UTC (18:00 BRT) - Tarde
```

**Resultado:** Tokens sempre renovados antes de expirar (4h de duração)

---

## 🚀 **ATIVAÇÃO:**

### **1. Commit e Push:**
```bash
git add .github/workflows/refresh-shopee-tokens.yml
git commit -m "feat: adicionar cron job GitHub Actions para refresh de tokens"
git push origin main
```

### **2. Configurar Secret:**
- Vá no GitHub → Settings → Secrets → Actions
- Adicione `APP_URL` com sua URL de produção

### **3. Primeira Execução:**
- Vá em Actions → "Refresh Shopee Tokens"
- Clique em "Run workflow" para testar manualmente

---

## 📊 **MONITORAMENTO:**

### **Verificar Execuções:**
1. **GitHub:** Repositório → Actions → "Refresh Shopee Tokens"
2. **Logs detalhados:** Clique em qualquer execução
3. **Status:** ✅ Sucesso / ❌ Falha

### **Logs Esperados (Sucesso):**
```
🚀 Iniciando refresh de tokens Shopee...
⏰ Horário: 2025-12-02T15:00:00Z
🌐 URL: https://seu-dominio.com
📊 Resposta do servidor:
{
  "success": true,
  "summary": {
    "successful_refreshes": 2,
    "failed_refreshes": 0,
    "total_checked": 2
  }
}
🔍 Status HTTP: 200
✅ Refresh executado com sucesso!
```

### **Logs de Erro:**
```
❌ Falha no refresh! Status: 500
🚨 ATENÇÃO: Falha no refresh de tokens!
🔧 Ações recomendadas:
   1. Verificar se a aplicação está online
   2. Verificar logs da aplicação
   3. Executar diagnóstico manual
```

---

## 🔧 **TROUBLESHOOTING:**

### **Erro: "Secret APP_URL not found"**
**Solução:** Configurar secret no GitHub (passo 2 acima)

### **Erro: HTTP 404/500**
**Solução:** Verificar se a URL está correta e aplicação online

### **Erro: "Workflow não executa"**
**Possíveis causas:**
- Repositório privado sem GitHub Actions habilitado
- Branch não é `main` ou `master`
- Arquivo YAML com erro de sintaxe

### **Testar Manualmente:**
```bash
# Testar endpoint diretamente
curl -X GET "https://seu-dominio.com/api/shopee/cron-refresh-tokens"

# Verificar diagnóstico
curl -X GET "https://seu-dominio.com/api/shopee/diagnose-tokens"
```

---

## ✅ **VANTAGENS DO GITHUB ACTIONS:**

- 🆓 **Gratuito:** 2000 minutos/mês para repositórios públicos
- 🔄 **Confiável:** Infraestrutura robusta do GitHub
- 📊 **Logs detalhados:** Fácil debugging
- 🎮 **Execução manual:** Botão "Run workflow"
- 📧 **Notificações:** Email automático em caso de falha
- ⏰ **Flexível:** Fácil alterar horários

---

## 🎯 **RESULTADO FINAL:**

**✅ ANTES:** Tokens expiravam → Site parava de funcionar  
**✅ AGORA:** Tokens renovados a cada 3h → Site sempre funcional  

**Seus tokens Shopee serão renovados automaticamente:**
- **8 vezes por dia**
- **Sem custo adicional** 
- **Logs completos** de cada execução
- **Notificação automática** se algo der errado

**Nunca mais precisará reautenticar contas! 🎉**
