"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugStoragePage() {
  const [storageData, setStorageData] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = {
        localStorage: {
          relatorio: localStorage.getItem('relatorio'),
          relatorio_timestamp: localStorage.getItem('relatorio_timestamp'),
          allKeys: Object.keys(localStorage)
        },
        sessionStorage: {
          relatorio: sessionStorage.getItem('relatorio'),
          allKeys: Object.keys(sessionStorage)
        },
        url: {
          href: window.location.href,
          search: window.location.search,
          searchParams: new URLSearchParams(window.location.search).get('relatorio')
        }
      };
      setStorageData(data);
    }
  }, []);

  const clearAll = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <Card className="w-full max-w-4xl mx-auto bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            🔍 Debug Storage & URL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* localStorage */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-green-400 mb-2">📁 localStorage</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>relatorio:</strong> {storageData.localStorage?.relatorio ? 
                  `Presente (${storageData.localStorage.relatorio.length} chars)` : 'Ausente'}
              </div>
              <div>
                <strong>timestamp:</strong> {storageData.localStorage?.relatorio_timestamp ? 
                  new Date(parseInt(storageData.localStorage.relatorio_timestamp)).toLocaleString() : 'Ausente'}
              </div>
              <div>
                <strong>todas as chaves:</strong> {storageData.localStorage?.allKeys?.join(', ') || 'Nenhuma'}
              </div>
              {storageData.localStorage?.relatorio && (
                <div className="mt-3 p-2 bg-gray-900 rounded text-xs max-h-40 overflow-y-auto">
                  <strong>Conteúdo (primeiros 500 chars):</strong><br/>
                  {storageData.localStorage.relatorio.substring(0, 500)}...
                </div>
              )}
            </div>
          </div>

          {/* sessionStorage */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-blue-400 mb-2">🗂️ sessionStorage</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>relatorio:</strong> {storageData.sessionStorage?.relatorio ? 
                  `Presente (${storageData.sessionStorage.relatorio.length} chars)` : 'Ausente'}
              </div>
              <div>
                <strong>todas as chaves:</strong> {storageData.sessionStorage?.allKeys?.join(', ') || 'Nenhuma'}
              </div>
            </div>
          </div>

          {/* URL */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">🔗 URL</h3>
            <div className="space-y-2 text-sm">
              <div>
                <strong>href:</strong> {storageData.url?.href || 'N/A'}
              </div>
              <div>
                <strong>search:</strong> {storageData.url?.search || 'Vazio'}
              </div>
              <div>
                <strong>parâmetro relatorio:</strong> {storageData.url?.searchParams ? 
                  `Presente (${storageData.url.searchParams.length} chars)` : 'Ausente'}
              </div>
              {storageData.url?.searchParams && (
                <div className="mt-3 p-2 bg-gray-900 rounded text-xs max-h-40 overflow-y-auto">
                  <strong>Conteúdo decodificado (primeiros 500 chars):</strong><br/>
                  {decodeURIComponent(storageData.url.searchParams).substring(0, 500)}...
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
              🔄 Recarregar
            </Button>
            <Button onClick={clearAll} className="bg-red-600 hover:bg-red-700">
              🗑️ Limpar Tudo
            </Button>
            <Button onClick={() => window.location.href = '/obrigado'} className="bg-green-600 hover:bg-green-700">
              👀 Ver Página Obrigado
            </Button>
            <Button onClick={() => window.location.href = '/selleria'} className="bg-orange-600 hover:bg-orange-700">
              🏠 Voltar Selleria
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
