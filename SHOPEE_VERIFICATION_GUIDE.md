# 🔍 GUIA COMPLETO - Como Verificar se sua Integração Shopee Está Funcionando

## 1. 🏥 Health Check - Verificação Rápida

### Endpoint criado: `/api/shopee/health-check`

**Para um cliente específico:**
```
GET /api/shopee/health-check?client_id=SEU_CLIENT_ID
```

**Para todas as integrações:**
```
GET /api/shopee/health-check
```

### Exemplo de resposta:
```json
{
  "success": true,
  "client_id": "2a2358c6-ae5c-458c-b50d-d4d23f07daf5",
  "client_name": "COLORINDO SHOP BRASIL",
  "shop_id": "413140457",
  "status": "connected",
  "token_info": {
    "has_access_token": true,
    "has_refresh_token": true,
    "expires_in_hours": 3,
    "expires_in_days": 0,
    "is_expired": false,
    "needs_refresh_soon": true
  },
  "connectivity": {
    "can_connect": true,
    "error": null,
    "response_time_ms": 1250
  },
  "recommendations": [
    "✅ Conectividade OK",
    "⚠️ Token expira em breve - será renovado automaticamente"
  ]
}
```

---

## 2. 📊 Verificar Dados da API

### Endpoint de dados: `/api/shopee/data`

```
GET /api/shopee/data?client_id=SEU_CLIENT_ID&date_from=2025-10-29&date_to=2025-11-28
```

### O que verificar na resposta:

```json
{
  "success": true,
  "data": {
    "shopName": "COLORINDO SHOP BRASIL",
    "totalOrdersLast30Days": 12,        // ✅ > 0 = dados encontrados
    "gmvLast30Days": 1500.50,           // ✅ > 0 = vendas encontradas
    "ticketMedioLast30Days": 125.04,    // ✅ > 0 = cálculo correto
    "totalProducts": 43,                // ✅ > 0 = catálogo ativo
    "activeProducts": 43,               // ✅ produtos disponíveis
    "topProductsLast30Days": [          // ✅ lista de produtos vendidos
      {
        "name": "Produto A",
        "units": 5,
        "revenue": 250.00
      }
    ]
  }
}
```

**🚨 Sinais de problema:**
- `totalOrdersLast30Days: 0` = nenhum pedido encontrado
- `gmvLast30Days: 0` = nenhuma venda
- `totalProducts: 0` = catálogo vazio
- `topProductsLast30Days: []` = nenhum produto vendido

---

## 3. 🔍 Debug Detalhado

### Endpoint de debug: `/api/shopee/debug-requests`

```
GET /api/shopee/debug-requests?client_id=SEU_CLIENT_ID
```

### O que verificar:

1. **Todas as requisições foram bem-sucedidas?**
```json
{
  "summary": {
    "total_requests": 4,
    "successful": 4,        // ✅ Todas ok
    "failed": 0             // ✅ Nenhuma falhou
  }
}
```

2. **Os endpoints retornaram dados?**
```json
{
  "requests": [
    {
      "endpoint": "/api/v2/shop/get_shop_info",
      "status": "success",
      "response": {
        "shop_name": "COLORINDO SHOP BRASIL"  // ✅ Nome da loja
      }
    },
    {
      "endpoint": "/api/v2/order/get_order_list",
      "status": "success",
      "response": {
        "response": {
          "order_list": [...]  // ✅ Lista de pedidos
        }
      }
    }
  ]
}
```

---

## 4. 📋 Logs do Terminal

### Como ler os logs:

**✅ Logs de sucesso:**
```
📅 [createDateBlocks] Dividindo período em 2 blocos
🔍 [fetchOrdersInBlocks] Buscando pedidos no bloco: 2025-10-29 → 2025-11-13 (15 dias)
📊 [fetchOrdersInBlocks] create_time (15d): 8 pedidos encontrados
✅ [fetchOrdersInBlocks] Bloco processado: 8 pedidos únicos adicionados
🎯 [fetchOrdersInBlocks] RESULTADO FINAL: 12 pedidos únicos encontrados em 2 blocos
```

