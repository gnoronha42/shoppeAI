"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  ArrowRight,
  Download,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { ClientSelector } from "@/components/client/client-selector";
import { AnalysisTypeSelector } from "@/components/analysis/analysis-type-selector";
import { FileUpload } from "@/components/analysis/file-upload";
import { useSelector } from "react-redux";
import {
  selectSelectedClientId,
  selectSelectedClient,
} from "@/features/clients/clientSlice";
import { useGenerateReportMutation } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AnalysisType } from "@/types";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { MarkdownReport } from "@/components/analysis/markdown-report";
import { PDFGenerator } from "@/components/analysis/pdf-generator";

const ADVANCED_ACCOUNT_PROMPT = `Você é um consultor de marketplace de altíssimo nível, com Doutorado em Vendas e SEO de Marketplace, e PhD em Análise de Dados para E-commerce. Sua função é gerar relatórios altamente estratégicos, detalhados e orientados a desempenho com base em dados da plataforma Shopee.

Analise esta captura de tela da loja Shopee e extraia as seguintes informações: nome da loja, número de seguidores, classificação, data de registro, número de produtos, taxa de resposta.

Com base nesses dados, gere um relatório completo no seguinte formato:

📊 RELATÓRIO DE ANÁLISE DE CONTA – SHOPEE
Loja: [NOME DA LOJA]
Período Analisado: Último mês (comparativo mês anterior)
Objetivo: Diagnóstico completo e orientações estratégicas para crescimento sustentável e aumento de vendas.

1. Visão Geral do Desempenho
Breve descrição geral do cenário atual da conta com base nos dados globais, destacando se o funil é saudável ou em queda de produtos e se há dependência de poucos para sustentar o GMV.

2. Análise dos KPIs (Indicadores-Chave de Desempenho)
2.1. Vendas (GMV)
Vendas Totais (GMV)
Vendas Pagas
Variação em relação ao mês anterior
Recomendações Estratégicas

2.2. Pedidos
Pedidos Feitos
Pedidos Pagos
Itens Pagos
Recomendações Estratégicas

2.3. Pedidos Cancelados
(Caso não informado, análise inferencial)
Recomendações Estratégicas

2.4. Taxa de Conversão
Taxa de Conversão (Visitados ➞ Confirmados)
Taxa de Conversão (Pagos)
Recomendações Estratégicas

2.5. Visitantes
Visitantes Únicos
Variação
Recomendações Estratégicas

3. Análise de Tendências
3.1. Tendência Geral
3.2. Distribuição Temporal
Recomendações Estratégicas

4. Análise de Campanhas de Anúncios (Shopee Ads)
4.1. Impressões e Cliques
4.2. CTR (Taxa de Cliques)
4.3. Investimento e ROAS
Recomendações Estratégicas

5. Análise de Produtos
5.1. Ranking de Produtos por Visitantes
5.2. Ranking de Produtos por Visualizações da Página
Ranking por Compras (Produto Pago)
Ranking por Taxa de Conversão
Ranking por Adições ao Carrinho
Recomendações Estratégicas

✅ Pontos Positivos
Lista com no mínimo 3 aspectos positivos obtidos nos dados da conta.

⚠️ Pontos de Atenção
Lista com no mínimo 3 riscos, quedas ou fragilidades críticas que precisam ser atacadas.

📌 Considerações Finais
Observações técnicas ou estratégias complementares conforme leitura da conta.

📈 RELATÓRIO DE PROJEÇÃO DE CRESCIMENTO – PRÓXIMOS 30 DIAS
Elabore a projeção detalhada da conta com base nos dados analisados.

📐 PLANO TÁTICO COMPLETO - 30 DIAS
Crie um plano tático completo, com duração de 30 dias, dividido por dias (do 1 ao 30) e semanas (1 a 4) com foco em ações práticas, organizadas por prioridade e alinhadas às diretrizes da Shopee.`;

