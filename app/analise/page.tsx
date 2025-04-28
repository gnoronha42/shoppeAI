"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { ClientSelector } from "@/components/client/client-selector";
import { AnalysisTypeSelector } from "@/components/analysis/analysis-type-selector";
import { FileUpload } from "@/components/analysis/file-upload";
import { ClientForm } from "@/components/client/client-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSelector } from "react-redux";
import { selectSelectedClientId } from "@/features/clients/clientSlice";
import { useGenerateReportMutation } from "@/lib/api";
import { toast } from "sonner";
import { AnalysisType } from "@/types";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Prompt avançado para análise de conta Shopee
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

// Prompt avançado para análise de anúncios Shopee
const ADVANCED_ADS_PROMPT = `Você é um consultor de marketplace especializado em anúncios para e-commerce, com vasta experiência em otimização de campanhas na Shopee.

Analise esta captura de tela de anúncios da Shopee e extraia as seguintes informações: nome do produto, preço, taxa de conversão, número de visualizações, número de cliques.

Com base nesses dados, forneça uma análise detalhada dos anúncios incluindo:

1. Desempenho Geral
- Análise do ROAS (Retorno sobre Investimento em Anúncios)
- CTR (Taxa de Cliques) comparada ao benchmark da plataforma
- Conversão dos anúncios para vendas

2. Otimização de Campanhas
- Recomendações para ajustes de lance
- Estratégia de palavras-chave
- Melhorias na segmentação

3. Formatos de Anúncios Recomendados
- Anúncios de Descoberta
- Anúncio de Busca
- Anúncio de Busca de Loja
- Anúncio GMVMAX Lance Automático
- Anúncio GMVMAX Meta de ROAS

4. Plano de Ação para 30 dias
- Semana 1: Ações imediatas
- Semana 2: Otimizações de meio período
- Semana 3-4: Estratégia de escala

5. Projeção de Resultados
- Cenário conservador
- Cenário realista
- Cenário agressivo

Inclua métricas objetivas e recomendações práticas que possam ser implementadas imediatamente.`;

export default function AnalisePage() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("account");
  const [files, setFiles] = useState<File[]>([]);
  const selectedClientId = useSelector(selectSelectedClientId);
  const [generateReport, { isLoading }] = useGenerateReportMutation();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const analyzeImageWithGemini = async (
    base64Image: string,
    type: AnalysisType
  ) => {
    try {
      const prompt = type === "account" ? ADVANCED_ACCOUNT_PROMPT : ADVANCED_ADS_PROMPT;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
            generation_config: {
              temperature: 0.4,
              max_output_tokens: 4096,
            },
          }),
        }
      );

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Erro ao analisar imagem com Gemini:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast.error("Selecione um cliente para continuar");
      return;
    }

    if (files.length === 0) {
      toast.error("Faça upload de pelo menos um print para análise");
      return;
    }

    try {
      setIsAnalyzing(true);

      const analysisResults = [];
      for (const file of files) {
        const base64Image = await convertImageToBase64(file);
        const analysisResult = await analyzeImageWithGemini(
          base64Image,
          analysisType
        );
        analysisResults.push({
          filename: file.name,
          analysis: analysisResult,
        });
      }

      const fileUrls = files.map((file) => URL.createObjectURL(file));

      const result = await generateReport({
        clientId: selectedClientId,
        type: analysisType,
        files: fileUrls,
      }).unwrap();

      // Armazene os resultados da análise em localStorage para recuperação posterior
      localStorage.setItem(`analysis_${selectedClientId}_${Date.now()}`, JSON.stringify(analysisResults));

      toast.success("Relatório gerado com sucesso!", {
        description:
          "A análise foi processada com IA e o relatório está disponível para download.",
      });

      setFiles([]);
    } catch (error) {
      console.error("Erro completo:", error);
      toast.error("Erro ao gerar relatório", {
        description:
          "Ocorreu um erro ao processar as imagens. Por favor, tente novamente.",
      });
    } finally {
      setIsAnalyzing(false);
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

      <Tabs defaultValue="analysis">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="analysis">Realizar Análise</TabsTrigger>
          <TabsTrigger value="register">Cadastrar Cliente</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientSelector />
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
                maxFiles={5}
                accept="image/*"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Faça upload de capturas de tela da sua loja Shopee para análise
                com IA
              </p>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={
              !selectedClientId ||
              files.length === 0 ||
              isLoading ||
              isAnalyzing
            }
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoading || isAnalyzing
              ? "Analisando com IA..."
              : "Gerar Relatório com IA"}
          </Button>
        </TabsContent>

        <TabsContent value="register" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Novo Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <ClientForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
