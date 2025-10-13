"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

// Função para converter string para float (aceita formato brasileiro)
function toFloat(x: any): number {
  if (typeof x === 'number') return x;
  const str = String(x).trim();
  // Remove pontos (separador de milhares) e substitui vírgula por ponto
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

// Interface para os dados de entrada
interface CalculatorInput {
  nomeProduto: string;
  custoProduto: string;
  custoUnidade: string;
  margemPct: string;
  comissaoPct: string;
  impostosPct: string;
  outrasDespesas: string;
}

// Interface para o resultado
interface CalculatorResult {
  produto: string;
  precoVenda: number;
  detalheRS: {
    custoProduto: number;
    custoUnidade: number;
    outrasDespesas: number;
    comissao: number;
    impostos: number;
    lucro: number;
    cpa10pct: number;
  };
  percentuaisSobrePreco: {
    margem: number;
    comissao: number;
    impostos: number;
    cpa: number;
    somaTotal: number;
  };
  roasIdeal: number;
}

// Função principal de cálculo (baseada no Python)
function calcularPrecoSemCpa(input: CalculatorInput): CalculatorResult {
  const CProd = toFloat(input.custoProduto);
  const CUnit = toFloat(input.custoUnidade);
  const margem = toFloat(input.margemPct);
  const comiss = toFloat(input.comissaoPct);
  const impost = toFloat(input.impostosPct);
  const COut = toFloat(input.outrasDespesas);

  // Custos fixos (não percentuais)
  const C0 = CProd + CUnit + COut;

  // CPA é fixo: 10% do preço
  const cpaPct = 10.0;

  // Soma das % sobre o preço (margem + comissão + impostos + CPA)
  const somaPct = margem + comiss + impost + cpaPct;

  if (somaPct >= 100) {
    throw new Error(
      `A soma das porcentagens chegou a ${somaPct.toFixed(2)}% (>=100%). Reduza margem/comissão/impostos.`
    );
  }

  // Preço de venda: P = C0 / (1 - (margem+comissão+impostos+CPA)/100)
  const preco = C0 / (1 - somaPct / 100.0);

  // Quebra em R$
  const cpaR = preco * (cpaPct / 100.0);
  const lucro = preco * (margem / 100.0);
  const comR = preco * (comiss / 100.0);
  const impR = preco * (impost / 100.0);

  // ROAS ideal = preço / cpa (quanto deve retornar por R$1 investido)
  const roasIdeal = cpaR > 0 ? preco / cpaR : Infinity;

  return {
    produto: input.nomeProduto.trim(),
    precoVenda: Math.round(preco * 100) / 100,
    detalheRS: {
      custoProduto: Math.round(CProd * 100) / 100,
      custoUnidade: Math.round(CUnit * 100) / 100,
      outrasDespesas: Math.round(COut * 100) / 100,
      comissao: Math.round(comR * 100) / 100,
      impostos: Math.round(impR * 100) / 100,
      lucro: Math.round(lucro * 100) / 100,
      cpa10pct: Math.round(cpaR * 100) / 100,
    },
    percentuaisSobrePreco: {
      margem,
      comissao: comiss,
      impostos: impost,
      cpa: cpaPct,
      somaTotal: somaPct,
    },
    roasIdeal: Math.round(roasIdeal * 100) / 100,
  };
}

// Componente para ícones
const CalculatorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF3A29" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
    <line x1="9" x2="15" y1="9" y2="9"/>
    <line x1="9" x2="15" y1="13" y2="13"/>
    <line x1="9" x2="15" y1="17" y2="17"/>
  </svg>
);

