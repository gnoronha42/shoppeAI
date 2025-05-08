import { useEffect, useState, useRef } from "react";
import { AnalysisPDF } from "./AnalysisPDF";

interface PDFGeneratorProps {
  markdown: string;
  clientName: string;
  analysisType: string;
  onAfterDownload?: () => void;
}

export function PDFGenerator({
  markdown,
  clientName,
  analysisType,
  onAfterDownload,
}: PDFGeneratorProps) {
  const [isClient, setIsClient] = useState(false);
  const analysisRef = useRef<any>(null);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient || !markdown) return null;

  const handleDownload = async () => {
    if (analysisRef.current && analysisRef.current.handleDownloadPDF) {
      try {
        await analysisRef.current.handleDownloadPDF();
        console.log("PDF baixado com sucesso, chamando callback");
        if (onAfterDownload) {
          console.log("Executando callback onAfterDownload");
          onAfterDownload();
        }
      } catch (error) {
        console.error("Erro ao baixar o PDF:", error);
      }
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={handleDownload}
        style={{
          background: "#f57c00",
          color: "#fff",
          padding: "8px 16px",
          borderRadius: 4,
          textDecoration: "none",
          fontWeight: 600,
          cursor: "pointer",
          border: 'none',
        }}
      >
        Baixar PDF
      </button>
      <AnalysisPDF
        ref={analysisRef}
        clientName={clientName}
        analysisType={analysisType}
        markdown={markdown}
        fileName={`relatorio_${clientName}.pdf`}
      />
    </div>
  );
}
