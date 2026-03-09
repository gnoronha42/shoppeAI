"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

// ====== Utilitários numéricos (alinhados com o modelo HTML 2026) ======

// Converte string para número aceitando formatos brasileiros e com "R$"
function _parse(val: any): number {
  if (val === "0") return 0.0001; // evita divisores zero extremos
  if (val === null || val === undefined || val === "") return 0;
  let clean = val.toString().replace("R$", "").trim();
  if (clean.includes(",") && clean.includes(".")) {
    // formato 1.234,56 → remove pontos de milhar
    clean = clean.replace(/\./g, "");
  }
  return parseFloat(clean.replace(",", ".")) || 0;
}

function _format(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Tabela de taxas 2026
function getTaxas(precoEstimado: number) {
  if (precoEstimado < 80) {
    return { comissao: 20, fixa: 4, faixa: "ATÉ R$ 79,99" };
  }
  if (precoEstimado < 100) {
    return { comissao: 14, fixa: 16, faixa: "R$ 80,00 A R$ 99,99" };
  }
  if (precoEstimado < 200) {
    return { comissao: 14, fixa: 20, faixa: "R$ 100,00 A R$ 199,99" };
  }
  return { comissao: 14, fixa: 26, faixa: "ACIMA DE R$ 200,00" };
}

interface FormData {
  nome: string;
  custo: string;
  outros: string;
  imposto: string;
  margemVenda: string;
  margemMarkup: string;
  lucroFixo: string;
  precoAtual: string;
  vendasMes: string;
  usaAds: string;
  roas: string;
}

interface CalculoResult {
  preco: number;
  taxas: { comissao: number; fixa: number; faixa: string };
  custoProd: number;
  outros: number;
  imposto: number;
  cpaPct: number;
  tipo: "VENDA" | "MARKUP" | "FIXO" | "PRATICADO";
  valorMargem: number;
}

export default function Calculadora2026Page() {
  const { user, logout } = useAuth();
  const isCliente = user?.role === "cliente";

  const [form, setForm] = useState<FormData>({
    nome: "",
    custo: "",
    outros: "",
    imposto: "",
    margemVenda: "",
    margemMarkup: "",
    lucroFixo: "",
    precoAtual: "",
    vendasMes: "",
    usaAds: "nao",
    roas: "10",
  });

  const [results, setResults] = useState<{
    venda: CalculoResult | null;
    markup: CalculoResult | null;
    fixo: CalculoResult | null;
    praticado: CalculoResult | null;
  }>({ venda: null, markup: null, fixo: null, praticado: null });

  const [metaVendasMes, setMetaVendasMes] = useState<number>(0);

  const colors = {
    primary: "#FF5722",
    profit: "#69F0AE",
    analysis: "#4FC3F7",
    fixedProfit: "#FFD740",
    loss: "#F44336",
    bgDark: "#0A0A0A",
    cardDark: "#1A1A1A",
    borderSoft: "#333",
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const calcularLogicaDinamica = (
    custoProd: number,
    outros: number,
    imposto: number,
    valorMargem: number,
    cpaPct: number,
    tipo: "VENDA" | "MARKUP" | "FIXO"
  ): CalculoResult => {
    let taxas = getTaxas(0);
    let precoFinal = 0;
    let custoBaseTotal = custoProd + outros;

    // Iteração para encontrar o preço correto (taxa fixa depende do preço)
    for (let i = 0; i < 5; i++) {
      let taxaVarTotal = taxas.comissao + imposto + cpaPct;
      let divisor = 1 - taxaVarTotal / 100;
      if (divisor <= 0) divisor = 0.01;

      if (tipo === "VENDA") {
        let divisorVenda = 1 - (taxaVarTotal + valorMargem) / 100;
        if (divisorVenda <= 0) divisorVenda = 0.01;
        precoFinal = (custoBaseTotal + taxas.fixa) / divisorVenda;
      } else if (tipo === "MARKUP") {
        let lucroR = custoProd * (valorMargem / 100);
        precoFinal = (custoBaseTotal + taxas.fixa + lucroR) / divisor;
      } else if (tipo === "FIXO") {
        // valorMargem em FIXO é lucro desejado em R$
        precoFinal = (custoBaseTotal + taxas.fixa + valorMargem) / divisor;
      }

      let novasTaxas = getTaxas(precoFinal);
      if (novasTaxas.fixa === taxas.fixa) break;
      taxas = novasTaxas;
    }
    
    return { preco: precoFinal, taxas, custoProd, outros, imposto, cpaPct, tipo, valorMargem };
  };

  const gerarCalculos = () => {
    const custoProd = _parse(form.custo);
    const outros = _parse(form.outros);
    const imposto = _parse(form.imposto);
    const mVenda = _parse(form.margemVenda);
    const mMarkup = _parse(form.margemMarkup);
    const mFixo = _parse(form.lucroFixo);
    const precoAtual = _parse(form.precoAtual);
    const vendasMes = _parse(form.vendasMes);
    const usaAds = form.usaAds === "sim";
    const roas = _parse(form.roas) || 10;
    const cpaPct = usaAds ? 100 / roas : 0;

    let resultVenda: CalculoResult | null = null;
    let resultMarkup: CalculoResult | null = null;
    let resultFixo: CalculoResult | null = null;
    let resultPraticado: CalculoResult | null = null;

    if (mVenda > 0) {
      resultVenda = calcularLogicaDinamica(custoProd, outros, imposto, mVenda, cpaPct, "VENDA");
    }

    if (mMarkup > 0) {
      resultMarkup = calcularLogicaDinamica(custoProd, outros, imposto, mMarkup, cpaPct, "MARKUP");
    }

    if (mFixo > 0) {
      resultFixo = calcularLogicaDinamica(custoProd, outros, imposto, mFixo, cpaPct, "FIXO");
    }

    if (precoAtual > 0.1) {
      const taxas = getTaxas(precoAtual);
      resultPraticado = {
        preco: precoAtual,
        taxas,
        custoProd,
        outros,
        imposto,
        cpaPct,
        tipo: "PRATICADO",
        valorMargem: 0,
      };
    }

    setMetaVendasMes(vendasMes);
    setResults({ venda: resultVenda, markup: resultMarkup, fixo: resultFixo, praticado: resultPraticado });
  };

  const renderResultadoCard = (
    res: CalculoResult,
    label: string,
    accentColor: string,
    variant: "venda" | "markup" | "fixo" | "praticado"
  ) => {
    const comissR = res.preco * (res.taxas.comissao / 100);
    const impR = res.preco * (res.imposto / 100);
    const adsR = res.preco * (res.cpaPct / 100);

    let lucroR: number;
    if (res.tipo === "PRATICADO") {
      lucroR = res.preco - (res.custoProd + res.outros + res.taxas.fixa + comissR + impR + adsR);
    } else if (res.tipo === "VENDA") {
      lucroR = res.preco * (res.valorMargem / 100);
    } else if (res.tipo === "MARKUP") {
      lucroR = res.custoProd * (res.valorMargem / 100);
    } else {
      // FIXO: valorMargem é lucro fixo em R$
      lucroR = res.valorMargem;
    }

    const margemReal = res.preco > 0 ? (lucroR / res.preco) * 100 : 0;
    const lucroColor =
      lucroR < 0 ? colors.loss : variant === "fixo" ? colors.fixedProfit : accentColor;

    const vendasMes = metaVendasMes;
    let faturamentoBruto = 0;
    let investimentoAdsMensal = 0;
    let lucroMensal = 0;
    let investimentoDiario = 0;
    let vendasDiarias = 0;
    let lucroDiario = 0;

    if (vendasMes > 0) {
      faturamentoBruto = res.preco * vendasMes;
      investimentoAdsMensal = adsR * vendasMes;
      lucroMensal = lucroR * vendasMes;
      investimentoDiario = investimentoAdsMensal / 30;
      vendasDiarias = vendasMes / 30;
      lucroDiario = lucroMensal / 30;
    }

    const lucroMensalColor = lucroMensal < 0 ? colors.loss : colors.profit;

    return (
      <div
        style={{
          background: colors.cardDark,
          border: `1px solid ${colors.borderSoft}`,
          borderTop:
            variant === "markup"
              ? `5px solid ${colors.profit}`
              : variant === "fixo"
              ? `5px solid ${colors.fixedProfit}`
              : variant === "praticado"
              ? `5px solid ${colors.analysis}`
              : `5px solid ${colors.primary}`,
          padding: "1.5rem",
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: "0.8rem",
            color: accentColor,
            marginBottom: "5px",
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <span
          style={{
            background: "#333",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: "bold",
            marginBottom: "10px",
            display: "inline-block",
          }}
        >
          {res.taxas.faixa}
        </span>
        <div
          style={{
            fontSize: "2.2rem",
            fontWeight: "bold",
            textAlign: "center",
            padding: "15px",
            background: "#000",
            borderRadius: "8px",
            margin: "15px 0",
            color: lucroColor,
          }}
        >
          {_format(res.preco)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", margin: "6px 0" }}>
          <span>Custo Produto:</span>
          <span>{_format(res.custoProd)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", margin: "6px 0" }}>
          <span>Embalagem/Outros:</span>
          <span>{_format(res.outros)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", margin: "6px 0" }}>
          <span>Taxa Fixa Shopee:</span>
          <span>{_format(res.taxas.fixa)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", margin: "6px 0" }}>
          <span>Comissão ({res.taxas.comissao}%):</span>
          <span>{_format(comissR)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", margin: "6px 0" }}>
          <span>Imposto NF ({res.imposto}%):</span>
          <span>{_format(impR)}</span>
        </div>

        {res.cpaPct > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.9rem",
              margin: "6px 0",
              color: colors.analysis,
            }}
          >
            <span>CPA ({res.cpaPct.toFixed(1)}%):</span>
            <span>{_format(adsR)}</span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "1.2rem",
            fontWeight: "bold",
            paddingTop: "10px",
            borderTop: "1px solid #444",
            color: lucroColor,
            marginTop: "15px",
          }}
        >
          <span>LUCRO POR UNIDADE:</span>
          <span>{_format(lucroR)}</span>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#888", marginTop: "5px" }}>
          Margem Real sobre Venda: {margemReal.toFixed(2)}%
        </div>

        {vendasMes > 0 && (
          <div
            style={{
              background: "#111",
              borderRadius: "8px",
              padding: "12px",
              marginTop: "15px",
              border: "1px dashed #444",
            }}
          >
            <div
              style={{
                fontSize: "0.85rem",
                color: "#fff",
                fontWeight: 600,
                textAlign: "center",
                marginBottom: "10px",
                borderBottom: "1px solid #333",
                paddingBottom: "5px",
              }}
            >
              PROJEÇÃO MENSAL (Meta {vendasMes})
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", margin: "6px 0" }}>
              <span>Faturamento Bruto:</span>
              <span style={{ color: colors.primary, fontWeight: "bold" }}>{_format(faturamentoBruto)}</span>
            </div>

            {investimentoAdsMensal > 0 && (
              <div
                style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", margin: "6px 0" }}
              >
                <span>Investimento em Ads:</span>
                <span style={{ color: colors.analysis }}>{_format(investimentoAdsMensal)}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.85rem",
                margin: "6px 0",
                marginTop: "8px",
                borderTop: "1px solid #222",
                paddingTop: "5px",
              }}
            >
              <span>LUCRO MENSAL:</span>
              <span style={{ color: lucroMensalColor, fontWeight: "bold" }}>{_format(lucroMensal)}</span>
            </div>

            <div
              style={{
                fontSize: "0.85rem",
                color: "#fff",
                fontWeight: 600,
                textAlign: "center",
                marginTop: "10px",
                borderTop: "1px solid #333",
                paddingTop: "8px",
              }}
            >
              METAS DIÁRIAS
            </div>

            {investimentoDiario > 0 && (
              <div
                style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", margin: "6px 0" }}
              >
                <span>Investimento Diário:</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>{_format(investimentoDiario)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", margin: "6px 0" }}>
              <span>Vendas Diárias (Meta):</span>
              <span style={{ color: "#fff", fontWeight: "bold" }}>{vendasDiarias.toFixed(1)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", margin: "6px 0" }}>
              <span>Lucro Diário Estimado:</span>
              <span style={{ color: lucroMensalColor, fontWeight: "bold" }}>{_format(lucroDiario)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: colors.bgDark,
        color: "#fff",
        fontFamily: "'Poppins', sans-serif",
        margin: 0,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      {isCliente && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "#888" }}>{user?.name}</span>
          <button
            type="button"
            onClick={logout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid #555",
              borderRadius: "8px",
              color: "#ccc",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      )}
      <h1 style={{ color: colors.primary, textAlign: "center", fontSize: "1.8rem", marginBottom: "20px" }}>
        Calculadora Shopee 2026 📈
      </h1>

      {/* Tabelas de Informação */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          width: "100%",
          maxWidth: "1100px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: "300px",
            background: colors.cardDark,
            border: `1px solid ${colors.borderSoft}`,
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              background: "#222",
              margin: 0,
              padding: "10px",
              fontSize: "0.9rem",
              textAlign: "center",
              color: colors.primary,
            }}
          >
            Regras de Comissão e Taxas (2026)
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th
                  style={{
                    background: "#111",
                    color: "#aaa",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                  }}
                >
                  Valor de Venda
                </th>
                <th
                  style={{
                    background: "#111",
                    color: "#aaa",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                  }}
                >
                  Comissão
                </th>
                <th
                  style={{
                    background: "#111",
                    color: "#aaa",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                  }}
                >
                  Taxa Fixa
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Até R$ 79,99</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>20%</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>R$ 4,00</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>
                  R$ 80,00 a R$ 99,99
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>14%</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>R$ 16,00</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>
                  R$ 100,00 a R$ 199,99
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>14%</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>R$ 20,00</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>R$ 200,00+</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>14%</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>R$ 26,00</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: "300px",
            background: colors.cardDark,
            border: `1px solid ${colors.borderSoft}`,
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              background: "#222",
              margin: 0,
              padding: "10px",
              fontSize: "0.9rem",
              textAlign: "center",
              color: colors.primary,
            }}
          >
            Estratégia de ROAS
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th
                  style={{
                    background: "#111",
                    color: "#aaa",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                  }}
                >
                  Nível
                </th>
                <th
                  style={{
                    background: "#111",
                    color: "#aaa",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                  }}
                >
                  ROAS
                </th>
                <th
                  style={{
                    background: "#111",
                    color: "#aaa",
                    padding: "8px",
                    borderBottom: "1px solid #333",
                    textAlign: "center",
                  }}
                >
                  Foco
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Agressivo</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>3 - 7</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Volume</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Intermediário</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>7 - 10</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Escala</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Estável</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>10 - 15</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Equilíbrio</td>
              </tr>
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Rentável</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>15.1+</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "center" }}>Lucro</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulário */}
      <div
        style={{
          backgroundColor: colors.cardDark,
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 0 15px rgba(255, 87, 34, 0.2)",
          width: "100%",
          maxWidth: "850px",
          boxSizing: "border-box",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1rem",
            color: "#fff",
            borderLeft: `4px solid ${colors.primary}`,
            paddingLeft: "10px",
            marginBottom: "15px",
          }}
        >
          1. Dados do Produto e Custos
        </h2>
        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Nome do Produto
            </label>
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Fone de Ouvido Bluetooth"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Custo Fornecedor (R$)
            </label>
            <input
              name="custo"
              type="text"
              value={form.custo}
              onChange={handleChange}
              placeholder="25,00"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Embalagem/Outros (R$)
            </label>
            <input
              name="outros"
              type="text"
              value={form.outros}
              onChange={handleChange}
              placeholder="1,50"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Imposto NF (%)
            </label>
            <input
              name="imposto"
              type="text"
              value={form.imposto}
              onChange={handleChange}
              placeholder="6"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <h2
          style={{
            fontSize: "1rem",
            color: "#fff",
            borderLeft: `4px solid ${colors.primary}`,
            paddingLeft: "10px",
            marginBottom: "15px",
            marginTop: "25px",
          }}
        >
          2. Metas de Lucro Desejado
        </h2>
        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Margem / Venda (%)
            </label>
            <input
              name="margemVenda"
              type="text"
              value={form.margemVenda}
              onChange={handleChange}
              placeholder="20"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Markup / Custo (%)
            </label>
            <input
              name="margemMarkup"
              type="text"
              value={form.margemMarkup}
              onChange={handleChange}
              placeholder="50"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Lucro Fixo (R$ por unid.)
            </label>
            <input
              name="lucroFixo"
              type="text"
              value={form.lucroFixo}
              onChange={handleChange}
              placeholder="10,00"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <h2
          style={{
            fontSize: "1rem",
            color: "#fff",
            borderLeft: `4px solid ${colors.primary}`,
            paddingLeft: "10px",
            marginBottom: "15px",
          }}
        >
          3. Configuração de Ads
        </h2>
        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Usa Ads (CPA)?
            </label>
            <select
              name="usaAds"
              value={form.usaAds}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          {form.usaAds === "sim" && (
            <div style={{ flex: 1, minWidth: "180px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
                ROAS Alvo
              </label>
              <input
                name="roas"
                type="text"
                value={form.roas}
                onChange={handleChange}
                placeholder="10"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: `1px solid ${colors.borderSoft}`,
                  background: "#222",
                  color: "#fff",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>

        <h2
          style={{
            fontSize: "1rem",
            color: "#fff",
            borderLeft: `4px solid ${colors.primary}`,
            paddingLeft: "10px",
            marginBottom: "15px",
          }}
        >
          4. Preço Praticado e Expectativa Mensal
        </h2>
        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Seu Preço Atual (R$)
            </label>
            <input
              name="precoAtual"
              type="text"
              value={form.precoAtual}
              onChange={handleChange}
              placeholder="Ex: 79,90"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "5px", color: "#bbb" }}>
              Vendas p/ Mês (Meta)
            </label>
            <input
              name="vendasMes"
              type="text"
              value={form.vendasMes}
              onChange={handleChange}
              placeholder="Ex: 100"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: `1px solid ${colors.borderSoft}`,
                background: "#222",
                color: "#fff",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <button
          onClick={gerarCalculos}
          style={{
            width: "100%",
            padding: "15px",
            border: "none",
            borderRadius: "6px",
            background: "linear-gradient(90deg, #FF5722, #FF7043)",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "1.1rem",
            marginTop: "20px",
          }}
        >
          Calcular Preços e Projeções 🚀
        </button>
      </div>

      {/* Resultados */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "20px",
          width: "100%",
          maxWidth: "1200px",
        }}
      >
        {results.venda &&
          renderResultadoCard(results.venda, "META POR MARGEM / VENDA", colors.primary, "venda")}
        {results.markup &&
          renderResultadoCard(results.markup, "META POR MARKUP / CUSTO", colors.profit, "markup")}
        {results.fixo &&
          renderResultadoCard(results.fixo, "META POR LUCRO FIXO", colors.fixedProfit, "fixo")}
        {results.praticado &&
          renderResultadoCard(
            results.praticado,
            "ANÁLISE DE PREÇO ATUAL",
            colors.analysis,
            "praticado"
          )}
      </div>
    </div>
  );
}