export default function CalculadoraPage() {
  const [form, setForm] = useState<CalculatorInput>({
    nomeProduto: "",
    custoProduto: "",
    custoUnidade: "",
    margemPct: "",
    comissaoPct: "",
    impostosPct: "",
    outrasDespesas: "",
  });

  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Limpa erro ao digitar
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const calculationResult = calcularPrecoSemCpa(form);
      setResult(calculationResult);
    } catch (err: any) {
      setError(err.message || "Erro no cálculo. Verifique os valores inseridos.");
    }

    setLoading(false);
  };

  const handleReset = () => {
    setForm({
      nomeProduto: "",
      custoProduto: "",
      custoUnidade: "",
      margemPct: "",
      comissaoPct: "",
      impostosPct: "",
      outrasDespesas: "",
    });
    setResult(null);
    setError("");
  };

  return (
    <div className="bg-[#000000] text-white min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <CalculatorIcon />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Calculadora de{" "}
              <span className="bg-gradient-to-r from-[#FF3A29] to-[#F98934] bg-clip-text text-transparent">
                Precificação Shopee
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
              Calcule o preço ideal do seu produto considerando todos os custos,
              margem de lucro e CPA automático de 10%. Tenha o ROAS ideal para suas campanhas.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Formulário */}
            <Card className="bg-transparent border-2 border-[#57545c] rounded-lg shadow-lg">
              <CardHeader className="text-center p-6">
                <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#FF3A29] via-[#F96534] to-[#E2732C] bg-clip-text text-transparent mb-2">
                  Dados do Produto
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Preencha as informações do seu produto para calcular o preço ideal
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {error && (
                  <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded-md mb-6 text-center font-semibold">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Nome do Produto *
                    </label>
                    <Input
                      name="nomeProduto"
                      value={form.nomeProduto}
                      onChange={handleChange}
                      className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                      placeholder="Ex: Camiseta Premium"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                        Custo do Produto (R$) *
                      </label>
                      <Input
                        name="custoProduto"
                        value={form.custoProduto}
                        onChange={handleChange}
                        className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                        placeholder="Ex: 15,00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                        Custo por Unidade (R$) *
                      </label>
                      <Input
                        name="custoUnidade"
                        value={form.custoUnidade}
                        onChange={handleChange}
                        className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                        placeholder="Ex: 5,00"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                        Margem Desejada (%) *
                      </label>
                      <Input
                        name="margemPct"
                        value={form.margemPct}
                        onChange={handleChange}
                        className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                        placeholder="Ex: 30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                        Comissão Shopee (%) *
                      </label>
                      <Input
                        name="comissaoPct"
                        value={form.comissaoPct}
                        onChange={handleChange}
                        className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                        placeholder="Ex: 5"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-white">
                        Impostos (%) *
                      </label>
                      <Input
                        name="impostosPct"
                        value={form.impostosPct}
                        onChange={handleChange}
                        className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                        placeholder="Ex: 8"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-white">
                      Outras Despesas (R$)
                    </label>
                    <Input
                      name="outrasDespesas"
                      value={form.outrasDespesas}
                      onChange={handleChange}
                      className="border-2 border-[#FF3A29] bg-white/5 text-white placeholder:text-gray-400 focus:ring-[#FF3A29]"
                      placeholder="Ex: 2,50 (opcional)"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 text-lg font-bold py-3 bg-gradient-to-r from-[#FF3A29] to-[#F98934] hover:from-[#F96534] hover:to-[#E2732C] text-white border-none rounded-md shadow-lg transform hover:scale-105 transition-transform duration-300"
                      disabled={loading}
                    >
                      {loading ? "Calculando..." : "Calcular Preço"}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition"
                    >
                      Limpar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Resultado */}
            {result && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-transparent border-2 border-green-600 rounded-lg shadow-lg">
                  <CardHeader className="text-center p-6">
                    <CardTitle className="text-2xl md:text-3xl font-bold text-green-400 mb-2">
                      Resultado do Cálculo
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {result.produto}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {/* Preço de Venda */}
                    <div className="text-center bg-gradient-to-r from-[#FF3A29] to-[#F98934] p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Preço de Venda Ideal
                      </h3>
                      <p className="text-4xl font-bold text-white">
                        R$ {result.precoVenda.toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    {/* Detalhamento em R$ */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">
                        Detalhamento por Real (R$)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Custo do Produto:</span>
                          <span className="text-white font-semibold">
                            R$ {result.detalheRS.custoProduto.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Custo por Unidade:</span>
                          <span className="text-white font-semibold">
                            R$ {result.detalheRS.custoUnidade.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Outras Despesas:</span>
                          <span className="text-white font-semibold">
                            R$ {result.detalheRS.outrasDespesas.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Comissão:</span>
                          <span className="text-white font-semibold">
                            R$ {result.detalheRS.comissao.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Impostos:</span>
                          <span className="text-white font-semibold">
                            R$ {result.detalheRS.impostos.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-400">Lucro:</span>
                          <span className="text-green-400 font-semibold">
                            R$ {result.detalheRS.lucro.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-400">CPA (10%):</span>
                          <span className="text-orange-400 font-semibold">
                            R$ {result.detalheRS.cpa10pct.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Percentuais */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">
                        Percentuais sobre o Preço
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Margem:</span>
                          <span className="text-white font-semibold">
                            {result.percentuaisSobrePreco.margem.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Comissão:</span>
                          <span className="text-white font-semibold">
                            {result.percentuaisSobrePreco.comissao.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Impostos:</span>
                          <span className="text-white font-semibold">
                            {result.percentuaisSobrePreco.impostos.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-400">CPA:</span>
                          <span className="text-orange-400 font-semibold">
                            {result.percentuaisSobrePreco.cpa.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-600 pt-2">
                          <span className="text-white font-semibold">Total:</span>
                          <span className="text-white font-semibold">
                            {result.percentuaisSobrePreco.somaTotal.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ROAS Ideal */}
                    <div className="text-center bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-lg">
                      <h4 className="text-lg font-semibold text-white mb-2">
                        ROAS Ideal para Campanhas
                      </h4>
                      <p className="text-2xl font-bold text-white">
                        {result.roasIdeal === Infinity ? "∞" : result.roasIdeal.toFixed(2)}x
                      </p>
                      <p className="text-sm text-blue-200 mt-1">
                        Retorno esperado por R$1 investido em ads
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Informações Adicionais */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Como Funciona a{" "}
            <span className="bg-gradient-to-r from-[#FF3A29] to-[#F98934] bg-clip-text text-transparent">
              Calculadora
            </span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-[#FF3A29] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Insira os Custos
              </h3>
              <p className="text-gray-300">
                Digite todos os custos do produto: fabricação, unidade, impostos e outras despesas.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#FF3A29] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                CPA Automático
              </h3>
              <p className="text-gray-300">
                A calculadora aplica automaticamente 10% para CPA (custo por aquisição) nas campanhas.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-[#FF3A29] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Preço e ROAS Ideal
              </h3>
              <p className="text-gray-300">
                Receba o preço de venda ideal e o ROAS necessário para suas campanhas Shopee Ads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-black text-center text-gray-500">
        <p>© 2025 Calculadora de Precificação Shopee. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}


