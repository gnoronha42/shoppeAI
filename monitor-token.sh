#!/bin/bash

# 🔍 MONITOR DE TOKEN EM TEMPO REAL
# Monitora o token e testa renovação automática

CLIENT_ID="9e79b6af-fa26-4e7e-89c7-9e2cdd05c6fa"
BASE_URL="http://localhost:3000"

echo "🔍 MONITOR DE TOKEN EM TEMPO REAL"
echo "=================================="
echo "Cliente: $CLIENT_ID"
echo "Iniciado em: $(date)"
echo ""

# Função para verificar status do token
check_token_status() {
    local response=$(curl -s "$BASE_URL/api/shopee/token-monitor?client_id=$CLIENT_ID")
    local status=$(echo "$response" | jq -r '.token_status.status // "unknown"')
    local hours=$(echo "$response" | jq -r '.token_status.hours_until_expiry // 0')
    local minutes=$(echo "$response" | jq -r '.token_status.minutes_until_expiry // 0')
    local urgency=$(echo "$response" | jq -r '.refresh_recommendation.urgency // "unknown"')
    
    echo "$(date '+%H:%M:%S') | Status: $status | Tempo: ${hours}h ${minutes}m | Urgência: $urgency"
    
    # Se token expirou ou está crítico, testar cron
    if [[ "$status" == "expired" || "$urgency" == "critical" || "$urgency" == "high" ]]; then
        echo "  🚨 TOKEN CRÍTICO! Testando renovação automática..."
        test_cron_refresh
    fi
}

# Função para testar cron refresh
test_cron_refresh() {
    local cron_response=$(curl -s "$BASE_URL/api/shopee/cron-refresh-tokens")
    local cron_success=$(echo "$cron_response" | jq -r '.success // false')
    local successful_refreshes=$(echo "$cron_response" | jq -r '.summary.successful_refreshes // 0')
    
    echo "  🔄 Cron executado: Sucesso=$cron_success | Renovações=$successful_refreshes"
    
    if [[ "$successful_refreshes" -gt 0 ]]; then
        echo "  ✅ TOKEN RENOVADO AUTOMATICAMENTE!"
    else
        echo "  ❌ Falha na renovação automática"
        test_smart_refresh
    fi
}

# Função para testar smart refresh
test_smart_refresh() {
    local smart_response=$(curl -s -X POST "$BASE_URL/api/shopee/smart-refresh" \
        -H "Content-Type: application/json" \
        -d "{\"client_id\":\"$CLIENT_ID\",\"force\":true}")
    local smart_success=$(echo "$smart_response" | jq -r '.success // false')
    
    echo "  🧠 Smart Refresh: Sucesso=$smart_success"
    
    if [[ "$smart_success" == "true" ]]; then
        echo "  ✅ SMART REFRESH FUNCIONOU!"
    else
        echo "  ❌ Smart refresh também falhou"
        test_fallback
    fi
}

# Função para testar fallback
test_fallback() {
    local data_response=$(curl -s "$BASE_URL/api/shopee/data?client_id=$CLIENT_ID")
    local needs_reconnection=$(echo "$data_response" | jq -r '.needs_reconnection // false')
    local has_data=$(echo "$data_response" | jq -r '.data != null')
    
    echo "  🛡️ Fallback: Reconexão=$needs_reconnection | Dados=$has_data"
    
    if [[ "$has_data" == "true" ]]; then
        echo "  ✅ FALLBACK GRACIOSO FUNCIONANDO!"
    else
        echo "  ❌ Sistema completamente offline"
    fi
}

# Loop de monitoramento
echo "Iniciando monitoramento (Ctrl+C para parar)..."
echo ""

while true; do
    check_token_status
    sleep 30  # Verifica a cada 30 segundos
done
