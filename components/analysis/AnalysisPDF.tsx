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
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        // Obter o blob do PDF
        const blob = await response.blob();

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
        alert("Ocorreu um erro ao gerar o PDF. Por favor, tente novamente.");
      }
    };

    useImperativeHandle(ref, () => ({ handleDownloadPDF }));

    return null; // Este componente não renderiza nada visualmente
  }
);


AnalysisPDF.displayName = "AnalysisPDF";