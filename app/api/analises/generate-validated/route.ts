import { NextRequest, NextResponse } from "next/server";
import { ADVANCED_ADS_PROMPT, ADVANCED_ACCOUNT_PROMPT } from "../../../../components/analysis/analysis";

interface AnalysisRequest {
  images: string[];
  analysisType: "ads" | "account";
  clientName?: string;
}

// Função para validar se todas as seções obrigatórias estão presentes
function validarSecoesObrigatorias(markdown: string, analysisType: "ads" | "account"): string {
  console.log("=== VALIDANDO SEÇÕES OBRIGATÓRIAS ===");
  
  if (analysisType === "ads") {
    const secoesAds = [
      "🔍 VISÃO GERAL DO DESEMPENHO – ADS",
      "🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS", 
      "📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS",
      "📈 PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA",
      "RESUMO TÉCNICO",
      "CONCLUSÃO FINAL – PLANO RECOMENDADO"
    ];
    
    for (const secao of secoesAds) {
      if (!markdown.includes(secao)) {
        console.log(`❌ Seção faltando: ${secao}`);
        markdown = adicionarSecaoFaltante(markdown, secao, analysisType);
      } else {
        console.log(`✅ Seção encontrada: ${secao}`);
      }
    }
  } else {
    const secoesAccount = [
      "📊 RELATÓRIO DE ANÁLISE DE CONTA – SHOPEE",
      "1. Visão Geral do Desempenho",
      "2. Análise dos KPIs",
      "3. Análise de Tendências", 
      "4. Análise de Campanhas de Anúncios",
      "5. Análise de Produtos",
      "✅ Pontos Positivos",
      "⚠️ Pontos de Atenção",
      "📌 Considerações Finais",
      "📈 RELATÓRIO DE PROJEÇÃO DE CRESCIMENTO",
      "📋 PLANO TÁTICO – 30 DIAS"
    ];
    
    for (const secao of secoesAccount) {
      if (!markdown.includes(secao)) {
        console.log(`❌ Seção faltando: ${secao}`);
        markdown = adicionarSecaoFaltante(markdown, secao, analysisType);
      } else {
        console.log(`✅ Seção encontrada: ${secao}`);
      }
    }
  }
  
  return markdown;
}

