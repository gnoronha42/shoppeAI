import { useEffect, useState, useRef } from "react";
import { AnalysisPDF } from "./AnalysisPDF";

interface PDFGeneratorProps {
  markdown: string;
  clientName: string;
  analysisType: string;
}

export function PDFGenerator({
  markdown,
  clientName,
  analysisType,
}: PDFGeneratorProps) {
  const [isClient, setIsClient] = useState(false);
  const analysisRef = useRef<any>(null);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient || !markdown) return null;

  const handleDownload = () => {
    if (analysisRef.current && analysisRef.current.handleDownloadPDF) {
      analysisRef.current.handleDownloadPDF();
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
