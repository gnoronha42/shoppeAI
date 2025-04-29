"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ArrowRight, Download, AlertCircle, ExternalLink } from "lucide-react";
import { ClientSelector } from "@/components/client/client-selector";
import { AnalysisTypeSelector } from "@/components/analysis/analysis-type-selector";
import { FileUpload } from "@/components/analysis/file-upload";
import { useSelector } from "react-redux";
import { selectSelectedClientId, selectSelectedClient } from "@/features/clients/clientSlice";
import { useGenerateReportMutation } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AnalysisType } from "@/types";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import 'jspdf-autotable';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

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
      setApiError(null);
      const prompt = type === "account" ? ADVANCED_ACCOUNT_PROMPT : ADVANCED_ADS_PROMPT;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
            safety_settings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Erro da API Gemini:", errorData);
        const errorMessage = errorData.error?.message || 'Erro desconhecido';
        setApiError(errorMessage);
        throw new Error(`Erro na API Gemini: ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        console.error("Resposta inesperada da API Gemini:", data);
        setApiError("Formato de resposta inesperado da API Gemini");
        throw new Error("Formato de resposta inesperado da API Gemini");
      }
      
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Erro ao analisar imagem com Gemini:", error);
      throw error;
    }
  };

  const generatePDF = (results: any[]) => {
    try {
      const doc = new jsPDF();
      const clientName = selectedClient?.name || "Cliente";
      const date = new Date().toLocaleDateString('pt-BR');
      
      // Configurar header
      doc.setFillColor(245, 124, 0); // Cor laranja da Shopee
      doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(`Relatório de Análise - ${clientName}`, 14, 15);
      
      // Data e tipo de análise
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Data: ${date} | Tipo: ${analysisType === 'account' ? 'Conta' : 'Anúncios'}`, 14, 30);
      
      let yPosition = 40;
      
      // Para cada resultado de análise
      results.forEach((result, index) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`Análise ${index + 1}: ${result.filename}`, 14, yPosition);
        yPosition += 10;
        
        // Processar o conteúdo da análise em parágrafos
        const content = result.analysis;
        const paragraphs = content.split('\n\n');
        
        // Limitar a quantidade de texto
        const maxParagraphs = Math.min(paragraphs.length, 20);
        
        for (let i = 0; i < maxParagraphs; i++) {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          const paragraph = paragraphs[i].trim();
          if (paragraph.length > 0) {
            // Verificar se é um título
            if (paragraph.includes('RELATÓRIO') || 
                paragraph.startsWith('1.') || 
                paragraph.startsWith('2.') || 
                paragraph.startsWith('3.') || 
                paragraph.startsWith('4.') || 
                paragraph.startsWith('5.') ||
                paragraph.includes('Pontos Positivos') ||
                paragraph.includes('Pontos de Atenção')) {
              
              doc.setFontSize(12);
              doc.setTextColor(245, 124, 0);
            } else {
              doc.setFontSize(10);
              doc.setTextColor(60, 60, 60);
            }
            
            // Quebrar linhas longas
            const splitText = doc.splitTextToSize(paragraph, 180);
            doc.text(splitText, 14, yPosition);
            yPosition += splitText.length * 6;
          }
          yPosition += 4;
        }
        
        yPosition += 10;
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`ShoppeAI - Análise de Desempenho | Página ${i} de ${pageCount}`, 14, 290);
      }
      
      // Salvar o PDF
      doc.save(`Analise_${clientName}_${date.replace(/\//g, '-')}.pdf`);
      
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
          const analysisResult = await analyzeImageWithGemini(
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
            description: imageError.message || "Ocorreu um erro ao processar esta imagem",
            variant: "destructive",
          });
          // Continua com as próximas imagens mesmo se uma falhar
        }
      }

      if (results.length === 0) {
        throw new Error("Não foi possível analisar nenhuma das imagens selecionadas");
      }

      setAnalysisResults(results);

      const fileUrls = files.map((file) => URL.createObjectURL(file));
      const imageData = files.map((file, index) => ({
        file,
        url: URL.createObjectURL(file),
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type
      }));

      try {
        // Salvar análise na API
        const response = await fetch('/api/analises', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: selectedClientId,
            type: analysisType,
            results: results.map((result, index) => ({
              analysis: result.analysis,
              filename: result.filename,
              imageUrl: imageData[index]?.url || null
            })),
            imageUrls: imageData.map(img => img.url),
            title: `Análise de ${analysisType === 'account' ? 'Conta' : 'Anúncios'} - ${new Date().toLocaleDateString('pt-BR')}`
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro da API:", errorData);
          toast({
            title: "Erro ao salvar a análise",
            description: errorData.error || "Não foi possível salvar a análise no banco de dados",
            variant: "destructive",
          });
          // Continua mesmo se falhar ao salvar no banco
        }
      } catch (apiError: any) {
        console.error("Erro ao chamar a API:", apiError);
        toast({
          title: "Erro ao salvar a análise",
          description: "Não foi possível conectar ao servidor. Os resultados serão salvos localmente.",
          variant: "destructive",
        });
        // Continua mesmo se falhar ao salvar no banco
      }

      // Mantém a chamada ao mock de API para compatibilidade
      try {
        await generateReport({
          clientId: selectedClientId,
          type: analysisType,
          files: fileUrls,
        }).unwrap();
      } catch (mockError) {
        console.error("Erro ao gerar relatório mock:", mockError);
        // Continua mesmo se o mock falhar
      }

      // Armazenar no localStorage para recuperação posterior
      localStorage.setItem(
        `analysis_${selectedClientId}_${Date.now()}`, 
        JSON.stringify(results)
      );

      // Gerar PDF automaticamente
      generatePDF(results);

      toast({
        title: "Análise concluída com sucesso!",
        description: "A análise foi processada com IA e salva no histórico do cliente.",
        variant: "default",
      });

      // Redirecionar para a página de detalhes do cliente
      router.push(`/clientes/${selectedClientId}`);

      setFiles([]);
    } catch (error: any) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Ocorreu um erro ao processar as imagens. Por favor, tente novamente.",
        variant: "destructive",
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

      {apiError && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Erro na API do Gemini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300">{apiError}</p>
            {apiError.includes("deprecated") && (
              <p className="text-sm mt-2 text-red-700 dark:text-red-300">
                Este erro indica que o modelo usado está obsoleto. Entre em contato com o administrador para atualizar o código.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button size="sm" variant="outline" className="flex items-center text-red-700 border-red-300" onClick={() => window.open("https://ai.google.dev/docs/gemini_api_updates", "_blank")}>
              Ver documentação do Gemini
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Selecione um cliente e faça upload de capturas de tela para análise automática com IA
        </p>
        <Button variant="outline" onClick={() => router.push('/clientes')}>
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
              Faça upload de capturas de tela da sua loja Shopee para análise detalhada com IA (máximo 10 imagens)
            </p>
            {files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Arquivos selecionados ({files.length}):</p>
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
          
          {analysisResults.length > 0 && (
            <Button 
              onClick={() => generatePDF(analysisResults)}
              variant="outline"
              className="flex-none"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