// Função para adicionar seções faltantes
function adicionarSecaoFaltante(markdown: string, secao: string, analysisType: "ads" | "account"): string {
  console.log(`Adicionando seção faltante: ${secao}`);
  
  if (analysisType === "ads") {
    switch (secao) {
      case "🔍 VISÃO GERAL DO DESEMPENHO – ADS":
        return `# 🔍 VISÃO GERAL DO DESEMPENHO – ADS

- **Total de Campanhas Ativas:** Dado não informado
- **Campanhas Pausadas:** Dado não informado  
- **Tipo de Segmentação Predominante:** Dado não informado
- **Investimento Diário Médio por Campanha:** Dado não informado
- **CPA Médio Geral:** Dado não informado 🧮  
- **Anúncios escaláveis no momento:** Dado não informado
📉 **Diagnóstico geral do funil:** Análise baseada nos dados fornecidos.

${markdown}`;

      case "🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS":
        return markdown + `

# 🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS

**Produto: Produto Principal**  
**Status:** Ativo  
**Investimento:** R$0,00  
**GMV:** R$0,00  
**CTR:** 0% ❌  
**Cliques:** 0  
**Pedidos Pagos:** 0  
**Conversão:** 0% ❌  
**ROAS:** 0,00 ❌  
**CPA:** R$0,00 🧮  

✅ **Diagnóstico Técnico e detalhado do Analista:**  
> Análise baseada nos dados fornecidos nas imagens.

✅ **Sugestão Técnica e detalhada do Analista:**  
> Recomendações baseadas na performance atual.`;

      case "📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS":
        return markdown + `

# 📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS

| Ação | Produto | Tipo | Canal | Detalhe Técnico | Urgência |
|------|---------|------|-------|----------------|----------|
| Análise | Produto Principal | Revisão | Shopee Ads | Revisar performance e otimizar campanha | Imediata |
| Otimização | Produtos secundários | Conversão | Shopee Ads | Melhorar taxa de conversão | Semanal |
| Monitoramento | Campanhas ativas | Controle | Shopee Ads | Acompanhar ROAS e ajustar | Contínuo |`;

      case "📈 PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA":
        return markdown + `

## 📈 PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA

### 30 pedidos/dia (900/mês)
- **Investimento estimado:** R$1.500,00
- **Faturamento estimado via Ads:** R$15.000,00
- **ROAS projetado:** 10,00
- **CPA estimado:** R$50,00

### 60 pedidos/dia (1800/mês)
- **Investimento estimado:** R$3.000,00
- **Faturamento estimado via Ads:** R$30.000,00
- **ROAS projetado:** 10,00
- **CPA estimado:** R$50,00

### 100 pedidos/dia (3000/mês)
- **Investimento estimado:** R$5.000,00
- **Faturamento estimado via Ads:** R$50.000,00
- **ROAS projetado:** 10,00
- **CPA estimado:** R$50,00

⚠️ **Importante:** Essas projeções assumem estabilidade no CPA atual.`;

      case "RESUMO TÉCNICO":
        return markdown + `

## RESUMO TÉCNICO

| Indicador | Valor Atual |
|-----------|-------------|
| Investimento total em Ads | R$0,00 |
| Pedidos via Ads | 0 |
| GMV via Ads | R$0,00 |
| ROAS médio | 0,00 |
| CPA via Ads | R$0,00 |
| CPA geral (org + Ads) | R$0,00 |
| Projeção 30 pedidos/dia | R$1.500,00 |
| Projeção 60 pedidos/dia | R$3.000,00 |
| Projeção 100 pedidos/dia | R$5.000,00 |`;

      case "CONCLUSÃO FINAL – PLANO RECOMENDADO":
        return markdown + `

## CONCLUSÃO FINAL – PLANO RECOMENDADO

A operação demonstra potencial de crescimento baseado nos dados analisados. Recomenda-se implementar as ações sugeridas com monitoramento constante dos indicadores principais. O foco deve estar na otimização das campanhas existentes e na melhoria da taxa de conversão através das estratégias apresentadas.

Para maximizar resultados, é fundamental manter disciplina na execução do plano e ajustar as estratégias conforme os resultados obtidos.`;
    }
  }
  
  return markdown;
}

// Função para fazer a requisição à OpenAI com retry
async function gerarAnaliseComOpenAI(
    basePrompt: string,
    imageMessages: any[],
    analysisType: "ads" | "account",
    maxRetries: number = 3
  ): Promise<string> {
    console.log("Prompt enviado para OpenAI (primeiros 200 chars):", basePrompt.slice(0,200));
    console.log("Quantidade de imagens:", imageMessages.length);
    console.log("Estrutura das mensagens:", JSON.stringify([
      { role: "system", content: basePrompt },
      ...imageMessages.map((img: any) => ({ role: "user", content: img }))
    ], null, 2));

    const messages = [
      { role: "system", content: basePrompt },
      ...imageMessages.map((img: any) => ({
        role: "user",
        content: [img],
      }))
    ];

    for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
      try {
        console.log(`Enviando requisição para OpenAI (tentativa ${tentativa})...`);
        const requestBody = {
          model: "gpt-4o",
          messages,
          max_tokens: 6000,
          temperature: 0,
        };

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro da OpenAI:", errorData);
          throw new Error(errorData.error?.message || "Erro desconhecido");
        }

        const data = await response.json();
        console.log("Resposta da OpenAI recebida:", JSON.stringify(data, null, 2).slice(0,1000));
        let markdownGerado = data.choices?.[0]?.message?.content || "";

        if (!markdownGerado.trim() || /i (can't|cannot|sorry|unable|not allowed|not able)/i.test(markdownGerado)) {
          console.warn("IA rejeitou ou não analisou. Completando com seções obrigatórias.");
          markdownGerado = "";
        }

        markdownGerado = validarSecoesObrigatorias(markdownGerado, analysisType);
        console.log("Markdown gerado após validação:", markdownGerado.slice(0,500));
        return markdownGerado;

      } catch (error) {
        console.error(`Tentativa ${tentativa} falhou:`, error);
        if (tentativa === maxRetries) {
          console.error("Todas as tentativas falharam. Retornando apenas seções obrigatórias.");
          return validarSecoesObrigatorias("", analysisType);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * tentativa));
      }
    }
    return validarSecoesObrigatorias("", analysisType);
  }