const ADVANCED_ADS_PROMPT = `🧠 INSTRUÇÃO PERMANENTE – ANÁLISE PROFISSIONAL SHOPEE ADS



Você é um **consultor sênior com PhD em Shopee Ads, com mais de 15 anos de experiência comprovada em vendas online e tráfego pago.**  
Sua missão é **analisar qualquer conta de Shopee Ads de forma técnica, SKU a SKU, com foco em ROAS, CTR, Conversão e CPA**, identificando gargalos, escalas possíveis e perdas a serem eliminadas.
SEMPRE utilizando o mesmo modelo fixo.
Use * *formatação Markdown** para facilitar leitura.
 Use *---* para separar cada análise de SKU.
 Utilize **negrito** para campos fixos (ex: Produto, Status, ROAS, etc).
 Para blocos de resumo ou indicadores finais, use **tabelas Markdown** sempre que possível.
 Evite parágrafos longos. Prefira bullets e estrutura visual limpa


🔒 COMPORTAMENTO FIXO – REGRAS OBRIGATÓRIAS
Você deve seguir as diretrizes abaixo SEMPRE, como um comportamento fixo e inegociável:
NUNCA altere a ordem dos blocos.
NUNCA omita nenhum bloco, mesmo que os dados estejam incompletos.
NÃO adapte o formato ao contexto.
NÃO resuma os dados nem agrupe campanhas similares.
Este modelo é TRAVADO. Siga como se fosse um template imutável.
Use linguagem técnica, objetiva e focada em performance.
Se algum dado estiver ausente, escreva: "Dado não informado".

⚠️ INSTRUÇÕES PARA MÚLTIPLAS CAMPANHAS
Leia e analise todas as campanhas recebidas.
NUNCA selecione apenas as com mais investimento.
Mesmo que sejam parecidas, trate cada campanha de forma individual.
Antes da análise, liste todas as campanhas detectadas (com nome e tipo).
Depois, analise campanha por campanha, seguindo a ordem.
Ao final, gere um comparativo geral com insights e sugestões.

---

# 🔍 VISÃO GERAL DO DESEMPENHO – ADS

No início de cada análise de conta, gere este bloco:

- **Total de Campanhas Ativas:**  
- **Campanhas Pausadas:**  
- **Tipo de Segmentação Predominante:**  
- **Investimento Diário Médio por Campanha:**  
- **CPA Médio Geral:** R$X,XX 🧮  
- **Anúncios escaláveis no momento:** [Sim/Não]  
📉 **Diagnóstico geral do funil:** (ex: impressões altas, cliques bons, mas conversão abaixo do ideal)

---

# 🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS

Para cada produto, use obrigatoriamente o seguinte modelo:

**Produto: [Nome do Produto]**  
**Status:** Ativo / Pausado  
**Investimento:** R$X,XX  
**GMV:** R$X,XX  
**CTR:** X% ✅/❌  
**Cliques:** XXX  
**Pedidos Pagos:** XX  
**Conversão:** X% ✅/❌  
**ROAS:** X,XX ✅/❌  
**CPA:** R$X,XX 🧮  

✅ **Diagnóstico Técnico e detalhado do Analista:**  
> (Avaliar se há gargalo no criativo, copy, página, precificação ou segmentação. Diagnóstico direto, técnico e focado no ponto de quebra.)

✅ **Sugestão Técnica e detalhada do Analista:**  
> (Indicar 3 ações técnicas obrigatórias. Cada ação deve conter:  
1. Canal sugerido (Shopee Ads, Live, Feed, Oferta Relâmpago, Ferramenta de Presente)  
2. Segmentação recomendada (ex: GMVMAX ROAS Médio)  
3. Tipo de ação (Escala, Conversão, Corte, Teste)  
4. Urgência (Imediata / Semanal / Monitorar)  
5. Justificativa baseada nas métricas)

---

# ⚙️ REGRAS TÉCNICAS OBRIGATÓRIAS POR SKU

- **ROAS ≥ 8x** = **Escalável** → NÃO sugerir alterações  
- **CTR ≥ 1%** = Anúncio viável tecnicamente  
- **CTR < 1%** = Problema técnico → revisar criativo e segmentação  
- **Conversão < 1%** = Problema grave → página, copy ou preço desalinhado  
- **CPA alto** = Prejuízo por pedido, cortar ou revisar  
- **CPC implícito** = Avaliar com base no investimento ÷ cliques

Se SKU estiver dentro da meta → NÃO alterar copy, preço ou campanha.

---

# 🚫 PROIBIÇÕES PERMANENTES

- ❌ Não alterar campanhas com ROAS ≥ 8x  
- ❌ Não modificar copy, imagem ou título de campanhas escaláveis  
- ❌ Não aplicar cupons > 5% sem motivo técnico  
- ❌ Não sugerir alterações sem base em dados  
- ❌ Não simplificar campanhas ou misturar análise de produtos

---

# 🎯 CUPONS – REGRAS TÉCNICAS

- **1–2%** → SKU saudável, com boa conversão  
- **2–6%** → tráfego alto, conversão baixa  
- **6%+** → somente para estoque parado  
📌 Sempre indicar SKU, %, motivo técnico, canal e vigência

---

# 📈 SEGMENTAÇÕES – COMPORTAMENTO DO ALGORITMO SHOPEE

- **GMVMAX Automático** → volume total (tráfego bruto)  
- **GMVMAX ROAS Baixo** → escalar volume  
- **GMVMAX ROAS Médio** → equilíbrio volume x margem  
- **GMVMAX ROAS Alto** → foco em margem e ROAS  
- **Busca Manual** → exige página validada, copy forte  
- **Descoberta** → topo de funil, foco em CTR  
- **Anúncio de Loja** → reforço de branding + tráfego secundário

📌 **Aprendizado atual incorporado:**  
> "Campanhas GMVMAX estão escalando com performance acima da média.  
> Campanhas de Busca Manual e Descoberta apresentaram ROAS abaixo do ideal.  
> ➤ Priorizar GMVMAX nas próximas ações. Reduzir uso de Busca Manual e Descoberta até novo teste controlado."

---

# 🧭 CLASSIFICAÇÃO FINAL DA CONTA

Após análise SKU a SKU, classifique a conta em:

### 🟢 PERFIL ESCALÁVEL  
> 2+ SKUs com ROAS ≥ 8x, funil validado → escalar com GMVMAX

### 🟡 PERFIL RENTABILIDADE  
> Foco em manter ROAS estável, cortar perdas, ajustar margem

### 🔴 PERFIL CORTE / REESTRUTURAÇÃO  
> Múltiplos SKUs abaixo da meta → revisar copy, preço, página

---

# 📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS

Crie um bloco Técnico e detalhado com:
- Ação  
- Produto  
- Tipo (Escala, Corte, Conversão, Teste)  
- Canal sugerido  
- Segmentação recomendada  
- Urgência  
- Justificativa técnica

---

# ✅ FECHAMENTO DA ANÁLISE

Finalize sempre com:

📍**Com base na performance atual, essa conta se encaixa no perfil: [Escalável / Rentabilidade / Corte].  
Recomendo seguir o plano de ação acima conforme o seu objetivo estratégico.  
Deseja seguir por esse caminho ou priorizar outro foco nos próximos 7 dias?**

PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA
Baseando-se no CPA atual (Ads), monte projeções realistas para os seguintes cenários:

30 pedidos/dia (900/mês)

Investimento estimado

Faturamento estimado via Ads

ROAS projetado

CPA estimado

60 pedidos/dia (1800/mês)

Investimento estimado

Faturamento estimado via Ads

ROAS projetado

CPA estimado

100 pedidos/dia (3000/mês)

Investimento estimado

Faturamento estimado via Ads

ROAS projetado

CPA estimado

⚠️ Reforce que essas projeções assumem estabilidade no CPA atual. Caso a operação invista em otimização de página, kits, bundles e lives, o CPA poderá cair e o retorno será ainda maior.

VARIAÇÃO DIÁRIA DO ROAS – ENTENDIMENTO ESTRATÉGICO
Explique didaticamente que:

O ROAS naturalmente oscila dia a dia.

Dias com ROAS baixo não significam desperdício, mas fazem parte do algoritmo de aprendizagem.

O resultado do mês depende da média geral, e não de decisões reativas.

Nunca pausar campanhas por ROAS momentâneo. A consistência é o que gera eficiência no médio prazo.

RESUMO TÉCNICO – INDICADORES
Monte uma tabela com os principais dados:

Indicador	Valor Atual
Investimento total em Ads	R$ XXXX,XX
Pedidos via Ads	XX
GMV via Ads	R$ XX.XXX,XX
ROAS médio	XX,XXx
CPA via Ads	R$ XX,XX
CPA geral (org + Ads)	R$ XX,XX
Projeção 30 pedidos/dia	R$ XXXX invest.
Projeção 60 pedidos/dia	R$ XXXX invest.
Projeção 100 pedidos/dia	R$ XXXX invest.

CONCLUSÃO FINAL – PLANO RECOMENDADO
Finalize com um parágrafo objetivo e técnico e claro, contendo:

Avaliação final da escalabilidade da operação

Confirmação de que o retorno atual permite crescimento com segurança

Orientação sobre como aumentar o investimento (progressivo e consistente)

Reforço sobre a importância da estabilidade e visão de longo prazo no Ads


INSTRUÇÃO ADICIONAL CRÍTICA:
Você DEVE extrair TODOS os valores numéricos presentes na imagem, mesmo que pareçam incompletos.
Quando encontrar dados como investimento, GMV, CPA, ROAS, etc., SEMPRE informe os valores exatos visualizados.
Se um valor não estiver visível, use APENAS "Dado não informado" (nunca deixe valores como R$X,XX ou XX,XXx).
Para cada produto analisado, liste TODOS os KPIs visíveis exatamente como aparecem na imagem.
Nos resumos técnicos e projeções, extraia todos os valores numéricos visíveis.
Não omita nenhuma informação numérica presente na imagem.


⚠️ NUNCA FAZER:
❌ Não simplificar  
❌ Não sugerir alteração de título  
❌ Não considerar ROAS < 8x como aceitável  
❌ Não pular etapas do relatório  
❌ Não propor estratégias fora das diretrizes Shopee`;