**❌ Logs de problema:**
```
❌ [fetchOrdersInBlocks] Erro create_time (15d): Shopee API failed: 403 invalid_access_token
⚠️ [forceRefreshTokens] Não é possível fazer refresh: refresh_token ausente
```

---

## 5. 🧪 Teste do Relatório

### Como verificar se o relatório tem dados reais:

1. **Gere um relatório** via "Gerar com Integração (Shopee)"

2. **Procure por estes indicadores no relatório:**

**✅ Dados reais:**
```markdown
Visitantes Mês: 1,250
GMV Mês: R$1.500,50
Pedidos Pagos Mês: 12
Ticket Médio Mês: R$125,04
```

**❌ Dados vazios:**
```markdown
Visitantes Mês: 0
GMV Mês: R$0,00
Pedidos Pagos Mês: 0
Ticket Médio Mês: R$0,00
```

3. **Verifique a seção de produtos:**

**✅ Com dados:**
```markdown
5.1. Ranking de Produtos por Vendas
1. Produto A - 5 unidades - R$250,00
2. Produto B - 3 unidades - R$180,00
```

**❌ Sem dados:**
```markdown
5.1. Ranking de Produtos por Vendas
—
—
```

---

## 6. 🎯 Checklist de Verificação

### Passo a passo para diagnosticar:

#### ✅ Etapa 1: Conectividade
```bash
# 1. Verificar se a integração existe e está conectada
GET /api/shopee/health-check?client_id=SEU_ID

# Deve retornar: "status": "connected"
```

#### ✅ Etapa 2: Tokens
```bash
# 2. Verificar se os tokens estão válidos
GET /api/shopee/debug-tokens?client_id=SEU_ID

# Deve mostrar: remainingHours > 0
```

#### ✅ Etapa 3: Dados da API
```bash
# 3. Testar busca de dados
GET /api/shopee/data?client_id=SEU_ID

# Deve retornar: totalOrdersLast30Days > 0 (se houver pedidos)
```

#### ✅ Etapa 4: Debug Detalhado
```bash
# 4. Ver todas as requisições
GET /api/shopee/debug-requests?client_id=SEU_ID

# Deve mostrar: "successful": 4, "failed": 0
```

#### ✅ Etapa 5: Relatório Final
```bash
# 5. Gerar relatório via interface
# Verificar se os dados aparecem no markdown gerado
```

---

## 7. 🚨 Problemas Comuns e Soluções

### Problema: "status": "disconnected"
**Solução:** Reautenticar na aba Integrações do cliente

### Problema: "totalOrdersLast30Days": 0
**Possíveis causas:**
- Loja realmente não tem pedidos no período
- Período muito antigo (testar período mais recente)
- Erro de timezone (verificar se as datas estão corretas)

### Problema: "failed": 4 no debug
**Solução:** Verificar logs do terminal para ver erro específico

### Problema: Relatório com dados zerados
**Verificar:**
1. Health check está "connected"?
2. API retorna dados > 0?
3. Logs mostram pedidos encontrados?

---

## 8. 🔧 URLs de Teste Rápido

Substitua `SEU_CLIENT_ID` pelo ID real:

```bash
# Status geral
http://localhost:3000/api/shopee/health-check

# Status específico
http://localhost:3000/api/shopee/health-check?client_id=SEU_CLIENT_ID

# Dados da loja
http://localhost:3000/api/shopee/data?client_id=SEU_CLIENT_ID

# Debug completo
http://localhost:3000/api/shopee/debug-requests?client_id=SEU_CLIENT_ID

# Tokens
http://localhost:3000/api/shopee/debug-tokens?client_id=SEU_CLIENT_ID
```

---

## ✅ Resultado Esperado

Se tudo estiver funcionando, você deve ver:

1. **Health Check:** `"status": "connected"`
2. **Dados:** `totalOrdersLast30Days > 0` (se houver pedidos)
3. **Debug:** `"successful": 4, "failed": 0`
4. **Logs:** Pedidos encontrados em cada bloco
5. **Relatório:** Dados reais em vez de zeros

**Se algum passo falhar, os logs e endpoints de debug mostrarão exatamente onde está o problema!** 🎯
