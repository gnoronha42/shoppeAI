"use client";

import React, { useState } from "react";

// Função para converter string para float (aceita formato brasileiro)
function _parse(val: any): number {
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\./g, '').replace(',', '.')) || 0;
}

// Função de formatação BRL
function _format(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para obter taxas baseadas no preço (regras 2026)
function getTaxas(precoEstimado: number) {
  if (precoEstimado < 80) {
    return { comissao: 20, fixa: 4, faixa: "ATÉ R$ 79,99 (20% + 4,00)" };
  } else if (precoEstimado < 100) {
    return { comissao: 14, fixa: 16, faixa: "R$ 80,00 A R$ 99,99 (14% + 16,00)" };
  } else if (precoEstimado < 200) {
    return { comissao: 14, fixa: 20, faixa: "R$ 100,00 A R$ 199,99 (14% + 20,00)" };
  } else {
    return { comissao: 14, fixa: 26, faixa: "ACIMA DE R$ 200,00 (14% + 26,00)" };
  }
}

interface FormData {
  nome: string;
  custo: string;
  outros: string;
  imposto: string;
  margemVenda: string;
  margemMarkup: string;
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
  tipo: "VENDA" | "MARKUP";
  valorMargem: number;
}

export default function Calculadora2026Page() {
  const [form, setForm] = useState<FormData>({
    nome: "",
    custo: "",
    outros: "",
    imposto: "",
    margemVenda: "",
    margemMarkup: "",
    usaAds: "nao",
    roas: "10"
  });

  const [results, setResults] = useState<{
    venda: CalculoResult | null;
    markup: CalculoResult | null;
  }>({ venda: null, markup: null });

  const colors = {
    primary: '#FF5722',
    profit: '#69F0AE',
    analysis: '#4FC3F7',
    loss: '#F44336',
    bgDark: '#0A0A0A',
    cardDark: '#1A1A1A',
    borderSoft: '#333',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleAds = () => {
    // Função para mostrar/ocultar campo ROAS
  };

  const calcularLogicaDinamica = (
    custoProd: number,
    outros: number,
    imposto: number,
    valorMargem: number,
    cpaPct: number,
    tipo: "VENDA" | "MARKUP"
  ): CalculoResult => {
    let taxas = getTaxas(0);
    let precoFinal = 0;
    let custoBaseTotal = custoProd + outros;

    // Iteração para encontrar o preço correto (taxa fixa depende do preço)
    for (let i = 0; i < 5; i++) {
      let taxaVarTotal = taxas.comissao + imposto + cpaPct;
      if (tipo === "VENDA") {
        let divisor = (1 - (taxaVarTotal + valorMargem) / 100);
        precoFinal = (custoBaseTotal + taxas.fixa) / divisor;
      } else {
        let lucroR = custoProd * (valorMargem / 100);
        let divisor = (1 - taxaVarTotal / 100);
        precoFinal = (custoBaseTotal + taxas.fixa + lucroR) / divisor;
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
    const usaAds = form.usaAds === 'sim';
    const roas = _parse(form.roas) || 10;
    const cpaPct = usaAds ? (100 / roas) : 0;

    let resultVenda: CalculoResult | null = null;
    let resultMarkup: CalculoResult | null = null;

    if (mVenda > 0) {
      resultVenda = calcularLogicaDinamica(custoProd, outros, imposto, mVenda, cpaPct, "VENDA");
    }

    if (mMarkup > 0) {
      resultMarkup = calcularLogicaDinamica(custoProd, outros, imposto, mMarkup, cpaPct, "MARKUP");
    }

    setResults({ venda: resultVenda, markup: resultMarkup });
  };

  return (
    <div style={{
      backgroundColor: colors.bgDark,
      color: '#fff',
      fontFamily: "'Poppins', sans-serif",
      margin: 0,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: colors.primary, textAlign: 'center', fontSize: '1.8rem', marginBottom: '20px' }}>
        Calculadora Shopee 2026
      </h1>

      {/* Tabelas de Informação */}
      <div style={{
        display: 'flex',
        gap: '20px',
        width: '100%',
        maxWidth: '1100px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          minWidth: '300px',
          background: colors.cardDark,
          border: `1px solid ${colors.borderSoft}`,
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <h3 style={{
            background: '#222',
            margin: 0,
            padding: '10px',
            fontSize: '0.9rem',
            textAlign: 'center',
            color: colors.primary
          }}>
            Regras de Comissão e Taxas (2026)
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ background: '#111', color: '#aaa', padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Valor de Venda</th>
                <th style={{ background: '#111', color: '#aaa', padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Comissão</th>
                <th style={{ background: '#111', color: '#aaa', padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Taxa Fixa</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Até R$ 79,99</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>20%</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 4,00</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 80,00 a R$ 99,99</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>14%</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 16,00</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 100,00 a R$ 199,99</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>14%</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 20,00</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 200,00+</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>14%</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>R$ 26,00</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{
          flex: 1,
          minWidth: '300px',
          background: colors.cardDark,
          border: `1px solid ${colors.borderSoft}`,
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <h3 style={{
            background: '#222',
            margin: 0,
            padding: '10px',
            fontSize: '0.9rem',
            textAlign: 'center',
            color: colors.primary
          }}>
            Nível Estratégico de ROAS
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ background: '#111', color: '#aaa', padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Nível</th>
                <th style={{ background: '#111', color: '#aaa', padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Faixa ROAS</th>
                <th style={{ background: '#111', color: '#aaa', padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Foco</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Agressivo</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>3 a 7</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Volume</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Intermediário</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>7 a 10</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Escala</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Estável</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>10 a 15</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Equilíbrio</td></tr>
              <tr><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Rentável</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>15.1+</td><td style={{ padding: '8px', borderBottom: '1px solid #333', textAlign: 'center' }}>Rentabilidade</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulário */}
      <div style={{
        backgroundColor: colors.cardDark,
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 0 15px rgba(255, 87, 34, 0.2)',
        width: '100%',
        maxWidth: '800px',
        boxSizing: 'border-box',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Nome do Produto</label>
            <input
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Fone de Ouvido Bluetooth"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <h2 style={{ fontSize: '1rem', color: '#fff', borderLeft: `4px solid ${colors.primary}`, paddingLeft: '10px', marginBottom: '15px' }}>
          1. Custos
        </h2>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Custo Produto (R$)</label>
            <input
              name="custo"
              type="text"
              value={form.custo}
              onChange={handleChange}
              placeholder="25,00"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Embalagem/Outros (R$)</label>
            <input
              name="outros"
              type="text"
              value={form.outros}
              onChange={handleChange}
              placeholder="1,50"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Imposto NF (%)</label>
            <input
              name="imposto"
              type="text"
              value={form.imposto}
              onChange={handleChange}
              placeholder="6"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <h2 style={{ fontSize: '1rem', color: '#fff', borderLeft: `4px solid ${colors.primary}`, paddingLeft: '10px', marginBottom: '15px' }}>
          2. Margens
        </h2>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Margem sobre Venda (%)</label>
            <input
              name="margemVenda"
              type="text"
              value={form.margemVenda}
              onChange={handleChange}
              placeholder="20"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Markup sobre Produto (%)</label>
            <input
              name="margemMarkup"
              type="text"
              value={form.margemMarkup}
              onChange={handleChange}
              placeholder="50"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <h2 style={{ fontSize: '1rem', color: '#fff', borderLeft: `4px solid ${colors.primary}`, paddingLeft: '10px', marginBottom: '15px' }}>
          3. Ads
        </h2>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>Usa Ads (CPA)?</label>
            <select
              name="usaAds"
              value={form.usaAds}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.borderSoft}`,
                background: '#222',
                color: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          {form.usaAds === 'sim' && (
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#bbb' }}>ROAS Alvo</label>
              <input
                name="roas"
                type="text"
                value={form.roas}
                onChange={handleChange}
                placeholder="10"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.borderSoft}`,
                  background: '#222',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        <button
          onClick={gerarCalculos}
          style={{
            width: '100%',
            padding: '15px',
            border: 'none',
            borderRadius: '6px',
            background: 'linear-gradient(90deg, #FF5722, #FF7043)',
            color: 'white',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '1.1rem'
          }}
        >
          Calcular Preços Reais 🚀
        </button>
      </div>

      {/* Resultados */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px',
        width: '100%',
        maxWidth: '1100px'
      }}>
        {results.venda && (
          <div style={{
            background: colors.cardDark,
            border: `1px solid ${colors.borderSoft}`,
            borderTop: `5px solid ${colors.primary}`,
            padding: '1.5rem',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: colors.primary, marginBottom: '5px' }}>
              OPÇÃO POR MARGEM DE VENDA
            </div>
            <span style={{
              background: '#333',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginBottom: '10px',
              display: 'inline-block'
            }}>
              {results.venda.taxas.faixa}
            </span>
            <div style={{
              fontSize: '2.2rem',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '15px',
              background: '#000',
              borderRadius: '8px',
              margin: '15px 0',
              color: colors.primary
            }}>
              {_format(results.venda.preco)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Custo Produto:</span>
              <span>{_format(results.venda.custoProd)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Embalagem/Outros:</span>
              <span>{_format(results.venda.outros)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Taxa Fixa Shopee:</span>
              <span>{_format(results.venda.taxas.fixa)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Comissão ({results.venda.taxas.comissao}%):</span>
              <span>{_format(results.venda.preco * (results.venda.taxas.comissao / 100))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Imposto NF ({results.venda.imposto}%):</span>
              <span>{_format(results.venda.preco * (results.venda.imposto / 100))}</span>
            </div>

            {results.venda.cpaPct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0', color: colors.analysis }}>
                <span>Investimento Ads ({results.venda.cpaPct.toFixed(1)}%):</span>
                <span>{_format(results.venda.preco * (results.venda.cpaPct / 100))}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              paddingTop: '10px',
              borderTop: '1px solid #444',
              color: colors.primary,
              marginTop: '15px'
            }}>
              <span>LUCRO LÍQUIDO:</span>
              <span>{_format(results.venda.tipo === "VENDA" ? results.venda.preco * (results.venda.valorMargem / 100) : results.venda.custoProd * (results.venda.valorMargem / 100))}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#888', marginTop: '5px' }}>
              Margem Real sobre Venda: {((results.venda.tipo === "VENDA" ? results.venda.preco * (results.venda.valorMargem / 100) : results.venda.custoProd * (results.venda.valorMargem / 100)) / results.venda.preco * 100).toFixed(2)}%
            </div>
          </div>
        )}

        {results.markup && (
          <div style={{
            background: colors.cardDark,
            border: `1px solid ${colors.borderSoft}`,
            borderTop: `5px solid ${colors.profit}`,
            padding: '1.5rem',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: colors.profit, marginBottom: '5px' }}>
              OPÇÃO POR MARKUP PRODUTO
            </div>
            <span style={{
              background: '#333',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              marginBottom: '10px',
              display: 'inline-block'
            }}>
              {results.markup.taxas.faixa}
            </span>
            <div style={{
              fontSize: '2.2rem',
              fontWeight: 'bold',
              textAlign: 'center',
              padding: '15px',
              background: '#000',
              borderRadius: '8px',
              margin: '15px 0',
              color: colors.profit
            }}>
              {_format(results.markup.preco)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Custo Produto:</span>
              <span>{_format(results.markup.custoProd)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Embalagem/Outros:</span>
              <span>{_format(results.markup.outros)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Taxa Fixa Shopee:</span>
              <span>{_format(results.markup.taxas.fixa)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Comissão ({results.markup.taxas.comissao}%):</span>
              <span>{_format(results.markup.preco * (results.markup.taxas.comissao / 100))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0' }}>
              <span>Imposto NF ({results.markup.imposto}%):</span>
              <span>{_format(results.markup.preco * (results.markup.imposto / 100))}</span>
            </div>

            {results.markup.cpaPct > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', margin: '6px 0', color: colors.analysis }}>
                <span>Investimento Ads ({results.markup.cpaPct.toFixed(1)}%):</span>
                <span>{_format(results.markup.preco * (results.markup.cpaPct / 100))}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              paddingTop: '10px',
              borderTop: '1px solid #444',
              color: colors.profit,
              marginTop: '15px'
            }}>
              <span>LUCRO LÍQUIDO:</span>
              <span>{_format(results.markup.tipo === "VENDA" ? results.markup.preco * (results.markup.valorMargem / 100) : results.markup.custoProd * (results.markup.valorMargem / 100))}</span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#888', marginTop: '5px' }}>
              Margem Real sobre Venda: {((results.markup.tipo === "VENDA" ? results.markup.preco * (results.markup.valorMargem / 100) : results.markup.custoProd * (results.markup.valorMargem / 100)) / results.markup.preco * 100).toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
