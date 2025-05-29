"use client";

import { useEffect, useState, useCallback, use } from "react";
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
import "jspdf-autotable";
import { MarkdownReport } from "@/components/analysis/markdown-report";
import { PDFGenerator } from "@/components/analysis/pdf-generator";
import {
  ADVANCED_ACCOUNT_PROMPT,
  ADVANCED_ADS_PROMPT,
} from "@/components/analysis/analysis";

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
  const [isClient, setIsClient] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const analyzeImagesWithOpenAI = async (
    base64Images: string[],
    type: AnalysisType
  ) => {
    setApiError(null);
    const prompt =
    type === "account"
      ? `${ADVANCED_ACCOUNT_PROMPT}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.`
      : `${ADVANCED_ADS_PROMPT}\n\nIMPORTANTE: Considere todas as imagens abaixo e gere um ÚNICO relatório consolidado, mesclando os dados de todas elas.
        Sempre que gerar blocos de informações importantes, listas de projeção, tabelas ou qualquer conteúdo que não pode ser quebrado entre páginas no PDF, envolva esse conteúdo com <div class="no-break"> ... </div>.
        Não coloque títulos markdown (#, ##, ###) dentro do <div class="no-break">, deixe os títulos fora para que mantenham o destaque visual.
        As seções "Conclusão Final – Plano Recomendado", "Resumo Técnico" e "Projeção de Escala" devem sempre ser títulos markdown (## ou ###), com o conteúdo dessas seções dentro de <div class="no-break"> ... </div>.
      `;

    const imageMessages = base64Images.map((img) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${img}` },
    }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: imageMessages },
        ],
        max_tokens: 6000,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      setApiError(errorData.error?.message || "Erro desconhecido");
      throw new Error(
        `Erro na API OpenAI: ${errorData.error?.message || "Erro desconhecido"}`
      );
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0]?.message?.content) {
      setApiError("Formato de resposta inesperado da API OpenAI");
      throw new Error("Formato de resposta inesperado da API OpenAI");
    }

    return data.choices[0].message.content;
  };

  const saveAnalysisToDatabase = async (markdown: string) => {
    try {
      console.log("Salvando análise para cliente:", selectedClientId);
      setSaveStatus("Salvando...");
      
      const response = await fetch("/api/analises/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientName: selectedClient?.name,
          markdown: markdown,
          analysisType: analysisType,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao salvar análise no banco de dados");
      }
      
      const result = await response.json();
      console.log("Análise salva com sucesso:", result);
      
      setSaveStatus("Salva com sucesso!");
      toast({
        title: "Análise salva",
        description: "A análise foi salva e pode ser encontrada na página do cliente",
        variant: "default",
      });
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error("Erro ao salvar análise:", error);
      setSaveStatus("Erro ao salvar");
      toast({
        title: "Erro ao salvar análise",
        description: "Não foi possível salvar a análise no banco de dados",
        variant: "destructive",
      });
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

      const base64Images = await Promise.all(files.map(convertImageToBase64));
      const analysisResult = await analyzeImagesWithOpenAI(
        base64Images,
        analysisType
      );

      const clientName = selectedClient?.name || "Cliente";
      const date = new Date().toLocaleDateString("pt-BR");
      const markdownContent = `${analysisResult}
`;

       setCustomMarkdown(markdownContent);

      toast({
        title: "Análise concluída com sucesso!",
        description:
          "A análise foi processada com IA e está pronta para visualização.",
        variant: "default",
      });

      // Salvar a análise no banco de dados automaticamente
      await saveAnalysisToDatabase(markdownContent);

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


//     const markdownContent = `
// # 🔍 VISÃO GERAL DO DESEMPENHO – ADS

// - **Total de Campanhas Ativas:** 9
// - **Campanhas Pausadas:** 0
// - **Tipo de Segmentação Predominante:** GMV Max - Meta de ROAS
// - **Investimento Diário Médio por Campanha:** R$6,95
// - **CPA Médio Geral:** R$21,56 🧮
// - **Anúncios escaláveis no momento:** Não  
// 📉 **Diagnóstico geral do funil:**  
// O funil apresenta um CTR médio de 3,93%, acima da média de 1%, indicando boa atratividade dos anúncios. No entanto, o ROAS médio de 5,61 está abaixo da meta de 8x, sugerindo necessidade de otimização para melhorar a rentabilidade. O volume de impressões é alto, mas a conversão precisa ser melhorada para aumentar o GMV.

// ---

// # 🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS

// **Produto: Blazer Plus Size Alfaiataria**  
// **Status:** Ativo  
// **Investimento:** R$329,93  
// **GMV:** R$2.415,86  
// **CTR:** 5,74% ✅  
// **Cliques:** 6.9k  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** Dado não informado  
// **ROAS:** 7,32 ❌  
// **CPA:** R$11,37 🧮  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O anúncio possui um CTR excelente de 5,74%, indicando forte atratividade. No entanto, o ROAS de 7,32 está abaixo da meta de 8x, sugerindo que, apesar do bom volume de cliques, a conversão não está maximizando o retorno. O investimento é significativo, mas o GMV precisa ser otimizado.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Aumentar a conversão em 10-15% através de otimização de página e copy, monitorando semanalmente para ajustes finos.

// ---

// **Produto: Conjunto Feminino Colete e Short**  
// **Status:** Ativo  
// **Investimento:** R$66,55  
// **GMV:** R$530,10  
// **CTR:** 3,68% ✅  
// **Cliques:** 6.7k  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** Dado não informado  
// **ROAS:** 7,97 ❌  
// **CPA:** R$9,95 🧮  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 3,68% é positivo, mas o ROAS de 7,97 ainda não atinge a meta. O investimento é moderado, e o GMV precisa ser melhorado para aumentar o retorno.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Semanal  
// 5. Justificativa: Melhorar a conversão em 5-10% com ajustes na oferta e monitoramento a cada 5 dias.

// ---

// **Produto: Calça Jeans Wide Leg Feminina**  
// **Status:** Ativo  
// **Investimento:** R$47,75  
// **GMV:** R$306,46  
// **CTR:** 4,37% ✅  
// **Cliques:** 315  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** Dado não informado  
// **ROAS:** 6,42 ❌  
// **CPA:** R$15,16 🧮  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 4,37% é excelente, mas o ROAS de 6,42 precisa ser melhorado. O investimento é baixo, e o GMV não está maximizando o potencial de retorno.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Aumentar a conversão em 10% com foco em otimização de página e copy, monitorando a cada 3 dias.

// ---

// **Produto: Calça Jeans Feminina Mom Algodão**  
// **Status:** Ativo  
// **Investimento:** R$33,99  
// **GMV:** R$128,10  
// **CTR:** 2,04% ✅  
// **Cliques:** 536  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** Dado não informado  
// **ROAS:** 3,77 ❌  
// **CPA:** R$63,41 🧮  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 2,04% é viável, mas o ROAS de 3,77 é baixo, indicando necessidade de melhorias significativas na conversão e no GMV.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Melhorar a conversão em 15-20% com ajustes na página e copy, monitorando a cada 3 dias.

// ---

// **Produto: Blazer Feminino Alfaiataria Outono**  
// **Status:** Ativo  
// **Investimento:** R$24,25  
// **GMV:** R$0,00  
// **CTR:** 3,29% ✅  
// **Cliques:** 2.4k  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** 0% ❌  
// **ROAS:** 0,00 ❌  
// **CPA:** Dado não informado  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 3,29% é positivo, mas a conversão é inexistente, resultando em ROAS de 0,00. É crucial revisar a página e a oferta para melhorar a conversão.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Revisar a página e a oferta para aumentar a conversão em 20-30%, monitorando a cada 2 dias.

// ---

// **Produto: Calça Jeans Feminina Reta Lançamento**  
// **Status:** Ativo  
// **Investimento:** R$14,66  
// **GMV:** R$0,00  
// **CTR:** 3,41% ✅  
// **Cliques:** 1.5k  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** 0% ❌  
// **ROAS:** 0,00 ❌  
// **CPA:** Dado não informado  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 3,41% é bom, mas a conversão é nula, resultando em ROAS de 0,00. A página e a oferta precisam ser revisadas para melhorar a conversão.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Revisar a página e a oferta para aumentar a conversão em 20-30%, monitorando a cada 2 dias.

// ---

// **Produto: Calça Jeans Feminina Mom Cintura Alta**  
// **Status:** Ativo  
// **Investimento:** R$38,32  
// **GMV:** R$0,00  
// **CTR:** 2,93% ✅  
// **Cliques:** 743  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** 0% ❌  
// **ROAS:** 0,00 ❌  
// **CPA:** Dado não informado  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 2,93% é viável, mas a conversão é inexistente, resultando em ROAS de 0,00. É necessário revisar a página e a oferta para melhorar a conversão.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Revisar a página e a oferta para aumentar a conversão em 20-30%, monitorando a cada 2 dias.

// ---

// **Produto: Calça Jeans Wide Leg Feminina Cintura Alta**  
// **Status:** Ativo  
// **Investimento:** R$25,00  
// **GMV:** R$0,00  
// **CTR:** 1,64% ✅  
// **Cliques:** 119  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** 0% ❌  
// **ROAS:** 0,00 ❌  
// **CPA:** Dado não informado  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 1,64% é aceitável, mas a conversão é nula, resultando em ROAS de 0,00. A página e a oferta precisam ser revisadas para melhorar a conversão.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Revisar a página e a oferta para aumentar a conversão em 20-30%, monitorando a cada 2 dias.

// ---

// **Produto: Calça Jeans Feminina Wide Leg com Elastano**  
// **Status:** Ativo  
// **Investimento:** R$12,93  
// **GMV:** R$0,00  
// **CTR:** 2,36% ✅  
// **Cliques:** 136  
// **Pedidos Pagos:** Dado não informado  
// **Conversão:** 0% ❌  
// **ROAS:** 0,00 ❌  
// **CPA:** Dado não informado  

// ✅ **Diagnóstico Técnico e detalhado do Analista:**  
// > O CTR de 2,36% é viável, mas a conversão é inexistente, resultando em ROAS de 0,00. É necessário revisar a página e a oferta para melhorar a conversão.

// ✅ **Sugestão Técnica e detalhada do Analista:**  
// > 1. Canal sugerido: Shopee Ads  
// 2. Segmentação recomendada: GMVMAX ROAS Médio  
// 3. Tipo de ação: Conversão  
// 4. Urgência: Imediata  
// 5. Justificativa: Revisar a página e a oferta para aumentar a conversão em 20-30%, monitorando a cada 2 dias.

// ---

// # ⚙️ REGRAS TÉCNICAS OBRIGATÓRIAS POR SKU

// - **ROAS ≥ 8x** = **Escalável** → NÃO sugerir alterações  
// - **CTR ≥ 1%** = Anúncio viável tecnicamente  
// - **CTR < 1%** = Problema técnico → revisar criativo e segmentação  
// - **Conversão < 1%** = Problema grave → página, copy ou preço desalinhado  
// - **CPA alto** = Prejuízo por pedido, cortar ou revisar  
// - **CPC implícito** = Avaliar com base no investimento ÷ cliques

// Se SKU estiver dentro da meta → NÃO alterar copy, preço ou campanha.

// ---

// # 🧭 CLASSIFICAÇÃO FINAL DA CONTA

// ### 🔴 PERFIL CORTE / REESTRUTURAÇÃO  
// > Múltiplos SKUs abaixo da meta → revisar copy, preço, página

// ---

// # 📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS

// <div class="no-break">
// | Ação | Produto | Tipo | Canal | Detalhe Técnico | Urgência |
// |------|---------|------|-------|----------------|----------|
// | Conversão | Blazer Plus Size Alfaiataria | Conversão | Shopee Ads | Aumentar conversão em 10-15%, otimização de página e copy | Imediata |
// | Conversão | Conjunto Feminino Colete e Short | Conversão | Shopee Ads | Melhorar conversão em 5-10%, ajustes na oferta | Semanal |
// | Conversão | Calça Jeans Wide Leg Feminina | Conversão | Shopee Ads | Aumentar conversão em 10%, otimização de página e copy | Imediata |
// | Conversão | Calça Jeans Feminina Mom Algodão | Conversão | Shopee Ads | Melhorar conversão em 15-20%, ajustes na página e copy | Imediata |
// | Conversão | Blazer Feminino Alfaiataria Outono | Conversão | Shopee Ads | Revisar página e oferta para aumentar conversão em 20-30% | Imediata |
// | Conversão | Calça Jeans Feminina Reta Lançamento | Conversão | Shopee Ads | Revisar página e oferta para aumentar conversão em 20-30% | Imediata |
// | Conversão | Calça Jeans Feminina Mom Cintura Alta | Conversão | Shopee Ads | Revisar página e oferta para aumentar conversão em 20-30% | Imediata |
// | Conversão | Calça Jeans Wide Leg Feminina Cintura Alta | Conversão | Shopee Ads | Revisar página e oferta para aumentar conversão em 20-30% | Imediata |
// | Conversão | Calça Jeans Feminina Wide Leg com Elastano | Conversão | Shopee Ads | Revisar página e oferta para aumentar conversão em 20-30% | Imediata |
// </div>

// ---

// # ✅ FECHAMENTO DA ANÁLISE

// 📍**Com base na performance atual, essa conta se encaixa no perfil: Corte / Reestruturação.  
// Recomendo seguir o plano de ação acima conforme o seu objetivo estratégico.  
// Deseja seguir por esse caminho ou priorizar outro foco nos próximos 7 dias?**

// ---

// ## PROJEÇÃO DE ESCALA – OBJETIVOS DE 30, 60 E 100 PEDIDOS/DIA

// <div class="no-break">
// 30 pedidos/dia (900/mês)

// - Investimento estimado: R$1.500,00
// - Faturamento estimado via Ads: R$8.400,00
// - ROAS projetado: 5,61
// - CPA estimado: R$50,00

// 60 pedidos/dia (1800/mês)

// - Investimento estimado: R$3.000,00
// - Faturamento estimado via Ads: R$16.800,00
// - ROAS projetado: 5,61
// - CPA estimado: R$50,00

// 100 pedidos/dia (3000/mês)

// - Investimento estimado: R$5.000,00
// - Faturamento estimado via Ads: R$28.000,00
// - ROAS projetado: 5,61
// - CPA estimado: R$50,00
// </div>

// ⚠️ Reforce que essas projeções assumem estabilidade no CPA atual. Caso a operação invista em otimização de página, kits, combos e lives, o CPA poderá cair e o retorno será ainda maior.

// ## RESUMO TÉCNICO

// <div class="no-break">
// | Indicador | Valor Atual |
// |-----------|-------------|
// | Investimento total em Ads | R$625,20 |
// | Pedidos via Ads | 29 |
// | GMV via Ads | R$3.500,00 |
// | ROAS médio | 5,61 |
// | CPA via Ads | R$21,56 |
// | CPA geral (org + Ads) | Dado não informado |
// | Projeção 30 pedidos/dia | R$1.500,00 |
// | Projeção 60 pedidos/dia | R$3.000,00 |
// | Projeção 100 pedidos/dia | R$5.000,00 |
// </div>

// <div class="page-break">
// ## CONCLUSÃO FINAL – PLANO RECOMENDADO

// A operação demonstra potencial limitado de escalabilidade, evidenciado por múltiplos SKUs com ROAS abaixo de 8x, validando tecnicamente a necessidade de reestruturação do funil de conversão. A análise granular dos indicadores revela uma estrutura de custo desafiadora, com CPA médio de R$21,56, permitindo crescimento cauteloso sem comprometer a rentabilidade.

// Recomendo uma estratégia de reestruturação focada em conversão: (1) otimização das páginas de produto e copy para aumentar a conversão em 20-30%; e (2) monitoramento rigoroso das métricas de conversão e CTR para garantir estabilidade.

// A solidez dos indicadores atuais proporciona uma margem de segurança limitada para investimentos mais cautelosos, desde que implementados com disciplina metodológica e monitoramento constante. É imperativo manter a consistência na execução do plano técnico aqui delineado para garantir a viabilidade de expansão futura.

// Para maximizar resultados no médio-longo prazo, é fundamental adotar uma visão estratégica no gerenciamento de campanhas, evitando reações impulsivas a oscilações diárias de ROAS, que são inerentes ao processo de aprendizagem algorítmica. A estabilidade operacional e a persistência na execução do plano técnico aqui delineado serão determinantes para o sucesso da escalabilidade.

// </div>
// </div>


//     `
//     setCustomMarkdown(markdownContent);
//   }, [isClient]);
  


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

      {customMarkdown && isClient && (
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
                  onAfterDownload={() => {
                    // Se você quiser salvar após download (não necessário se já está salvando antes)
                    // saveAnalysisToDatabase(customMarkdown);
                  }}
                />
                {saveStatus && (
                  <span className="text-sm text-orange-500">{saveStatus}</span>
                )}
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
