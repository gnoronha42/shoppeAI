import { NextRequest, NextResponse } from "next/server";
import {
  ADVANCED_ADS_PROMPT,
  ADVANCED_ACCOUNT_PROMPT,
} from "../../../../components/analysis/analysis";

export const dynamic = 'force-dynamic';

interface AnalysisRequest {
  images: string[];
  analysisType: "ads" | "account";
  clientName?: string;
  ocrTexts?: string[];
}

// Seções obrigatórias para Shopee Ads
const secoesAds = [
  "VISÃO GERAL DO DESEMPENHO – ADS",
  "ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS",
  "AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS",
  "PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA",
  "RESUMO TÉCNICO",
  "CONCLUSÃO FINAL – PLANO RECOMENDADO",
];

// Placeholders do template que não podem aparecer no resultado final
const valoresExemplo = [
  "R$1.500,00",
  "R$3.000,00",
  "R$5.000,00",
  "R$15.000,00",
  "R$30.000,00",
  "R$50.000,00",
  "10,00",
  "0,00",
  "0%",
  "Produto Principal",
  "XX",
  "XXX",
  "X,XX",
  "X%",
  "R$X,XX",
  "R$XX,XX",
  "R$XX.XXX,XX",
];

// Função para detectar se uma seção já existe (tolerante a emojis, #, espaços)
function contemSecao(markdown: string, secao: string): boolean {
  const cleanSecao = secao
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const regex = new RegExp(`#*\\s*[📊🔍🔎📦📈]*\\s*${cleanSecao}`, "i");
  return regex.test(markdown.replace(/[^\w\s#]/gi, ""));
}

// Adiciona seção faltante (sempre sem emoji para facilitar deduplicação)
function adicionarSecaoFaltante(
  markdown: string,
  secao: string,
  analysisType: "ads" | "account"
): string {
  if (analysisType === "ads") {
    switch (secao) {
      case "VISÃO GERAL DO DESEMPENHO – ADS":
        return `# VISÃO GERAL DO DESEMPENHO – ADS

- **Total de Campanhas Ativas:** Dado não informado
- **Campanhas Pausadas:** Dado não informado  
- **Tipo de Segmentação Predominante:** Dado não informado
- **Investimento Diário Médio por Campanha:** Dado não informado
- **CPA Médio Geral:** Dado não informado 🧮  
- **Anúncios escaláveis no momento:** Dado não informado
📉 **Diagnóstico geral do funil:** Dado não informado

${markdown}`;
      case "ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS":
        return (
          markdown +
          `

# ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS

**Produto: Dado não informado**  
**Status:** Dado não informado  
**Investimento:** Dado não informado  
**GMV:** Dado não informado  
**CTR:** Dado não informado  
**Cliques:** Dado não informado  
**Pedidos Pagos:** Dado não informado  
**Conversão:** Dado não informado  
**ROAS:** Dado não informado  
**CPA:** Dado não informado  

✅ **Diagnóstico Técnico e detalhado do Analista:**  
> Dado não informado

✅ **Sugestão Técnica e detalhada do Analista:**  
> Dado não informado`
        );
      case "AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS":
        return (
          markdown +
          `

# AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS

| Ação | Produto | Tipo | Canal | Detalhe Técnico | Urgência |
|------|---------|------|-------|----------------|----------|
| Dado não informado | Dado não informado | Dado não informado | Dado não informado | Dado não informado | Dado não informado |`
        );
      case "PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA":
        return (
          markdown +
          `

## PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA

### 30 pedidos/dia (900/mês)
- **Investimento estimado:** Dado não informado
- **Faturamento estimado via Ads:** Dado não informado
- **ROAS projetado:** Dado não informado
- **CPA estimado:** Dado não informado

### 60 pedidos/dia (1800/mês)
- **Investimento estimado:** Dado não informado
- **Faturamento estimado via Ads:** Dado não informado
- **ROAS projetado:** Dado não informado
- **CPA estimado:** Dado não informado

### 100 pedidos/dia (3000/mês)
- **Investimento estimado:** Dado não informado
- **Faturamento estimado via Ads:** Dado não informado
- **ROAS projetado:** Dado não informado
- **CPA estimado:** Dado não informado

⚠️ **Importante:** Essas projeções assumem estabilidade no CPA atual.`
        );
      case "RESUMO TÉCNICO":
        return (
          markdown +
          `

## RESUMO TÉCNICO

| Indicador | Valor Atual |
|-----------|-------------|
| Investimento total em Ads | Dado não informado |
| Pedidos via Ads | Dado não informado |
| GMV via Ads | Dado não informado |
| ROAS médio | Dado não informado |
| CPA via Ads | Dado não informado |
| CPA geral (org + Ads) | Dado não informado |
| Projeção 30 pedidos/dia | Dado não informado |
| Projeção 60 pedidos/dia | Dado não informado |
| Projeção 100 pedidos/dia | Dado não informado |`
        );
      case "CONCLUSÃO FINAL – PLANO RECOMENDADO":
        return (
          markdown +
          `

## CONCLUSÃO FINAL – PLANO RECOMENDADO

Dado não informado.`
        );
    }
  }
  return markdown;
}

// Valida se todas as seções obrigatórias estão presentes
function validarSecoesObrigatorias(
  markdown: string,
  analysisType: "ads" | "account"
): string {
  if (analysisType === "ads") {
    for (const secao of secoesAds) {
      if (!contemSecao(markdown, secao)) {
        markdown = adicionarSecaoFaltante(markdown, secao, analysisType);
      }
    }
  }
  return markdown;
}

// Remove valores de exemplo do template
function removerValoresExemplo(markdown: string): string {
  for (const valor of valoresExemplo) {
    const regex = new RegExp(valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    markdown = markdown.replace(regex, "Dado não informado");
  }
  return markdown;
}

// Limpa concatenações como "R$3.50Dado não informado"
function limparConcatenacoes(markdown: string): string {
  return markdown.replace(/([R\$0-9\.,]+)Dado não informado/g, (m, p1) =>
    p1.trim()
  );
}

// Reorganiza as seções na ordem correta e remove duplicatas
function reorganizarSecoesAds(markdown: string): string {
  let novoMarkdown = "";
  for (const secao of secoesAds) {
    // Regex tolerante a emojis, #, espaços
    const regex = new RegExp(
      `#*\\s*[📊🔍🔎📦📈]*\\s*${secao}[\\s\\S]*?(?=\\n#+\\s*[📊🔍🔎📦📈]*\\s*|$)`,
      "i"
    );
    const match = markdown.match(regex);
    if (match) {
      novoMarkdown += match[0].trim() + "\n\n";
    } else {
      novoMarkdown += adicionarSecaoFaltante("", secao, "ads").trim() + "\n\n";
    }
  }
  return novoMarkdown.trim();
}

// Força o RESUMO TÉCNICO como tabela
function forcarResumoTecnicoComoTabela(markdown: string): string {
  const resumoRegex = /## RESUMO TÉCNICO[\s\S]*?(?=\n# |\n## |$)/;
  const match = markdown.match(resumoRegex);
  if (!match) return markdown;
  let bloco = match[0];
  if (bloco.includes("| Indicador |") && bloco.includes("| Valor Atual |"))
    return markdown;
  const indicadores = [
    "Investimento total em Ads",
    "Pedidos via Ads",
    "GMV via Ads",
    "ROAS médio",
    "CPA via Ads",
    "CPA geral (org + Ads)",
    "Projeção 30 pedidos/dia",
    "Projeção 60 pedidos/dia",
    "Projeção 100 pedidos/dia",
  ];
  let tabela = "\n| Indicador | Valor Atual |\n|-----------|-------------|\n";
  for (const ind of indicadores) {
    const regex = new RegExp(`${ind}[^\n\r|]*([^\n\r|]*)`, "i");
    const val = bloco.match(regex)?.[1]?.trim() || "Dado não informado";
    tabela += `| ${ind} | ${val || "Dado não informado"} |\n`;
  }
  const novoBloco = "## RESUMO TÉCNICO\n" + tabela + "\n";
  return markdown.replace(resumoRegex, novoBloco);
}

// Função para fazer a requisição à IA (OpenAI ou outro endpoint)
async function gerarAnaliseComIA(
  basePrompt: string,
  imageMessages: any[],
  analysisType: "ads" | "account",
  ocrTexts: string[],
  maxRetries: number = 1
): Promise<string> {
  const messages = [
    { role: "system", content: basePrompt },
    ...ocrTexts.map((text) => ({ role: "user", content: text })),
    ...imageMessages.map((img: any) => ({
      role: "user",
      content: [img],
    })),
  ];

  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      const requestBody = {
        model: "gpt-4.1",
        messages,
        max_tokens: 6000,
        temperature: 0,
        top_p: 1,
      };

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro desconhecido");
      }

      const data = await response.json();
      let markdownGerado = data.choices?.[0]?.message?.content || "";

      if (
        !markdownGerado.trim() ||
        /i (can't|cannot|sorry|unable|not allowed|not able)/i.test(
          markdownGerado
        )
      ) {
        markdownGerado = "";
      }

      return markdownGerado;
    } catch (error) {
      if (tentativa === maxRetries) {
        return validarSecoesObrigatorias("", analysisType);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * tentativa));
    }
  }
  return validarSecoesObrigatorias("", analysisType);
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const ocrTexts = body.ocrTexts || [];
    if (
      !body.images ||
      !Array.isArray(body.images) ||
      body.images.length === 0
    ) {
      return NextResponse.json(
        { error: "Imagens são obrigatórias" },
        { status: 400 }
      );
    }
    if (!body.analysisType || !["ads", "account", "express", "whatsapp-consultivo"].includes(body.analysisType)) {
      return NextResponse.json(
        { error: "Tipo de análise inválido" },
        { status: 400 }
      );
    }

    // Validação de imagens base64
    const imagensValidas = body.images.filter((img) => {
      if (!img || typeof img !== "string") return false;
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(img) && img.length > 100;
    });
    if (imagensValidas.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem válida fornecida" },
        { status: 400 }
      );
    }

    // Montagem do prompt
    const reforco =
      "ATENÇÃO: Utilize apenas os valores reais extraídos das imagens abaixo. NUNCA use valores de exemplo do template. Se não conseguir extrair algum valor, escreva exatamente 'Dado não informado'. NÃO repita exemplos do template sob nenhuma circunstância.";
    const basePrompt =
      body.analysisType === "ads"
        ? `${ADVANCED_ADS_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
        : `${ADVANCED_ACCOUNT_PROMPT}\n\n${reforco}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`;

    const imageMessages = imagensValidas.map((img) => ({
      type: "image_url" as any,
      image_url: { url: `data:image/jpeg;base64,${img}` },
    }));

    let markdownFinal = "";
    let tentativas = 0;
    const maxTentativas = 3;
    if (body.analysisType === "ads") {
      do {
        tentativas++;
        markdownFinal = await gerarAnaliseComIA(
          basePrompt,
          imageMessages,
          body.analysisType,
          ocrTexts
        );
      } while (
        tentativas < maxTentativas &&
        markdownFinal.includes("R$1.500,00")
      );
    } else {
      markdownFinal = await gerarAnaliseComIA(
        basePrompt,
        imageMessages,
        body.analysisType,
        ocrTexts
      );
    }

    return NextResponse.json({
      analysis: markdownFinal,
      analysisType: body.analysisType,
      clientName: body.clientName || "Cliente",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
        details: "Falha na geração da análise",
      },
      { status: 500 }
    );
  }
}
