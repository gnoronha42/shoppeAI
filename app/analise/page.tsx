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

  const analyzeImagesWithOpenAI = async (
    base64Images: string[],
    type: AnalysisType,
    ocrTexts: string[]
  ) => {
    setApiError(null);

    console.log(`Iniciando análise do tipo: ${type}`);
    console.log(`Cliente: ${selectedClient?.name || "Cliente"}`);
    console.log(`Número de imagens: ${base64Images.length}`);
    console.log(`Textos OCR: ${ocrTexts.length} extraídos`);

    const requestBody = {
      images: base64Images,
      analysisType: type,
      clientName: selectedClient?.name || "Cliente",
      ocrTexts: ocrTexts,
    };

    console.log("Enviando requisição para microserviço...");

    const response = await fetch("https://analysis-micro.onrender.com/analise", {
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
      console.log("🔄 Iniciando salvamento da análise...");
      console.log("📋 Dados para salvar:", {
        clientId: selectedClientId,
        clientName: selectedClient?.name,
        analysisType: analysisType,
        markdownLength: markdown.length
      });
      
      setSaveStatus("Salvando...");

      const requestBody = {
        clientId: selectedClientId,
        clientName: selectedClient?.name,
        markdown: markdown,
        analysisType: analysisType,
      };

      console.log("📤 Enviando requisição para /api/analises/save");

      const response = await fetch("/api/analises/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📡 Status da resposta:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Erro da API:", errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Análise salva com sucesso:", result);

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
      console.error("❌ Erro ao salvar análise:", error);
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
      const ocrTexts = await ocrAllImages(files);
      const base64Images = await Promise.all(files.map(convertImageToBase64));

      const analysisResult = await analyzeImagesWithOpenAI(
        base64Images,
        analysisType,
        ocrTexts
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


      console.log('🗄️ Tentando salvar análise no banco...');
      console.log('📊 Markdown content length:', markdownContent.length);
      console.log('👤 Selected client ID:', selectedClientId);
      console.log('📋 Analysis type:', analysisType);
      
      try {
        await saveAnalysisToDatabase(markdownContent);
      } catch (saveError) {
        console.error("❌ Erro ao salvar no banco (análise gerada com sucesso):", saveError);
      
        toast({
          title: "Análise gerada com sucesso",
          description: "A análise foi gerada mas houve um problema ao salvar. Você pode baixar o PDF normalmente.",
          variant: "default",
        });
      }

      setIsAnalyzing(false);
      setFiles([]);
    } catch (error: any) {
      console.error("❌ Erro completo na geração da análise:", error);
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
                : "Análise semanal expressa com diagnóstico técnico do funil, gargalos identificados e ações estratégicas prioritárias"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {analysisType === "account"
                ? "Upload de Prints da Conta"
                : analysisType === "ads"
                ? "Upload de Prints dos Anúncios"
                : "Upload de Prints para Análise Semanal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFilesChange={handleFileChange}
              maxFiles={10}
              accept="image/*"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {analysisType === "account"
                ? "Faça upload de prints da sua conta Shopee: dashboard, visitantes, vendas, produtos e métricas gerais (máximo 10 imagens)"
                : analysisType === "ads"
                ? "Faça upload de prints das suas campanhas Shopee Ads: performance, ROAS, CTR, investimento e resultados (máximo 10 imagens)"
                : "Faça upload de prints da sua loja Shopee para análise semanal: métricas principais, vendas e performance geral (máximo 10 imagens)"}
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
