import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const checklistData = [
  {
    title: "BLOCO 1 – PRODUTOS",
    items: [
      {
        title: "Cadastro de Produto",
        description: "Realizamos o cadastro completo de um novo produto, com título estratégico, descrição estruturada e variações configuradas corretamente, de acordo com os padrões exigidos pela Shopee e com foco em SEO interno e usabilidade."
      },
      {
        title: "Edição de Título / Descrição / Variações",
        description: "Ajustamos informações do anúncio, como título, descrição e variações, para garantir alinhamento com boas práticas de conversão, clareza para o consumidor e conformidade com as diretrizes da plataforma."
      },
      {
        title: "Subida de Imagens Padronizadas",
        description: "Subimos novas imagens seguindo os padrões ideais para Shopee mobile, com fundo branco, ângulos estratégicos e reforço visual da proposta de valor."
      },
      {
        title: "Criação de Imagens Otimizadas",
        description: "Produzimos imagens otimizadas para Shopee com foco em conversão, incluindo benefícios visuais, comparações e reforço de usabilidade."
      },
      {
        title: "Ajuste de Preço por Margem ou Concorrência",
        description: "Atualizamos os preços com base em análise de margem, concorrência e estratégias promocionais."
      },
      {
        title: "Ajuste de Categoria / Atributos",
        description: "Corrigimos categoria e atributos para melhorar ranqueamento e exposição."
      },
      {
        title: "Reestruturação de Kits / Combos",
        description: "Ajustamos ou criamos kits/combos para aumentar o ticket médio e giro de estoque."
      },
      {
        title: "Substituição de Produtos Fora de Linha",
        description: "Removemos produtos descontinuados e substituímos por SKUs mais estratégicos."
      },
      {
        title: "Correção de Anúncios Penalizados",
        description: "Ajustamos anúncios com penalidade para garantir conformidade com a Shopee."
      },
      {
        title: "Pausa Estratégica por Problemas de Estoque",
        description: "Pausamos produtos com problemas operacionais para evitar prejuízos."
      },
      {
        title: "Zerar Estoque com Anúncio em Oferta Relâmpago",
        description: "Para zerar estoque de um item incluso em campanha ativa, realizamos: 1. Pausa e exclusão das campanhas de Oferta Relâmpago programadas, 2. Ajuste de estoque para zero, 3. Recriação das campanhas sem o item pausado."
      },
      {
        title: "Ajuste Temporário via 'Minha Promoção'",
        description: "Aplicamos ajustes de preço temporários com 'Minha Promoção' para manter competitividade quando um item está fora de Oferta Relâmpago."
      },
      {
        title: "Acompanhamento de Produtos com Baixa Performance",
        description: "Monitoramos produtos com baixa taxa de clique/conversão e aplicamos melhorias."
      },
      {
        title: "Relançamento de Produto com Novo Posicionamento",
        description: "Reposicionamos produtos com nova estratégia de comunicação e imagens."
      },
      {
        title: "Atualização de Tabela de Medidas (Moda)",
        description: "Inserimos ou atualizamos tabela de medidas no carrossel e na descrição."
      },
      {
        title: "Criação de Descrições Otimizadas por IA",
        description: "Utilizamos nossa IA para gerar descrições com escaneabilidade, clareza e foco em conversão."
      }
    ]
  },
  {
    title: "BLOCO 2 – MARKETING",
    items: [
      {
        title: "Criação de Oferta Relâmpago",
        description: "Inserimos até 20 produtos estratégicos por ciclo para girar estoque e atrair tráfego."
      },
      {
        title: "Atualização de Oferta Relâmpago",
        description: "Ajustamos produtos futuros em campanhas com troca, ajuste de preço ou datas."
      },
      {
        title: "Exclusão de Oferta Relâmpago",
        description: "Removemos itens por ruptura de estoque, estratégia ou necessidade de reposição."
      },
      {
        title: "Criação de Combo 'Leve + por Menos'",
        description: "Criamos combos com desconto progressivo para elevar ticket médio."
      },
      {
        title: "Ajuste em Campanha de Combo",
        description: "Revisamos campanhas ativas, trocando produtos ou ajustando condições."
      },
      {
        title: "Criação de Presente do Vendedor",
        description: "Incluímos brindes estratégicos para melhorar a experiência e avaliação."
      },
      {
        title: "Criação de Cupons de Desconto",
        description: "Geramos cupons para impulsionar conversão, recuperar carrinhos e reforçar ações."
      },
      {
        title: "Cupons Específicos para Afiliados",
        description: "Criamos cupons estratégicos para campanhas com vendedores parceiros."
      },
      {
        title: "Ativação em Campanhas Shopee",
        description: "Ativamos a conta em campanhas oficiais (ex: 11.11) com produtos estratégicos."
      },
      {
        title: "Criação de Campanha via 'Minha Promoção'",
        description: "Criamos promoções internas personalizadas para manter giro de produtos."
      },
      {
        title: "Promoção Programada para Datas Especiais",
        description: "Preparamos campanhas para datas sazonais com antecedência e estratégia."
      },
      {
        title: "Reestruturação Visual da Vitrine",
        description: "Organizamos a página da loja e Shopee Live com banners e destaques estratégicos."
      },
      {
        title: "Regras de Frete Grátis",
        description: "Ativamos campanhas com base nas regras da Shopee para aumentar conversão."
      },
      {
        title: "Inclusão de Selo de Destaque",
        description: "Aplicamos selos como 'Mais Vendido' para reforçar autoridade."
      },
      {
        title: "Benefícios Visuais nas Imagens",
        description: "Criamos ou atualizamos imagens com diferenciais comerciais visuais."
      },
      {
        title: "Cupom com Condicional de Frete",
        description: "Criamos cupons para impulsionar conversão em regiões ou tickets específicos."
      },
      {
        title: "Pausa de Campanhas com Ruptura de Estoque",
        description: "Pausamos ações com produtos em ruptura para evitar prejuízos e punições."
      },
      {
        title: "Redirecionamento de Campanhas de Produto",
        description: "Migramos investimento de SKUs com baixo desempenho para produtos com maior potencial."
      }
    ]
  },
  {
    title: "BLOCO 3 – SHOPEE ADS",
    items: [
      {
        title: "Criação de Anúncio de Produto",
        description: "Lançamos campanhas baseadas em dados de busca e potencial de conversão."
      },
      {
        title: "Otimização de Palavras-chave",
        description: "Ajustamos termos por performance e custo, usando correspondência adequada."
      },
      {
        title: "Pausa de Palavras Irrelevantes",
        description: "Removemos termos que geram cliques sem conversão."
      },
      {
        title: "Reajuste de Meta de ROAS",
        description: "Ajustamos metas para priorizar escala ou lucro conforme a estratégia."
      },
      {
        title: "Otimização Diária de Orçamento",
        description: "Realocamos verba entre campanhas conforme performance atualizada."
      },
      {
        title: "Criação de Campanha Estratégica por Produto",
        description: "Lançamos campanhas dedicadas a SKUs táticos ou de alta margem."
      },
      {
        title: "Ajuste de Campanha Existente",
        description: "Fizemos alterações técnicas e estratégicas em campanhas já ativas."
      },
      {
        title: "Monitoramento Diário da Performance",
        description: "Acompanhamos os principais KPIs com leitura analítica."
      },
      {
        title: "Criação de Anúncio de Loja",
        description: "Campanha para atrair visitantes qualificados à loja e reforçar marca."
      },
      {
        title: "Análise Semanal de Desempenho",
        description: "Entregamos relatório com visão técnica semanal e ações de correção."
      },
      {
        title: "Estratégia de Lances Personalizados",
        description: "Ajustamos lances manualmente para palavras-chave de fundo de funil."
      },
      {
        title: "Escala com Base em ROAS Sustentável",
        description: "Escalamos campanhas com ROAS constante por mais de 7 dias."
      },
      {
        title: "Descontinuidade de Campanhas Ruins",
        description: "Pausamos campanhas ineficazes para realocar verba."
      },
      {
        title: "Estratégia de Funil Completo",
        description: "Segmentamos campanhas por topo, meio e fundo de funil."
      },
      {
        title: "Segmentação de Palavras por Intenção",
        description: "Organizamos palavras entre genéricas, intermediárias e específicas."
      },
      {
        title: "Ajuste por Calendário Promocional",
        description: "Reorganizamos estrutura para datas como 9.9, 11.11 etc."
      },
      {
        title: "Termos de Busca",
        description: "Avaliamos relatórios e aplicamos ações com base nos termos acionadores."
      },
      {
        title: "ROAS por Produto Anunciado",
        description: "Leitura individual por SKU dentro das campanhas."
      },
      {
        title: "Atualização do Catálogo Anunciado",
        description: "Atualizamos SKUs com base em estoque, sazonalidade e performance."
      },
      {
        title: "Leitura Preditiva com IA Efeito Vendas",
        description: "Utilizamos nossa IA para prever resultados e aplicar ajustes."
      }
    ]
  },
  {
    title: "BLOCO 4 – PROGRAMA DE AFILIADOS",
    items: [
      {
        title: "Ativação no Programa de Afiliados",
        description: "Habilitamos produtos estratégicos no programa para ampliar alcance via influenciadores e vendedores parceiros."
      },
      {
        title: "Criação de Campanha Exclusiva para Afiliados",
        description: "Criamos campanhas com maior comissão para impulsionar a divulgação de produtos de alto giro."
      },
      {
        title: "Monitoramento de Performance dos Afiliados",
        description: "Acompanhamos cliques, pedidos e comissões geradas por produto para avaliar resultado."
      },
      {
        title: "Reajuste de Comissão em Produtos-Chave",
        description: "Ajustamos a comissão paga para tornar o produto mais atrativo no programa e aumentar escala."
      },
      {
        title: "Desativação Temporária de Produtos Não Rentáveis",
        description: "Removemos produtos com baixa margem ou baixo desempenho do programa."
      },
      {
        title: "Teste de Novos Produtos no Programa",
        description: "Cadastramos SKUs novos estrategicamente para validar adesão no canal de afiliados."
      },
      {
        title: "Criação de Kit ou Combo para Afiliado",
        description: "Preparamos kits exclusivos para afiliados com foco em recorrência e ticket médio."
      }
    ]
  },
  {
    title: "BLOCO 5 – GESTÃO ESTRATÉGICA",
    items: [
      {
        title: "Diagnóstico de Conta e Oportunidades",
        description: "Análise técnica para encontrar pontos de melhoria e ações prioritárias."
      },
      {
        title: "Definição de Meta Semanal/Mensal de Vendas",
        description: "Planejamento de metas realistas com base em histórico, orçamento e calendário da Shopee."
      },
      {
        title: "Organização de Prioridades por Categoria ou Produto",
        description: "Definimos onde focar com base em giro, margem e sazonalidade."
      },
      {
        title: "Criação de Calendário de Ações Personalizado",
        description: "Planejamos ações comerciais e promocionais do mês com foco estratégico."
      },
      {
        title: "Alinhamento Estratégico com Cliente",
        description: "Realizamos reunião ou troca de mensagens para validação das ações."
      },
      {
        title: "Preparação da Loja para Datas Sazonais",
        description: "Planejamos e executamos ações para picos de tráfego da plataforma."
      },
      {
        title: "Sugestão de Produtos ou Reposições",
        description: "Orientamos o cliente quanto ao sortimento ideal com base em dados."
      },
      {
        title: "Validação de Estratégias com IA da Efeito Vendas",
        description: "Avaliamos as ações com base nas projeções da nossa inteligência artificial."
      }
    ]
  },
  {
    title: "BLOCO 6 – RELATÓRIOS E ANÁLISES",
    items: [
      {
        title: "Relatório Semanal de Atividades Realizadas",
        description: "Enviamos resumo com todas as ações feitas na conta, com foco em entregabilidade."
      },
      {
        title: "Relatório de Desempenho de Shopee Ads",
        description: "Analisamos os dados principais das campanhas com insights e sugestões."
      },
      {
        title: "Projeção de Receita e ROAS por Campanha",
        description: "Estudo detalhado com base em dados históricos e estimativas da IA."
      },
      {
        title: "Análise Geral de Performance da Conta",
        description: "Avaliação de KPIs como taxa de conversão, ticket médio e giro de estoque."
      },
      {
        title: "Diagnóstico de Funil de Venda na Shopee",
        description: "Leitura completa das etapas: clique, visita, carrinho, venda."
      },
      {
        title: "Acompanhamento de Penalidades e Performance de Vendedor",
        description: "Monitoramos notificações, pontuação e nível da conta para evitar bloqueios."
      }
    ]
  },
  {
    title: "BLOCO 7 – ATENDIMENTO AO CLIENTE (INTERNO)",
    items: [
      {
        title: "Atendimento via WhatsApp Personalizado",
        description: "Realizamos atendimento proativo e consultivo por WhatsApp em horário comercial."
      },
      {
        title: "Acompanhamento e Solução de Dúvidas",
        description: "Respondemos dúvidas e orientações com agilidade, com base nas estratégias da conta."
      },
      {
        title: "Alinhamento com Cliente sobre Ações Executadas",
        description: "Enviamos feedbacks frequentes com transparência e foco na parceria."
      },
      {
        title: "Resgate de Informações e Aprovações",
        description: "Solicitamos aprovações e informações pendentes para manter o plano em execução."
      }
    ]
  },
  {
    title: "BLOCO 8 – INTELIGÊNCIA ARTIFICIAL EXCLUSIVA",
    items: [
      {
        title: "Leitura de Dados Automatizada da Conta",
        description: "Nossa IA analisa diariamente os dados da conta e aponta prioridades."
      },
      {
        title: "Geração de Insights para Escala com Base em IA",
        description: "Recebemos sugestões da IA para ajustes, pausas e escalas em campanhas."
      },
      {
        title: "Análise de Produtos por Conversão e Lucro",
        description: "A IA ranqueia os SKUs com maior margem, ROAS e potencial de escala."
      },
      {
        title: "Projeção Semanal com Base nos Dados",
        description: "Utilizamos algoritmos de predição para projetar faturamento e ROAS."
      },
      {
        title: "Validação de Estratégias Baseadas em IA",
        description: "Toda ação estratégica é validada com suporte técnico da IA, cruzando múltiplas fontes de dados."
      }
    ]
  },
  {
    title: "BLOCO 9 – DATAS DUPLAS",
    items: [
      {
        title: "Monitoramento Intensivo em Datas Comemorativas",
        description: "Reforçamos o acompanhamento entre 7h e 00h em datas como 7.7, 9.9, 11.11 etc."
      },
      {
        title: "Ajuste de Orçamento em Tempo Real",
        description: "Fazemos recargas e realocação estratégica do investimento durante a data."
      },
      {
        title: "Criação e Reforço de Campanhas Promocionais",
        description: "Lançamos campanhas especiais com base nas diretrizes da Shopee e no comportamento do público."
      },
      {
        title: "Comunicação com Cliente para Aprovações Rápidas",
        description: "Acompanhamento em tempo real com cliente para decisões estratégicas rápidas."
      },
      {
        title: "Reforço de Estoque e Logística Pré-data",
        description: "Alinhamos com antecedência a disponibilidade e o giro rápido dos produtos."
      }
    ]
  },
  {
    title: "BLOCO 10 – PROJEÇÃO AVANÇADA X INVESTIMENTO",
    items: [
      {
        title: "Análise de Investimento X Receita Esperada",
        description: "Relatório que cruza o valor investido com a receita potencial de retorno."
      },
      {
        title: "Leitura de Resultados Porcentuais de Escala",
        description: "Indicamos o quanto aumentar de verba para atingir metas de faturamento."
      },
      {
        title: "Projeção de Faturamento Mensal com Base em IA",
        description: "Utilizamos nossa inteligência artificial para projetar vendas semanais e mensais com base no investimento atual."
      },
      {
        title: "Recomendação de Ajustes para Melhorar ROAS",
        description: "Orientamos ações práticas para melhorar retorno e rentabilidade."
      },
      {
        title: "Simulações de Cenários de Investimento",
        description: "Criamos cenários simulados com orçamentos distintos para tomada de decisão."
      }
    ]
  }
];

async function main() {
  console.log('Iniciando seed do checklist...');

  // Limpar dados existentes
  await prisma.checklist_items.deleteMany();
  await prisma.checklist_blocks.deleteMany();

  // Buscar todos os clientes
  const clients = await prisma.clients.findMany();
  if (clients.length === 0) {
    console.log('Nenhum cliente encontrado. Crie clientes antes de rodar o seed do checklist.');
    return;
  }

  for (const client of clients) {
    for (let i = 0; i < checklistData.length; i++) {
      const block = checklistData[i];
      console.log(`Criando bloco: ${block.title} para cliente ${client.name}`);

      const createdBlock = await prisma.checklist_blocks.create({
        data: {
          title: block.title,
          order: i,
        },
      });

      for (let j = 0; j < block.items.length; j++) {
        const item = block.items[j];
        console.log(`Criando item: ${item.title} para cliente ${client.name}`);

        await prisma.checklist_items.create({
          data: {
            block_id: createdBlock.id,
            client_id: client.id, // Associar ao cliente
            title: item.title,
            description: item.description,
            order: j,
          },
        });
      }
    }
  }

  console.log('Seed do checklist concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 