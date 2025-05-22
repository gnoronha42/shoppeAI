import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownReportProps {
  markdown: string;
}

export function MarkdownReport({ markdown }: MarkdownReportProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Função para corrigir tabelas quebradas no markdown antes da renderização
  useEffect(() => {
    if (contentRef.current) {
      const tabelas = contentRef.current.querySelectorAll('table');
      
      tabelas.forEach(tabela => {
        // Certifique-se de que a tabela esteja envolvida em um div com overflow
        if (!tabela.parentElement?.classList.contains('overflow-x-auto')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'overflow-x-auto my-6 w-full';
          tabela.parentNode?.insertBefore(wrapper, tabela);
          wrapper.appendChild(tabela);
        }
      });
    }
  }, [markdown]);

  // Pré-processamento do markdown para corrigir tabelas quebradas
  const processedMarkdown = React.useMemo(() => {
    let processed = markdown;
    
    // Corrigir tabelas que estão quebradas em múltiplas linhas
    processed = processed.replace(
      /\|\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\|\s*([^|]*)\s*\n\s*---/g,
      '| $1 | $2 | $3 | $4 |\n---'
    );
    
    // Corrigir tabelas quebradas
    processed = processed.replace(
      /\|\s*\|\n\|---/g,
      '|\n|---'
    );
    
    return processed;
  }, [markdown]);

  return (
    <div ref={contentRef} className="prose max-w-none p-4 bg-muted/20 rounded-md overflow-x-auto">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mb-4 text-orange-600" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mt-6 mb-3 text-orange-600" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 text-orange-600" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 my-3" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="mb-1" {...props} />
          ),
          p: ({ node, children, ...props }) => {
            const text = children ? children.toString() : "";
            // Verificar se o parágrafo começa com emoji
            if (
              text.startsWith('✅') || 
              text.startsWith('⚠️') || 
              text.startsWith('📊') || 
              text.startsWith('📈') || 
              text.startsWith('📌') || 
              text.startsWith('📍') || 
              text.startsWith('🟢') || 
              text.startsWith('🟡') || 
              text.startsWith('🔴')
            ) {
              return <p className="font-semibold text-green-700 my-2" {...props}>{children}</p>;
            }
            return <p className="my-2 text-gray-700" {...props}>{children}</p>;
          },
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-orange-500 pl-4 italic text-gray-600 my-4" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 w-full">
              <table className="min-w-full border-collapse border border-slate-300 table-auto" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-orange-500 text-white" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-slate-300 px-4 py-2 text-left font-bold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-slate-300 px-4 py-2 break-words" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-slate-200" {...props} />
          ),
          // Adicionando suporte para títulos específicos
          strong: ({ node, children, ...props }) => {
            const text = children ? children.toString() : "";
            if (text === "CONCLUSÃO FINAL – PLANO RECOMENDADO") {
              return <h2 className="text-xl font-bold mt-6 mb-3 text-orange-600">{text}</h2>;
            }
            if (text === "RESUMO TÉCNICO") {
              return <h2 className="text-xl font-bold mt-6 mb-3 text-orange-600">{text}</h2>;
            }
            return <strong className="font-bold" {...props}>{children}</strong>;
          },
        }}
      >
        {processedMarkdown}
      </ReactMarkdown>
    </div>
  );
}
