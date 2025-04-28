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

export default function AnalisePage() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("account");
  const [files, setFiles] = useState<File[]>([]);
  const selectedClientId = useSelector(selectSelectedClientId);
  const [generateReport, { isLoading }] = useGenerateReportMutation();

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
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
      // Mocking the file URIs since we can't actually process these files
      const fileUrls = files.map(file => URL.createObjectURL(file));
      
      const result = await generateReport({
        clientId: selectedClientId,
        type: analysisType,
        files: fileUrls,
      }).unwrap();

      toast.success("Relatório gerado com sucesso!", {
        description: "O relatório foi processado e está disponível para download.",
      });

      // Reset the form
      setFiles([]);
    } catch (error) {
      toast.error("Erro ao gerar relatório", {
        description: "Ocorreu um erro. Por favor, tente novamente.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise</h1>
        <p className="text-muted-foreground">
          Crie uma análise para sua loja Shopee
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
            </CardContent>
          </Card>

          <Button 
            onClick={handleSubmit}
            disabled={!selectedClientId || files.length === 0 || isLoading}
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {isLoading ? "Gerando relatório..." : "Gerar Relatório"}
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