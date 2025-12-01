# 🔧 CORREÇÕES CRÍTICAS - Gerenciamento de Tokens Shopee

## 📋 Problemas Identificados e Corrigidos

### 1. ❌ **PROBLEMA: Refresh Token não estava sendo atualizado**
**Causa:** O código usava `refreshed.refresh_token ?? integration.refresh_token`, mantendo o refresh_token antigo quando a Shopee retornava um novo.

**Solução:** ✅ **SEMPRE** salvar o novo `refresh_token` retornado pela Shopee. A Shopee retorna um **NOVO refresh_token a cada refresh**, e se não atualizarmos, o token antigo pode expirar.

**Arquivos corrigidos:**
- `lib/shopee.ts` - Função `refreshAccessToken`
- `app/api/shopee/data/route.ts` - Função `getValidAccessToken`
- `app/api/shopee/callback/route.ts` - Salvamento inicial
- `lib/shopee-stats.ts` - Função `getValidAccessToken`

### 2. ❌ **PROBLEMA: Buffer muito agressivo (1 hora)**
**Causa:** O sistema renovava tokens 1 hora antes de expirar, causando refreshes desnecessários.

**Solução:** ✅ Buffer reduzido para **30 minutos (1800s)**. Access tokens Shopee geralmente expiram em 4 horas, então renovar 30min antes é suficiente.

### 3. ❌ **PROBLEMA: Timestamp inconsistente no refresh**
**Causa:** `refreshAccessToken` usava `getTimestamp()` (local) enquanto `getAccessToken` usava `getShopeeServerTimestamp()` (servidor Shopee).

**Solução:** ✅ `refreshAccessToken` agora usa `getShopeeServerTimestamp()` para manter consistência.

### 4. ❌ **PROBLEMA: Falta de tratamento para refresh_token expirado**
**Causa:** Quando o refresh_token expira (após ~30 dias), o sistema não diferenciava entre "token inválido" e "refresh_token expirado".

**Solução:** ✅ Tratamento específico com código `REFRESH_TOKEN_EXPIRED` para identificar quando é necessário reautenticar.

### 5. ❌ **PROBLEMA: Logs insuficientes para debug**
**Causa:** Difícil identificar quando e por que tokens estavam expirando.

**Solução:** ✅ Logs detalhados em todas as etapas do processo de refresh.

---

## 🔄 Como Funciona Agora

### Fluxo de Renovação Automática:

1. **Verificação Proativa:**
   - Sistema verifica se o token expira em menos de 30 minutos
   - Se sim, renova automaticamente ANTES de expirar

2. **Refresh Token:**
   - Usa timestamp do servidor Shopee (consistente)
   - **SEMPRE** salva o novo refresh_token retornado
   - Trata erros específicos (refresh_token expirado vs. inválido)

3. **Fallback em Caso de Erro 403:**
   - Se receber `invalid_access_token` durante uma chamada API
   - Tenta refresh forçado automaticamente
   - Retry da chamada com novo token

4. **Detecção de Expiração:**
   - Se refresh_token expirar (após ~30 dias), retorna erro específico
   - Frontend pode redirecionar para reautenticação

---

## ✅ Checklist de Validação

- [x] Refresh token sempre atualizado quando recebido
- [x] Buffer reduzido para 30 minutos
- [x] Timestamp do servidor Shopee usado consistentemente
- [x] Tratamento específico para refresh_token expirado
- [x] Logs detalhados para debug
- [x] Fallback automático em caso de 403
- [x] Código de erro específico para reautenticação

---

## 🚨 Quando Reautenticação é Necessária

A reautenticação (OAuth flow completo) é necessária apenas quando:

1. **Refresh token expirou** (após ~30 dias sem uso)
2. **Usuário revogou** a autorização no painel Shopee
3. **Aplicação foi desabilitada** pela Shopee
4. **Credenciais da aplicação mudaram** (partner_id/partner_key)

**Em todos os outros casos, o sistema renova automaticamente!**

---

## 📊 Monitoramento

Os logs agora incluem:
- Tempo restante do token (horas/dias)
- Quando refresh é executado
- Se refresh_token foi atualizado
- Erros específicos (ex: refresh_token expirado)

---

## 🔍 Como Verificar se Está Funcionando

1. **Verifique os logs do servidor:**
   ```
   🔍 [getValidAccessToken] Verificando token...
   ✅ Token válido por mais X horas
   ```

2. **Se token estiver perto de expirar:**
   ```
   🔄 Token expirado/expirando, renovando...
   ✅ Token atualizado com sucesso
   ```

3. **Se refresh_token expirar:**
   ```
   ❌ Refresh token expirado - reautenticação necessária
   ```

---

## 🎯 Resultado Esperado

- ✅ Tokens renovam automaticamente antes de expirar
- ✅ Refresh_token sempre atualizado (nunca expira por falta de atualização)
- ✅ Menos erros 403 por token inválido
- ✅ Conexões permanecem ativas indefinidamente (até refresh_token expirar após ~30 dias)
- ✅ Reautenticação apenas quando realmente necessário

