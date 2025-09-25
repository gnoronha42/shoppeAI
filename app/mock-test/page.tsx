"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MockTestPage() {
  // Mock do relatório completo
  const mockRelatorio = `📊 ANÁLISE EXPRESS – Gabriel Ximenes Mitozo Noronha

*Diagnóstico simples e visual* 

• Conversão: 192,61% — ALERTA: Conversão acima da média realista. O número de pedidos está muito acima do número de visitantes, sugerindo inconsistências nos dados.
• Ticket médio: R$ 187,50
• CPA: R$ 26,67
• ROAS calculado: 7,04x [Abaixo da meta (8x)]
• Score gargalo: 85/100

💰 Impacto Financeiro Traduzido

Com base na análise dos seus dados, identifiquei alguns pontos de atenção:

• ROAS atual de 7,04x está ligeiramente abaixo da meta ideal de 8x
• Apesar da conversão elevada, há margem para otimização de custos
• Dinheiro na mesa estimado: R$ 15.847,38 este mês

⚠️ Riscos Reais

• Dependência alta de campanhas específicas pode gerar instabilidade
• CPA de R$ 26,67 representa 14,2% do ticket médio - dentro do aceitável, mas pode ser otimizado
• Necessidade de diversificação de fontes de tráfego

📈 Projeção Realista e Problemas Identificados

Cenário Conservador: Manter os 832 pedidos atuais - R$ 156.000,00
Cenário Realista: +10% tráfego, +0,3% conversão - 915 pedidos - R$ 171.562,50
Cenário Otimista: +20% tráfego, +0,6% conversão - 1.081 pedidos - R$ 202.687,50

🎯 Inteligência Semanal – SellerIA

Para alcançar o próximo nível, recomendamos:

• Otimização de campanhas para atingir ROAS de 8x+
• Testes A/B em landing pages para melhorar conversão orgânica
• Diversificação de palavras-chave e públicos
• Análise detalhada por SKU para identificar produtos com maior potencial

Sua conta tem potencial significativo de crescimento com as estratégias corretas implementadas.`;

  const handleTestWithParams = () => {
    // Simular com parâmetros na URL
    const encodedRelatorio = encodeURIComponent(mockRelatorio);
    window.location.href = `/obrigado?relatorio=${encodedRelatorio}`;
  };

  const handleTestWithLocalStorage = () => {
    // Simular com localStorage
    localStorage.setItem('relatorio', mockRelatorio);
    window.location.href = '/obrigado';
  };

  const handleTestEmpty = () => {
    // Testar página sem dados
    localStorage.removeItem('relatorio');
    window.location.href = '/obrigado';
  };

  const handleSimulateAPIFlow = () => {
    // Simular o formato REAL da sua API
    const mockApiResponse = {
      success: true,
      mensagem: "Análise enviada com sucesso para o WhatsApp!",
      resultado: {},
      preview: mockRelatorio // USANDO PREVIEW como sua API retorna
    };

    console.log('Mock API Response (formato real):', mockApiResponse);
    
    // Simular o mesmo comportamento do selleria (agora com preview OU relatorio)
    if (mockApiResponse.preview || mockApiResponse.relatorio) {
      const relatorioCompleto = mockApiResponse.relatorio || mockApiResponse.preview;
      console.log('Redirecionando para página de obrigado...');
      console.log('Relatório encontrado, tamanho:', relatorioCompleto.length, 'caracteres');
      
      try {
        // Nova estratégia: usar apenas localStorage
        localStorage.setItem('relatorio', relatorioCompleto);
        sessionStorage.setItem('relatorio', relatorioCompleto);
        localStorage.setItem('relatorio_timestamp', Date.now().toString());
        
        console.log('💾 Dados salvos no storage');
        console.log('✈️ Redirecionando sem parâmetros na URL...');
        
        // Aguardar um pouco antes do redirecionamento para garantir que os logs apareçam
        setTimeout(() => {
          window.location.href = '/obrigado';
        }, 500);
      } catch (error) {
        console.error('❌ Erro no redirecionamento:', error);
        window.location.href = '/obrigado';
      }
    }
  };

  const handleSimulateShortPreview = () => {
    // Simular com preview curto (como no seu exemplo)
    const mockApiResponseShort = {
      success: true,
      mensagem: "Análise enviada com sucesso para o WhatsApp!",
      resultado: {},
      preview: "📊 ANÁLISE EXPRESS – Gabriel Ximenes Mitozo Noronha\n\n*Diagnóstico simples e visual* \n\n• Conversão: 192,61% — ALERTA: Conversão acima da média realista. O número de pedidos está muito acima do número d..."
    };

    console.log('Mock API Response (preview curto):', mockApiResponseShort);
    
    if (mockApiResponseShort.preview) {
      localStorage.setItem('relatorio', mockApiResponseShort.preview);
      console.log('Redirecionando com preview curto...');
      
      try {
        const url = `/obrigado?relatorio=${encodeURIComponent(mockApiResponseShort.preview)}`;
        window.location.href = url;
      } catch (error) {
        console.error('Erro no redirecionamento:', error);
        window.location.href = '/obrigado';
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            🧪 Mock Test - Página de Obrigado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-gray-300 text-sm mb-6">
            <p>Teste diferentes cenários para a página de obrigado:</p>
          </div>

          <div className="grid gap-3">
            <Button 
              onClick={handleSimulateAPIFlow}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              🎯 Simular API Real (preview completo)
            </Button>

            <Button 
              onClick={handleSimulateShortPreview}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              📄 Simular API Real (preview curto)
            </Button>

            <Button 
              onClick={handleTestWithParams}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              🔗 Testar com Parâmetros URL
            </Button>

            <Button 
              onClick={handleTestWithLocalStorage}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              💾 Testar com localStorage
            </Button>

            <Button 
              onClick={handleTestEmpty}
              variant="outline"
              className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              ❌ Testar sem Dados
            </Button>

            <Button 
              onClick={() => {
                // Teste super simples só com localStorage
                localStorage.setItem('relatorio', 'Teste simples de relatório');
                console.log('🧪 Teste simples: localStorage definido');
                window.location.href = '/obrigado';
              }}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-black"
            >
              🧪 Teste Super Simples (só localStorage)
            </Button>

            <Button 
              onClick={() => {
                // Debug extremo - forçar exatamente o que a API retorna
                const mockRelatorio = `📊 ANÁLISE EXPRESS – Gabriel Ximenes Mitozo Noronha

*Diagnóstico simples e visual* 

• Conversão: 192,61% — ALERTA: Conversão acima da média realista
• Ticket médio: R$ 187,50
• CPA: R$ 26,67
• ROAS calculado: 7,04x

💰 Impacto Financeiro: R$ 15.847,38 em jogo este mês

📈 Sua conta tem potencial significativo de crescimento.`;

                console.log('🔬 DEBUG EXTREMO iniciado');
                console.log('📝 Relatório para teste:', mockRelatorio.substring(0, 100));
                
                // 1. Salvar no localStorage
                localStorage.setItem('relatorio', mockRelatorio);
                console.log('💾 Salvo no localStorage');
                
                // 2. Verificar se foi salvo
                const verificacao = localStorage.getItem('relatorio');
                console.log('✅ Verificação localStorage:', verificacao ? 'OK' : 'FALHOU');
                
                // 3. Redirecionar
                setTimeout(() => {
                  console.log('🚀 Redirecionando...');
                  window.location.href = '/obrigado';
                }, 1000);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              🔬 DEBUG EXTREMO
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Preview do Relatório Mock:</h3>
            <div className="text-xs text-gray-400 bg-gray-900 p-3 rounded max-h-40 overflow-y-auto">
              {mockRelatorio.substring(0, 300)}...
            </div>
          </div>

          <div className="mt-4 text-center">
            <a 
              href="/selleria" 
              className="text-blue-400 hover:text-blue-300 text-sm underline"
            >
              ← Voltar para Selleria
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
