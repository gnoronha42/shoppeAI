"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Send } from "lucide-react";

export default function IAPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<{role: "user" | "assistant", content: string}[]>([
    {
      role: "assistant",
      content: "Olá! Sou sua assistente para análise de contas e anúncios Shopee. Como posso ajudar você hoje?"
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { role: "user" as const, content: query };
    setConversation([...conversation, userMessage]);
    setQuery("");
    setIsLoading(true);

    // Simulação de resposta da IA
    setTimeout(() => {
      let response;
      
      if (query.toLowerCase().includes("venda")) {
        response = "Com base nas tendências atuais da Shopee, para aumentar suas vendas recomendo: 1) Otimizar títulos com palavras-chave relevantes, 2) Oferecer frete grátis quando possível, 3) Responder rapidamente a perguntas dos clientes, e 4) Utilizar promoções relâmpago para impulsionar a visibilidade da loja.";
      } else if (query.toLowerCase().includes("anúncio") || query.toLowerCase().includes("ad")) {
        response = "Para melhorar seus anúncios na Shopee, sugiro: 1) Usar imagens de alta qualidade com fundo branco, 2) Investir em palavras-chave com alta conversão, 3) Definir orçamentos diários adequados ao seu segmento, e 4) Testar diferentes formatos de anúncios para identificar o que gera melhor ROI.";
      } else {
        response = "Posso ajudar com estratégias de otimização para sua loja Shopee, análise de métricas, recomendações para anúncios e muitas outras questões relacionadas ao seu desempenho na plataforma. Pode fazer perguntas específicas sobre vendas, anúncios, conversão ou qualquer outro aspecto do seu negócio na Shopee.";
      }

      setConversation(prev => [...prev, { 
        role: "assistant", 
        content: response 
      }]);
      
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pergunte à IA</h1>
        <p className="text-muted-foreground">
          Use nossa inteligência artificial para ajudar nas suas estratégias Shopee
        </p>
      </div>

      <Card className="min-h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-orange-600" />
            Assistente Shopee
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {conversation.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-100 dark:bg-zinc-800"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 dark:bg-zinc-800">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua pergunta sobre contas ou anúncios Shopee..."
              className="flex-1 resize-none"
            />
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!query.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}