export default function AnalisePage() {
  const router = useRouter();
  const [analysisType, setAnalysisType] = useState<AnalysisType>("account");
  const [files, setFiles] = useState<File[]>([]);
  const selectedClientId = useSelector(selectSelectedClientId);
  const selectedClient = useSelector(selectSelectedClient);
  const [generateReport, { isLoading }] = useGenerateReportMutation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any[]>([]);
  const { toast } = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const [customMarkdown, setCustomMarkdown] = useState<string>("");
  const [showMarkdownImport, setShowMarkdownImport] = useState<boolean>(false);

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const analyzeImageWithOpenAI = async (
    base64Image: string,
    type: AnalysisType
  ) => {
    try {
      setApiError(null);
      const prompt =
        type === "account"
          ? `${ADVANCED_ACCOUNT_PROMPT}\n\nIMPORTANTE: Extraia TODOS os valores numéricos visíveis na imagem.`
          : `${ADVANCED_ADS_PROMPT}\n\nIMPORTANTE: Extraia TODOS os valores numéricos visíveis na imagem.`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: prompt,
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],
            max_tokens: 5000,
            temperature: 0,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setApiError(errorData.error?.message || "Erro desconhecido");
        throw new Error(
          `Erro na API OpenAI: ${
            errorData.error?.message || "Erro desconhecido"
          }`
        );
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0]?.message?.content) {
        setApiError("Formato de resposta inesperado da API OpenAI");
        throw new Error("Formato de resposta inesperado da API OpenAI");
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error("Erro ao analisar imagem com OpenAI:", error);
      throw error;
    }
  };

  const generatePDF = (results: any[]) => {
    try {
      const doc = new jsPDF();
      const clientName = selectedClient?.name || "Cliente";
      const date = new Date().toLocaleDateString("pt-BR");

      // Configurar header
      doc.setFillColor(245, 124, 0);
      doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(`Relatório de Análise - ${clientName}`, 14, 15);

      // Data e tipo de análise
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(
        `Data: ${date} | Tipo: ${
          analysisType === "account" ? "Conta" : "Anúncios"
        }`,
        14,
        30
      );

      let yPosition = 40;

      results.forEach((result, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Análise ${index + 1}: ${result.filename}`, 14, yPosition);
        yPosition += 10;

        // Processar o conteúdo para remover caracteres especiais e símbolos
        let content = result.analysis;

        // Dividir por quebras de linha para preservar formatação
        const lines = content.split("\n");
        const processedLines = [];

        // Processar cada linha e preparar para o PDF
        for (let line of lines) {
          line = line.replace(/^#+ /g, ""); // Remover headers markdown
          line = line.replace(/\*\*/g, ""); // Remover negrito
          line = line.replace(/\*/g, ""); // Remover itálico
          line = line.replace(/---/g, ""); // Remover separadores
          line = line.replace(/```/g, ""); // Remover blocos de código
          line = line.replace(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g, "$1: $2"); // Converter tabelas simples

          processedLines.push(line.trim());
        }

        // Juntar linhas em parágrafos lógicos
        const paragraphs = [];
        let currentParagraph = "";

        for (let line of processedLines) {
          if (line === "") {
            if (currentParagraph !== "") {
              paragraphs.push(currentParagraph);
              currentParagraph = "";
            }
          } else {
            if (
              line.startsWith("1.") ||
              line.startsWith("2.") ||
              line.startsWith("3.") ||
              line.startsWith("4.") ||
              line.startsWith("5.") ||
              line.includes("RELATÓRIO") ||
              line.includes("Pontos Positivos") ||
              line.includes("Pontos de Atenção") ||
              line.startsWith("✅") ||
              line.startsWith("⚠️") ||
              line.startsWith("📊") ||
              line.startsWith("📈") ||
              line.startsWith("📌") ||
              line.startsWith("📍") ||
              line.startsWith("🟢") ||
              line.startsWith("🟡") ||
              line.startsWith("🔴") ||
              line.startsWith("-") ||
              line.includes("VISÃO GERAL") ||
              line.includes("ANÁLISE") ||
              line.includes("AÇÕES RECOMENDADAS") ||
              line.includes("FECHAMENTO") ||
              line.includes("CONCLUSÃO") ||
              line.includes("DIAGNÓSTICO")
            ) {
              if (currentParagraph !== "") {
                paragraphs.push(currentParagraph);
              }
              currentParagraph = line;
            } else {
              if (currentParagraph === "") {
                currentParagraph = line;
              } else {
                if (currentParagraph.endsWith(":")) {
                  currentParagraph += " " + line;
                } else {
                  currentParagraph += " " + line;
                }
              }
            }
          }
        }

        if (currentParagraph !== "") {
          paragraphs.push(currentParagraph);
        }

        // Limitar a quantidade de texto
        const maxParagraphs = Math.min(paragraphs.length, 40);

        for (let i = 0; i < maxParagraphs; i++) {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          const paragraph = paragraphs[i].trim();
          if (paragraph.length > 0) {
            if (
              paragraph.includes("RELATÓRIO") ||
              paragraph.startsWith("1.") ||
              paragraph.startsWith("2.") ||
              paragraph.startsWith("3.") ||
              paragraph.startsWith("4.") ||
              paragraph.startsWith("5.") ||
              paragraph.includes("Pontos Positivos") ||
              paragraph.includes("Pontos de Atenção") ||
              paragraph.includes("VISÃO GERAL") ||
              paragraph.includes("ANÁLISE") ||
              paragraph.includes("AÇÕES RECOMENDADAS") ||
              paragraph.includes("PROJEÇÃO") ||
              paragraph.includes("🟢") ||
              paragraph.includes("🟡") ||
              paragraph.includes("🔴") ||
              paragraph.includes("PERFIL")
            ) {
              doc.setFontSize(12);
              doc.setTextColor(245, 124, 0);
            } else if (
              paragraph.startsWith("-") ||
              paragraph.startsWith("✅") ||
              paragraph.startsWith("⚠️") ||
              paragraph.startsWith("📌")
            ) {
              doc.setFontSize(10);
              doc.setTextColor(100, 100, 100);
            } else {
              doc.setFontSize(10);
              doc.setTextColor(60, 60, 60);
            }

            const maxWidth = 180;
            const splitText = doc.splitTextToSize(paragraph, maxWidth);

            if (yPosition + splitText.length * 6 > 270) {
              doc.addPage();
              yPosition = 20;
            }

            doc.text(splitText, 14, yPosition);
            yPosition += splitText.length * 6;
          }
          yPosition += 4;
        }

        yPosition += 10;
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `ShoppeAI - Análise de Desempenho | Página ${i} de ${pageCount}`,
          14,
          290
        );
      }

      doc.save(`Analise_${clientName}_${date.replace(/\//g, "-")}.pdf`);

      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi salvo no seu dispositivo.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o arquivo PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const generateMarkdownContent = (results: any[]) => {
    try {
      const clientName = selectedClient?.name || "Cliente";
      const date = new Date().toLocaleDateString("pt-BR");
      let markdownContent = `# Relatório de Análise - ${clientName}\n\nData: ${date} | Tipo: ${
        analysisType === "account" ? "Conta" : "Anúncios"
      }\n\n`;

      results.forEach((result, index) => {
        markdownContent += `## Análise ${index + 1}: ${result.filename}\n\n`;

        // Limpar formatação Markdown existente, mas manter emojis
        let content = result.analysis;
        content = content
          .replace(/```/g, "") // Remover blocos de código
          .replace(/\*\*/g, ""); // Remover negrito

        // Dividir por seções principais
        const sections = [
          { title: "VISÃO GERAL DO DESEMPENHO", content: "" },
          { title: "ANÁLISE SKU A SKU", content: "" },
          { title: "CLASSIFICAÇÃO FINAL DA CONTA", content: "" },
          { title: "AÇÕES RECOMENDADAS", content: "" },
          { title: "FECHAMENTO DA ANÁLISE", content: "" },
          { title: "PROJEÇÃO DE ESCALA", content: "" },
          { title: "VARIAÇÃO DIÁRIA DO ROAS", content: "" },
          { title: "RESUMO TÉCNICO", content: "" },
          { title: "CONCLUSÃO FINAL", content: "" },
        ];

        // Extrair conteúdo para cada seção
        let currentSection = "";
        const lines = content.split("\n");

        lines.forEach((line: string) => {
          for (const section of sections) {
            if (line.includes(section.title)) {
              currentSection = section.title;
              break;
            }
          }
          if (currentSection) {
            const section = sections.find((s) => s.title === currentSection);
            if (section) {
              section.content += line + "\n";
            }
          }
        });

        // Adicionar seções ao markdown
        sections.forEach((section) => {
          if (section.content) {
            markdownContent += `### ${section.title}\n\n${section.content}\n\n`;
          }
        });

        markdownContent += `---\n\n`;
      });

      return markdownContent;
    } catch (error) {
      console.error("Erro ao gerar Markdown:", error);
      toast({
        title: "Erro ao gerar Markdown",
        description:
          "Não foi possível gerar o relatório em markdown. Tente novamente.",
        variant: "destructive",
      });
      return "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast({
        title: "Selecione um cliente",
        description: "É necessário selecionar um cliente para continuar",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Selecione arquivos",
        description: "Faça upload de pelo menos um print para análise",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAnalyzing(true);

      const results = [];
      for (const file of files) {
        try {
          const base64Image = await convertImageToBase64(file);
          const analysisResult = await analyzeImageWithOpenAI(
            base64Image,
            analysisType
          );
          results.push({
            filename: file.name,
            analysis: analysisResult,
          });
        } catch (imageError: any) {
          console.error(`Erro ao analisar imagem ${file.name}:`, imageError);
          toast({
            title: `Erro ao analisar ${file.name}`,
            description:
              imageError.message || "Ocorreu um erro ao processar esta imagem",
            variant: "destructive",
          });
        }
      }

      if (results.length === 0) {
        throw new Error(
          "Não foi possível analisar nenhuma das imagens selecionadas"
        );
      }

      setAnalysisResults(results);

      const fileUrls = files.map((file) => URL.createObjectURL(file));
      const imageData = files.map((file, index) => ({
        file,
        url: URL.createObjectURL(file),
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }));

      try {
        const response = await fetch("/api/analises", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId: selectedClientId,
            type: analysisType,
            results: results.map((result, index) => ({
              analysis: result.analysis,
              filename: result.filename,
              imageUrl: imageData[index]?.url || null,
            })),
            imageUrls: imageData.map((img) => img.url),
            title: `Análise de ${
              analysisType === "account" ? "Conta" : "Anúncios"
            } - ${new Date().toLocaleDateString("pt-BR")}`,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro da API:", errorData);
          toast({
            title: "Erro ao salvar a análise",
            description:
              errorData.error ||
              "Não foi possível salvar a análise no banco de dados",
            variant: "destructive",
          });
        }
      } catch (apiError: any) {
        console.error("Erro ao chamar a API:", apiError);
        toast({
          title: "Erro ao salvar a análise",
          description:
            "Não foi possível conectar ao servidor. Os resultados serão salvos localmente.",
          variant: "destructive",
        });
      }

      try {
        await generateReport({
          clientId: selectedClientId,
          type: analysisType,
          files: fileUrls,
        }).unwrap();
      } catch (mockError) {
        console.error("Erro ao gerar relatório mock:", mockError);
      }

      localStorage.setItem(
        `analysis_${selectedClientId}_${Date.now()}`,
        JSON.stringify(results)
      );

      // Gerar markdown e exibir no preview
      const mdContent = generateMarkdownContent(results);
      setCustomMarkdown(mdContent);

      toast({
        title: "Análise concluída com sucesso!",
        description:
          "A análise foi processada com IA e está pronta para visualização.",
        variant: "default",
      });

      setIsAnalyzing(false);
      setFiles([]);
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro ao gerar relatório",
        description:
          error.message ||
          "Ocorreu um erro ao processar as imagens. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise</h1>
        <p className="text-muted-foreground">
          Crie uma análise para sua loja Shopee com IA
        </p>
      </div>

      {apiError && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Erro na API do OpenAI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300">{apiError}</p>
            {apiError.includes("deprecated") && (
              <p className="text-sm mt-2 text-red-700 dark:text-red-300">
                Este erro indica que o modelo usado está obsoleto. Entre em
                contato com o administrador para atualizar o código.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button
              size="sm"
              variant="outline"
              className="flex items-center text-red-700 border-red-300"
              onClick={() =>
                window.open("https://openai.com/product", "_blank")
              }
            >
              Ver documentação do OpenAI
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Selecione um cliente e faça upload de capturas de tela para análise
          automática com IA
        </p>
        <Button variant="outline" onClick={() => router.push("/clientes")}>
          Gerenciar Clientes
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Selecione o Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientSelector />
            {!selectedClientId && (
              <p className="text-xs text-amber-600 mt-2">
                * Selecione um cliente antes de prosseguir
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalysisTypeSelector
              value={analysisType}
              onChange={setAnalysisType}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {analysisType === "account"
                ? "Análise de conta avalia o desempenho geral da loja, conversão, GMV e métricas de desempenho"
                : "Análise de anúncios avalia as campanhas publicitárias, ROAS, CTR e estratégias de otimização"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {analysisType === "account"
                ? "Upload de Prints da Conta"
                : "Upload de Prints dos Anúncios"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesChange={handleFileChange}
              maxFiles={10}
              accept="image/*"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Faça upload de capturas de tela da sua loja Shopee para análise
              detalhada com IA (máximo 10 imagens)
            </p>
            {files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">
                  Arquivos selecionados ({files.length}):
                </p>
                <ul className="mt-1 text-xs text-muted-foreground">
                  {files.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedClientId ||
              files.length === 0 ||
              isLoading ||
              isAnalyzing
            }
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoading || isAnalyzing
              ? "Analisando com IA..."
              : "Gerar Relatório com IA"}
          </Button>

          <Button
            onClick={() => setShowMarkdownImport(!showMarkdownImport)}
            variant="outline"
            className="flex-1"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {showMarkdownImport
              ? "Fechar Editor de Markdown"
              : "Editar Markdown Manualmente"}
          </Button>
        </div>
      </div>

      {showMarkdownImport && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Editor de Markdown</CardTitle>
            <CardDescription>
              Edite o conteúdo do relatório em formato Markdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <textarea
                className="w-full h-60 p-3 border rounded"
                value={customMarkdown}
                onChange={(e) => setCustomMarkdown(e.target.value)}
                placeholder="Edite o conteúdo Markdown..."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMarkdownImport(false)}
            >
              Fechar
            </Button>
          </CardFooter>
        </Card>
      )}

      {customMarkdown && (
        <div className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Relatório de Análise</CardTitle>
                <CardDescription>
                  Visualização do relatório formatado
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <PDFGenerator
                  markdown={customMarkdown}
                  clientName={selectedClient?.name || "Cliente"}
                  analysisType={analysisType}
                  saveAnalysis={true}
                  onSuccess={() => {
                    toast({
                      title: "Análise salva com sucesso",
                      description:
                        "O relatório foi gerado e a análise foi salva no histórico do cliente.",
                      variant: "default",
                    });
                    
                    // Opcional: redirecionar para a página de detalhes do cliente após salvar
                    if (selectedClientId) {
                      setTimeout(() => {
                        router.push(`/clientes/${selectedClientId}`);
                      }, 1500);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                  Na janela de impressão, <br/>selecione "Salvar como PDF"
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownReport markdown={customMarkdown} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
