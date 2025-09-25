"use client";
import React from "react";

export default function TesteObrigadoPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Teste - Página de Obrigado</h1>
        <p className="text-xl">Se você está vendo isso, a rota está funcionando!</p>
        <a href="/selleria" className="inline-block mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          Voltar para Selleria
        </a>
      </div>
    </div>
  );
}
