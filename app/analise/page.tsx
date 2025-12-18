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
import { DateRangePicker } from "@/components/analysis/date-range-picker";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
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
import Tesseract from "tesseract.js";

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
  
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 7), // Reduzido para 7 dias para evitar timeouts em lojas grandes
    to: new Date(),
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [customMarkdown, setCustomMarkdown] = useState<string>("");
  const [showMarkdownImport, setShowMarkdownImport] = useState<boolean>(false);
  const [isClient, setIsClient] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [metricasAvancadas, setMetricasAvancadas] = useState<any>(null);
  const [relatorioPersonalizado, setRelatorioPersonalizado] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingSystem, setIsTestingSystem] = useState(false);
  const [selectedAnalysisMethod, setSelectedAnalysisMethod] = useState<'auto' | 'debug' | 'bypass' | 'robust'>('auto');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getBaseUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_ANALYSIS_BASE_URL;
    if (!baseUrl) {
      throw new Error("Variável de ambiente NEXT_PUBLIC_ANALYSIS_BASE_URL não definida");
    }
    console.log('Base URL da análise:', baseUrl);
    return baseUrl;
  };

 

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
    if (testResults) {
      setTestResults(null);
    }
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

  const ocrImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const {
            data: { text },
          } = await Tesseract.recognize(
            reader.result as string,
            "por", 
            {
              logger: (m) => {
                
              },
            }
          );
          resolve(text.trim());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const ocrAllImages = async (files: File[]): Promise<string[]> => {
    return Promise.all(files.map(ocrImage));
  };

  const readCSVFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file, 'utf-8');
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  
  const analyzeCSVWithOpenAI = async (csvContent: string, type: AnalysisType) => {
    setApiError(null);

    
    const requestBody = {
      csvContent: csvContent,
      analysisType: type,
      clientName: selectedClient?.name || "Cliente",
    };

    
    
    
    const baseUrl = getBaseUrl();
    
    const response = await fetch(`${baseUrl}/analise-csv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da API CSV:", errorData);
      setApiError(errorData.error || errorData.message || "Erro desconhecido");
      throw new Error(
        `Erro na análise CSV: ${
          errorData.error || errorData.message || "Erro desconhecido"
        }`
      );
    }

    const data = await response.json();
    console.log("Resposta CSV recebida do microserviço:", data);
    
    if (!data.analysis) {
      setApiError("Formato de resposta inesperado do servidor");
      throw new Error("Formato de resposta inesperado do servidor");
    }

    return data.analysis;
  };

  const testAllSystems = async (csvFiles: File[]) => {
    setIsTestingSystem(true);
    setApiError(null);
    
    try {
      
    
      
     
      const csvFilesContent = await Promise.all(
        csvFiles.map(async (file) => {
          const content = await readCSVFile(file);
          return {
            nome: file.name,
            conteudo: content
          };
        })
      );

      const baseUrl = getBaseUrl();
      const fullUrl = `${baseUrl}/test-todas-solucoes`;
      
        
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvFiles: csvFilesContent }),
      });

      if (!response.ok) {
        throw new Error(`Erro no teste: ${response.status}`);
      }

      const data = await response.json();
     
      
      setTestResults(data);
      
      toast({
        title: "Teste concluído!",
        description: `${data.sistemasComSucesso}/${data.totalSistemas} sistemas funcionando`,
        variant: "default",
      });
      
      return data;
    } catch (error) {
      console.error(' Erro no teste:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
      
      const errorMessage = error instanceof Error ? error.message : 'Erro no teste';
      setApiError(`Erro no teste: ${errorMessage}`);
      
      toast({
        title: "Erro no teste",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsTestingSystem(false);
    }
  };


  const analyzeWithSpecificMethod = async (csvFiles: File[], method: string, type: AnalysisType) => {
    setApiError(null);


    
    
    const csvFilesContent = await Promise.all(
      csvFiles.map(async (file) => {
        const content = await readCSVFile(file);
        return {
          nome: file.name,
          conteudo: content
        };
      })
    );

    const requestBody = {
      csvFiles: csvFilesContent,
      analysisType: type,
      clientName: selectedClient?.name || "Cliente",
    };

    let endpoint = "/analise-csv"; // padrão
    
    switch (method) {
      case 'bypass':
        endpoint = "/analise-csv-bypass";
        break;
      case 'robust':
        endpoint = "/analise-csv-robusta";
        break;
      case 'debug':
        endpoint = "/analise-csv"; 
        break;
    }



    const baseUrl = getBaseUrl();
    const fullUrl = `${baseUrl}${endpoint}`;
  

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da API:", errorData);
      setApiError(errorData.error || errorData.message || "Erro desconhecido");
      throw new Error(
        `Erro na análise ${method}: ${
          errorData.error || errorData.message || "Erro desconhecido"
        }`
      );
    }

    const data = await response.json();
    console.log("Resposta recebida:", data);
    
    if (!data.analysis) {
      setApiError("Formato de resposta inesperado do servidor");
      throw new Error("Formato de resposta inesperado do servidor");
    }

    return data.analysis;
  };

  const analyzeMultipleCSVsWithOpenAI = async (csvFiles: File[], type: AnalysisType) => {
    setApiError(null);

    console.log(`Iniciando análise de múltiplos CSVs do tipo: ${type}`);
    console.log(`Cliente: ${selectedClient?.name || "Cliente"}`);
    console.log(`Número de arquivos CSV: ${csvFiles.length}`);
    console.log(`Método selecionado: ${selectedAnalysisMethod}`);

    if (selectedAnalysisMethod === 'auto') {
      try {
        const testData = await testAllSystems(csvFiles);
        
        if (testData.sistemasComSucesso > 0) {
          const bestMethod = Object.keys(testData.resultados).find(
            key => testData.resultados[key].sucesso
          );
          
          let methodMap: { [key: string]: string } = {
            'bypassSystem': 'bypass',
            'robustSystem': 'robust',
            'debugSystem': 'debug'
          };
          
          const method = methodMap[bestMethod!] || 'bypass';
         
          
          toast({
            title: "Sistema automático",
            description: `Usando método ${method} (melhor resultado nos testes)`,
            variant: "default",
          });
          
          return await analyzeWithSpecificMethod(csvFiles, method, type);
        } else {
          throw new Error('Nenhum sistema de análise funcionou');
        }
      } catch (error) {
        console.error(' Erro no modo automático:', error);
      
        
        return await analyzeWithSpecificMethod(csvFiles, 'bypass', type);
      }
    } else {
    
      return await analyzeWithSpecificMethod(csvFiles, selectedAnalysisMethod, type);
    }
  };

  
  const hasCSVFiles = () => {
    return files.some(file => file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'));
  };

  const hasImageFiles = () => {
    return files.some(file => file.type.startsWith('image/'));
  };

  const obterMetricasAvancadas = async (dados: any) => {
    try {
      const baseUrl = getBaseUrl();
      
      const response = await fetch(`${baseUrl}/api/metricas-avancadas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dados }),
      });

      if (!response.ok) {
        throw new Error('Erro ao obter métricas avançadas');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao obter métricas avançadas:', error);
      return null;
    }
  };

  const gerarRelatorioPersonalizado = async (dados: any, tipoRelatorio: string = 'completo') => {
    try {
      const baseUrl = getBaseUrl();
      
      const response = await fetch(`${baseUrl}/api/relatorio-personalizado`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dados, tipoRelatorio }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar relatório personalizado');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erro ao gerar relatório personalizado:', error);
      return null;
    }
  };


  const analyzeImagesWithOpenAI = async (
    base64Images: string[],
    type: AnalysisType,
    ocrTexts: string[]
  ) => {
    setApiError(null);

  

    const requestBody = {
      images: base64Images,
      analysisType: type,
      clientName: selectedClient?.name || "Cliente",
      ocrTexts: ocrTexts,
    };

    

    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/analise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro da API:", errorData);
      setApiError(errorData.error || errorData.message || "Erro desconhecido");
      throw new Error(
        `Erro na análise: ${
          errorData.error || errorData.message || "Erro desconhecido"
        }`
      );
    }

    const data = await response.json();
    console.log("Resposta recebida do microserviço:", data);
    
    if (!data.analysis) {
      setApiError("Formato de resposta inesperado do servidor");
      throw new Error("Formato de resposta inesperado do servidor");
    }

    return data.analysis;
  };

  const saveAnalysisToDatabase = async (markdown: string) => {
    try {
     
      
      setSaveStatus("Salvando...");

      const requestBody = {
        clientId: selectedClientId,
        clientName: selectedClient?.name,
        markdown: markdown,
        analysisType: analysisType,
      };

      console.log(" Enviando requisição para /api/analises/save");

      const response = await fetch("/api/analises/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log(" Status da resposta:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(" Erro da API:", errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("Análise salva com sucesso:", result);

      setSaveStatus("Salva com sucesso!");
      toast({
        title: "Análise salva",
        description:
          "A análise foi salva e pode ser encontrada na página do cliente",
        variant: "default",
      });

      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);

      return result;
    } catch (error) {
      console.error(" Erro ao salvar análise:", error);
      setSaveStatus("Erro ao salvar");
      toast({
        title: "Erro ao salvar análise",
        description: error instanceof Error ? error.message : "Não foi possível salvar a análise no banco de dados",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
      
      throw error; 
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

  
      const csvFiles = files.filter(file => file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'));
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      let analysisResult: string;

      if (csvFiles.length > 0) {
        
        if (analysisType === "ads") {
 
          if (csvFiles.length > 1) {
            toast({ title: "Múltiplos CSVs", description: "Para análise de Ads, use apenas 1 arquivo CSV", variant: "destructive" });
            setIsAnalyzing(false);
            return;
          }
          const csvContent = await readCSVFile(csvFiles[0]);
          analysisResult = await analyzeCSVWithOpenAI(csvContent, analysisType);
        } else if (analysisType === "account") {
        
          analysisResult = await analyzeMultipleCSVsWithOpenAI(csvFiles, analysisType);
        } else if (analysisType === "whatsapp-consultivo") {
        
          if (imageFiles.length === 0) {
            toast({ title: "Erro", description: "Para análise WhatsApp Consultivo, é necessário pelo menos uma imagem", variant: "destructive" });
            return;
          }
          const base64Images = await Promise.all(imageFiles.map(convertImageToBase64));
          const ocrTexts = await ocrAllImages(imageFiles);
          analysisResult = await analyzeImagesWithOpenAI(base64Images, analysisType, ocrTexts);
        } else {
          toast({ title: "Tipo de análise inválido", description: "Análise CSV disponível para 'ads' e 'account'. Para outros tipos, use imagens.", variant: "destructive" });
          setIsAnalyzing(false);
          return;
        }
      } else if (imageFiles.length > 0) {
        
        const ocrTexts = await ocrAllImages(imageFiles);
        const base64Images = await Promise.all(imageFiles.map(convertImageToBase64));
        
        analysisResult = await analyzeImagesWithOpenAI(base64Images, analysisType, ocrTexts);
      } else {
        throw new Error("Nenhum arquivo válido encontrado. Faça upload de imagens ou CSV.");
      }

      setCustomMarkdown(analysisResult);

      toast({
        title: "Análise concluída com sucesso!",
        description:
          "A análise foi processada com IA e está pronta para visualização.",
        variant: "default",
      });


     
      
      try {
        await saveAnalysisToDatabase(analysisResult);
      } catch (saveError) {
        console.error(" Erro ao salvar no banco (análise gerada com sucesso):", saveError);
      
        toast({
          title: "Análise gerada com sucesso",
          description: "A análise foi gerada mas houve um problema ao salvar. Você pode baixar o PDF normalmente.",
          variant: "default",
        });
      }

      setIsAnalyzing(false);
      setFiles([]);
    } catch (error: any) {
      console.error("Erro completo na geração da análise:", error);
      setIsAnalyzing(false); 
      toast({
        title: "Erro ao gerar relatório",
        description:
          error.message ||
          "Ocorreu um erro ao processar as imagens. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateWithShopeeIntegration = async () => {
    if (!selectedClientId) {
      toast({
        title: "Selecione um cliente",
        description: "É necessário selecionar um cliente para continuar",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsAnalyzing(true);
      
      const baseUrl = getBaseUrl();
      
      console.log(`[FRONTEND] Solicitando análise completa ao Render: ${baseUrl}/analise-conta-shopee`);
      
      const response = await fetch(`${baseUrl}/analise-conta-shopee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientName: selectedClient?.name,
          timeFrom: dateRange?.from ? Math.floor(dateRange.from.getTime() / 1000) : undefined,
          timeTo: dateRange?.to ? Math.floor(dateRange.to.getTime() / 1000) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}: Falha ao gerar análise`);
      }

      const data = await response.json();
      
      if (!data.markdown) {
        throw new Error("Resposta inválida do servidor (markdown ausente)");
      }

      setCustomMarkdown(data.markdown);
      
      toast({
        title: "Relatório gerado com dados reais!",
        description: "Análise completa baseada nas vendas reais dos últimos 30 dias.",
        variant: "default",
      });
      
      try {
        await saveAnalysisToDatabase(data.markdown);
      } catch (_) {}

    } catch (error: any) {
      console.error(" Erro ao gerar com integração Shopee:", error);
      toast({
        title: "Erro ao gerar análise",
        description: error?.message || "Não foi possível conectar ao servidor de análise.",
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
                ? "Análise completa da conta com KPIs detalhados, ranking de produtos, projeções de crescimento e plano tático de 30 dias"
                : analysisType === "ads"
                ? "Análise técnica de campanhas Shopee Ads com foco em ROAS, CTR, conversão, CPA e estratégias de escalabilidade"
                : analysisType === "whatsapp-consultivo"
                ? "Análise consultiva no formato WhatsApp com diagnóstico semanal, métricas visuais e recomendações práticas em linguagem humana"
                : "Análise semanal expressa com diagnóstico técnico do funil, gargalos identificados e ações estratégicas prioritárias"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Período de Análise</CardTitle>
            <CardDescription>
              Selecione o período para análise dos dados da Shopee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangePicker
              value={dateRange}
              onChange={(range) => range && setDateRange(range)}
              placeholder="Selecione o período de análise"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este período será usado para buscar dados de vendas, visitantes e métricas da integração Shopee
            </p>
          </CardContent>
        </Card>

        {/* {hasCSVFiles() && analysisType === "account" && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center">
                <FileSpreadsheet className="mr-2 h-5 w-5" />
                Método de Análise de CSV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedAnalysisMethod === 'auto' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAnalysisMethod('auto')}
                    className="flex-1 min-w-[120px]"
                  >
                    🤖 Automático
                  </Button>
                  <Button
                    variant={selectedAnalysisMethod === 'bypass' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAnalysisMethod('bypass')}
                    className="flex-1 min-w-[120px]"
                  >
                    ⚡ Bypass
                  </Button>
                  <Button
                    variant={selectedAnalysisMethod === 'robust' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAnalysisMethod('robust')}
                    className="flex-1 min-w-[120px]"
                  >
                    🔄 Robusto
                  </Button>
                  <Button
                    variant={selectedAnalysisMethod === 'debug' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAnalysisMethod('debug')}
                    className="flex-1 min-w-[120px]"
                  >
                    🔍 Debug
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {selectedAnalysisMethod === 'auto' && "🤖 Testa todos os sistemas e usa o melhor automaticamente"}
                  {selectedAnalysisMethod === 'bypass' && "⚡ Usa dados pré-validados para garantir precisão máxima"}
                  {selectedAnalysisMethod === 'robust' && "🔄 Sistema inteligente com múltiplas tentativas de extração"}
                  {selectedAnalysisMethod === 'debug' && "🔍 Sistema original com logs detalhados para diagnóstico"}
                </p>

                {files.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testAllSystems(files.filter(f => f.type === 'text/csv' || f.name.toLowerCase().endsWith('.csv')))}
                    disabled={isTestingSystem}
                    className="w-full"
                  >
                    {isTestingSystem ? "🧪 Testando..." : "🧪 Testar Todos os Sistemas"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )} */}

        {testResults && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Resultado dos Testes ({testResults.sistemasComSucesso}/{testResults.totalSistemas} funcionando)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(testResults.resultados).map(([system, result]: [string, any]) => (
                  <div key={system} className="flex items-center justify-between p-2 rounded border">
                    <span className="font-medium">
                      {/* {system === 'debugSystem' && '🔍 Sistema Debug'} */}
                      {/* {system === 'bypassSystem' && '⚡ Sistema Bypass'} */}
                      {/* {system === 'robustSystem' && '🔄 Sistema Robusto'} */}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.sucesso 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {result.sucesso ? 'Funcionando' : ' Falhou'}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Recomendação:</strong> {testResults.recomendacao}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {analysisType === "account"
                ? "Upload de Prints da Conta"
                : analysisType === "ads"
                ? "Upload de Prints dos Anúncios"
                : analysisType === "whatsapp-consultivo"
                ? "Upload de Prints para WhatsApp Consultivo"
                : "Upload de Prints para Análise Semanal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesChange={handleFileChange}
              maxFiles={10}
              accept="image/*, text/csv"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {analysisType === "account"
                ? "Faça upload de prints da sua conta Shopee OU múltiplos arquivos CSV (shop-stats, parentskudetail, productoverview, dados de anúncios) para análise completa"
                : analysisType === "ads"
                ? "✅ RECOMENDADO: 1 arquivo CSV de anúncios para dados 100% precisos (ROAS, investimento, GMV corretos) OU prints das campanhas Shopee Ads (pode ter imprecisões matemáticas)"
                : analysisType === "whatsapp-consultivo"
                ? "Faça upload de prints da performance da sua loja dos últimos 7 dias: métricas principais, funil de vendas e produtos em destaque para análise consultiva"
                : "Faça upload de prints da sua loja Shopee para análise semanal: métricas principais, vendas e performance geral (máximo 10 imagens)"}
            </p>
            
            {hasCSVFiles() && analysisType === "ads" && (
              <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200">
                <p className="text-xs text-green-700 dark:text-green-300">
                  ✅ <strong>CSV detectado!</strong> Análise será feita com dados extraídos diretamente do CSV - precisão matemática garantida!
                </p>
              </div>
            )}
            
            {hasImageFiles() && !hasCSVFiles() && analysisType === "ads" && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  ⚠️ <strong>Apenas imagens detectadas.</strong> Para dados 100% precisos, recomendamos usar o arquivo CSV de anúncios da Shopee.
                </p>
              </div>
            )}
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
              isAnalyzing ||
              isTestingSystem
            }
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoading || isAnalyzing
              ? "Analisando com IA..."
              : isTestingSystem
              ? "Testando sistemas..."
              : hasCSVFiles()
              ? "Gerar com CSV (Dados Precisos)"
              : hasImageFiles()
              ? "Gerar com Imagens (Pode ter imprecisões)"
              : "Gerar Relatório com IA"}
          </Button>

          <Button
            onClick={handleGenerateWithShopeeIntegration}
            disabled={!selectedClientId || isAnalyzing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Gerar com Integração 
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
                  analysisType={analysisType} images={[]} ocrTexts={[]}                />
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