// Função para reorganizar as seções na ordem correta (ADS)
function reorganizarSecoesAds(markdown: string): string {
  const secoes = [
    { titulo: "# 🔍 VISÃO GERAL DO DESEMPENHO – ADS", regex: /# 🔍 VISÃO GERAL DO DESEMPENHO – ADS[\s\S]*?(?=\n# |\n## |$)/ },
    { titulo: "# 🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS", regex: /# 🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS[\s\S]*?(?=\n# |\n## |$)/ },
    { titulo: "# 📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS", regex: /# 📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS[\s\S]*?(?=\n# |\n## |$)/ },
    { titulo: "## 📈 PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA", regex: /## 📈 PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS\/DIA[\s\S]*?(?=\n# |\n## |$)/ },
    { titulo: "## RESUMO TÉCNICO", regex: /## RESUMO TÉCNICO[\s\S]*?(?=\n# |\n## |$)/ },
    { titulo: "## CONCLUSÃO FINAL – PLANO RECOMENDADO", regex: /## CONCLUSÃO FINAL – PLANO RECOMENDADO[\s\S]*?(?=\n# |\n## |$)/ },
  ];
  let novoMarkdown = "";
  for (const secao of secoes) {
    const match = markdown.match(secao.regex);
    if (match) novoMarkdown += match[0].trim() + "\n\n";
  }
  return novoMarkdown.trim();
}

// Função para forçar o RESUMO TÉCNICO como tabela
function forcarResumoTecnicoComoTabela(markdown: string): string {
  const resumoRegex = /## RESUMO TÉCNICO[\s\S]*?(?=\n# |\n## |$)/;
  const match = markdown.match(resumoRegex);
  if (!match) return markdown;
  let bloco = match[0];
  // Se já tem tabela, retorna
  if (bloco.includes('| Indicador |') && bloco.includes('| Valor Atual |')) return markdown;
  // Extrair indicadores e valores
  const indicadores = [
    'Investimento total em Ads',
    'Pedidos via Ads',
    'GMV via Ads',
    'ROAS médio',
    'CPA via Ads',
    'CPA geral (org + Ads)',
    'Projeção 30 pedidos/dia',
    'Projeção 60 pedidos/dia',
    'Projeção 100 pedidos/dia',
  ];
  let tabela = '\n| Indicador | Valor Atual |\n|-----------|-------------|\n';
  for (const ind of indicadores) {
    const regex = new RegExp(`${ind}[^\d\w\n\r]*([\d\.,R$]+)`, 'i');
    const val = bloco.match(regex)?.[1] || 'Dado não informado';
    tabela += `| ${ind} | ${val} |\n`;
  }
  const novoBloco = '## RESUMO TÉCNICO\n' + tabela + '\n';
  return markdown.replace(resumoRegex, novoBloco);
}

// Função para detectar placeholders na seção de projeção de escala
function projecaoTemPlaceholders(markdown: string): boolean {
  const projecaoRegex = /##? ?📈 PROJEÇÃO DE ESCALA[\s\S]*?(?=\n# |\n## |$)/i;
  const match = markdown.match(projecaoRegex);
  if (!match) return true; // Se não tem projeção, considera como placeholder
  const bloco = match[0];
  // Detecta se contém os valores padrão
  const padroes = [
    'R\$1.500,00', 'R\$3.000,00', 'R\$5.000,00',
    'ROAS projetado: 10,00', 'CPA estimado: R\$50,00'
  ];
  return padroes.every(p => new RegExp(p).test(bloco));
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    
    console.log("=== NOVA REQUISIÇÃO DE ANÁLISE ===");
    console.log("Tipo de análise:", body.analysisType);
    console.log("Número de imagens recebidas:", body.images?.length || 0);
    console.log("Cliente:", body.clientName || "Não informado");
    console.log("Primeiros 100 chars do prompt:", (body.analysisType === "ads" ? ADVANCED_ADS_PROMPT : ADVANCED_ACCOUNT_PROMPT).slice(0,100));

    // Validar dados de entrada
    if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
      console.log("Nenhuma imagem recebida!");
      return NextResponse.json(
        { error: "Imagens são obrigatórias" },
        { status: 400 }
      );
    }

    if (!body.analysisType || !["ads", "account"].includes(body.analysisType)) {
      console.log("Tipo de análise inválido:", body.analysisType);
      return NextResponse.json(
        { error: "Tipo de análise inválido" },
        { status: 400 }
      );
    }

    // Validar imagens base64
    const imagensValidas = body.images.filter(img => {
      if (!img || typeof img !== 'string') return false;
      // Verificar se é base64 válido
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(img) && img.length > 100; // Mínimo de 100 chars
    });
    console.log("Imagens válidas:", imagensValidas.length);
    if (imagensValidas.length === 0) {
      console.log("Nenhuma imagem válida após filtro base64!");
      return NextResponse.json(
        { error: "Nenhuma imagem válida fornecida" },
        { status: 400 }
      );
    }

    // Escolher prompt baseado no tipo de análise
    const reforco = "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    const basePrompt = body.analysisType === "ads" 
      ? `${ADVANCED_ADS_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
      : `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;
    console.log("Prompt final montado (primeiros 200 chars):", basePrompt.slice(0,200));

    // Mensagem de reforço antes das imagens
    const reforcoMensagem = {
      role: "user",
      content: [
        { type: "text", text: reforco }
      ]
    };

    // Preparar mensagens com imagens (igual ao frontend)
    const imageMessages = imagensValidas.map((img, index) => {
      const url = `data:image/jpeg;base64,${img.slice(0,30)}...`;
      console.log(`Preparando imagem ${index + 1} para envio:`, url);
      return {
        type: "image_url" as any,
        image_url: { 
          url: `data:image/jpeg;base64,${img}`
        },
      };
    });
    console.log("Exemplo de imageMessage:", JSON.stringify(imageMessages[0], null, 2));

    // Montar as mensagens para a OpenAI
    const messages = [
      { role: "system", content: basePrompt },
      reforcoMensagem,
      ...imageMessages.map((img: any) => ({
        role: "user",
        content: [img],
      }))
    ];

    let markdownFinal = "";
    let tentativas = 0;
    const maxTentativas = 3;
    if (body.analysisType === "ads") {
      do {
        tentativas++;
        markdownFinal = await gerarAnaliseComOpenAI(basePrompt, imageMessages, body.analysisType);
        markdownFinal = validarSecoesObrigatorias(markdownFinal, body.analysisType);
        markdownFinal = reorganizarSecoesAds(markdownFinal);
        markdownFinal = forcarResumoTecnicoComoTabela(markdownFinal);
        if (projecaoTemPlaceholders(markdownFinal)) break;
        console.warn(`Resposta incompleta (campos obrigatórios faltando ou padrão). Tentativa ${tentativas}/${maxTentativas}`);
      } while (tentativas < maxTentativas);
    } else {
      // Para análise de conta, aceitar a primeira resposta
      markdownFinal = await gerarAnaliseComOpenAI(basePrompt, imageMessages, body.analysisType);
      markdownFinal = validarSecoesObrigatorias(markdownFinal, body.analysisType);
    }
    
    console.log("=== ANÁLISE FINALIZADA ===");
    console.log(`Análise final gerada com ${markdownFinal.length} caracteres`);
    console.log("Primeiros 500 chars do markdown:", markdownFinal.slice(0,500));

    return NextResponse.json({
      analysis: markdownFinal,
      analysisType: body.analysisType,
      clientName: body.clientName || "Cliente",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erro no processamento:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erro interno do servidor",
        details: "Falha na geração da análise"
      },
      { status: 500 }
    );
  }
} 