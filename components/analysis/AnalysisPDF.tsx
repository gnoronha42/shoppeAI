import React, { forwardRef, useImperativeHandle } from "react";

interface AnalysisPDFProps {
  clientName: string;
  analysisType: string;
  markdown: string;
  fileName?: string;
}
// Adiciona displayName ao componente


export const AnalysisPDF = forwardRef<any, AnalysisPDFProps>(
  ({ clientName, analysisType, markdown, fileName = "relatorio.pdf" }, ref) => {
    const handleDownloadPDF = async () => {
      try {
        // Verificar se markdown está vazio ou contém erro
        if (!markdown.trim() || 
            markdown.includes("I'm sorry") || 
            markdown.includes("I cannot") || 
            markdown.includes("I apologize")) {
          throw new Error("O modelo de IA retornou uma mensagem de erro ou conteúdo vazio. Por favor, tente novamente.");
        }
        
        // Preparar os dados para enviar ao endpoint
        const data = {
          markdown,
          clientName,
          analysisType,
        };

        
        const response = await fetch("/api/analises/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Erro ${response.status}: ${errorData.message || 'Ocorreu um erro desconhecido'}`);
        }

        // Obter o blob do PDF
        const blob = await response.blob();

        // Verificar se o blob tem tamanho válido
        if (blob.size < 1000) { // Se o PDF for muito pequeno, provavelmente ocorreu um erro
          throw new Error("O PDF gerado parece estar vazio ou corrompido. Por favor, tente novamente.");
        }

        // Criar URL para download
        const url = URL.createObjectURL(blob);

        // Criar link para download e clicar nele
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || `relatorio_${clientName}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Limpar
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert(error instanceof Error ? error.message : "Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
      }
    };

    useImperativeHandle(ref, () => ({ handleDownloadPDF }));

    return null; // Este componente não renderiza nada visualmente
  }
);


AnalysisPDF.displayName = "AnalysisPDF";