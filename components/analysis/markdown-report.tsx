import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownReportProps {
  markdown: string;
}

export function MarkdownReport({ markdown }: MarkdownReportProps) {
  return (
    <div className="prose max-w-none p-4 bg-muted/20 rounded-md overflow-x-auto">
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
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border border-slate-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-orange-500 text-white" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-slate-300 px-4 py-2 text-left font-bold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-slate-300 px-4 py-2" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-slate-200" {...props} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
