import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  CreditCard, 
  PieChart as PieIcon, 
  Layers,
  Percent,
  PlusCircle,
  ExternalLink,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { useSupermercado } from '../context/SupermercadoContext';
import { Venda } from '../types';

interface DashboardViewProps {
  onNavigateToEstoque: () => void;
  onNavigateToPDV: () => void;
  onNovoProduto: () => void;
}

type PeriodoFiltro = 'hoje' | '7dias' | '30dias' | 'mes' | 'tudo';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToEstoque,
  onNavigateToPDV,
  onNovoProduto,
}) => {
  const { produtos, vendas } = useSupermercado();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('30dias');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filter sales by selected period (only 'concluida' sales count towards revenue & profit)
  const vendasFiltradas = useMemo(() => {
    const agora = new Date();
    const hojeStr = agora.toISOString().split('T')[0];

    return vendas.filter(v => {
      if (v.status !== 'concluida') return false;
      const dataVenda = new Date(v.data_hora);

      if (periodo === 'hoje') {
        return v.data_hora.startsWith(hojeStr);
      }
      if (periodo === '7dias') {
        const seteDiasAtras = new Date(agora);
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        return dataVenda >= seteDiasAtras;
      }
      if (periodo === '30dias') {
        const trintaDiasAtras = new Date(agora);
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        return dataVenda >= trintaDiasAtras;
      }
      if (periodo === 'mes') {
        return dataVenda.getMonth() === agora.getMonth() && dataVenda.getFullYear() === agora.getFullYear();
      }
      return true; // 'tudo'
    });
  }, [vendas, periodo]);

  // Overall Financial Metrics from the filtered sales
  const metrics = useMemo(() => {
    const faturamentoTotal = vendasFiltradas.reduce((acc, v) => acc + (v.total || 0), 0);
    const custoTotal = vendasFiltradas.reduce((acc, v) => acc + (v.custo_total || 0), 0);
    const lucroTotal = vendasFiltradas.reduce((acc, v) => acc + (v.lucro_total || 0), 0);
    const margemMedia = faturamentoTotal > 0 ? (lucroTotal / faturamentoTotal) * 100 : 0;
    const totalVendas = vendasFiltradas.length;
    const ticketMedio = totalVendas > 0 ? faturamentoTotal / totalVendas : 0;

    // Inventory status metrics
    const valorEstoqueCusto = produtos.reduce((acc, p) => acc + (p.preco_custo * p.estoque_atual), 0);
    const valorEstoqueVenda = produtos.reduce((acc, p) => acc + (p.preco_venda * p.estoque_atual), 0);
    const lucroEstoqueProjetado = valorEstoqueVenda - valorEstoqueCusto;
    const totalItensEstoque = produtos.reduce((acc, p) => acc + p.estoque_atual, 0);

    const produtosEstoqueBaixo = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);
    const produtosEsgotados = produtos.filter(p => p.estoque_atual <= 0);

    return {
      faturamentoTotal,
      custoTotal,
      lucroTotal,
      margemMedia,
      totalVendas,
      ticketMedio,
      valorEstoqueCusto,
      valorEstoqueVenda,
      lucroEstoqueProjetado,
      totalItensEstoque,
      produtosEstoqueBaixo,
      produtosEsgotados,
    };
  }, [vendasFiltradas, produtos]);

  // Top Selling Products Calculation
  const topProdutos = useMemo(() => {
    const map = new Map<string, { nome: string; quantidade: number; faturamento: number; unidade: string }>();

    for (const v of vendasFiltradas) {
      for (const item of v.itens) {
        const key = item.produto_nome;
        const current = map.get(key) || { nome: key, quantidade: 0, faturamento: 0, unidade: item.unidade };
        map.set(key, {
          nome: key,
          quantidade: current.quantidade + item.quantidade,
          faturamento: current.faturamento + item.subtotal,
          unidade: item.unidade,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasFiltradas]);

  // Sales by Payment Method
  const vendasPorPagamento = useMemo(() => {
    const formas: Record<string, { label: string; count: number; total: number; cor: string }> = {
      dinheiro: { label: 'Dinheiro', count: 0, total: 0, cor: '#10b981' },
      pix: { label: 'PIX', count: 0, total: 0, cor: '#06b6d4' },
      cartao_debito: { label: 'Cartão Débito', count: 0, total: 0, cor: '#3b82f6' },
      cartao_credito: { label: 'Cartão Crédito', count: 0, total: 0, cor: '#8b5cf6' },
      vale_alimentacao: { label: 'Vale Alim./Ref.', count: 0, total: 0, cor: '#f59e0b' },
      outro: { label: 'Outros', count: 0, total: 0, cor: '#64748b' },
    };

    for (const v of vendasFiltradas) {
      const key = v.forma_pagamento || 'outro';
      if (!formas[key]) {
        formas[key] = { label: key, count: 0, total: 0, cor: '#64748b' };
      }
      formas[key].count += 1;
      formas[key].total += v.total;
    }

    return Object.values(formas).filter(f => f.count > 0);
  }, [vendasFiltradas]);

  // Sales by Category
  const vendasPorCategoria = useMemo(() => {
    const map = new Map<string, number>();

    // Link items back to products if available
    for (const v of vendasFiltradas) {
      for (const item of v.itens) {
        const prod = produtos.find(p => p.id === item.produto_id);
        const cat = prod?.categoria || 'Mercearia';
        map.set(cat, (map.get(cat) || 0) + item.subtotal);
      }
    }

    return Array.from(map.entries())
      .map(([categoria, valor]) => ({ categoria, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [vendasFiltradas, produtos]);

  // Daily Sales for chart (last 7 or 14 points)
  const vendasPorDia = useMemo(() => {
    const diasMap = new Map<string, number>();
    
    // Sort chronological
    const sorted = [...vendasFiltradas].sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    for (const v of sorted) {
      const d = new Date(v.data_hora);
      const diaFormatado = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      diasMap.set(diaFormatado, (diasMap.get(diaFormatado) || 0) + v.total);
    }

    return Array.from(diasMap.entries()).map(([dia, total]) => ({ dia, total }));
  }, [vendasFiltradas]);

  // Maximum day total for SVG scaling
  const maxDayTotal = useMemo(() => {
    if (vendasPorDia.length === 0) return 1;
    return Math.max(...vendasPorDia.map(d => d.total), 1);
  }, [vendasPorDia]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Welcome & Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Dashboard do Supermercado
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Relatórios em tempo real baseados nos produtos e vendas cadastrados
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 px-2 font-medium hidden lg:inline flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Período:
          </span>
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              periodo === 'hoje' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('7dias')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              periodo === '7dias' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPeriodo('30dias')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              periodo === '30dias' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 Dias
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              periodo === 'mes' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo('tudo')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              periodo === 'tudo' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todo Histórico
          </button>
        </div>
      </div>

      {/* EMPTY STATE BANNER if no products and no sales registered yet */}
      {produtos.length === 0 && vendas.length === 0 && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistema pronto para uso</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Bem-vindo ao seu Sistema de Supermercados!
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Como solicitado, <b>nenhuma informação fictícia ou modelo foi criada</b>. Todo o estoque e vendas serão criados exclusivamente por você. Conforme você cadastrar seus produtos e registrar vendas, todos os relatórios, gráficos e indicadores deste painel serão preenchidos automaticamente.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onNovoProduto}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <PlusCircle className="w-4 h-4" />
                Cadastrar Primeiro Produto
              </button>
              <button
                onClick={onNavigateToEstoque}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-all border border-white/20 flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Acessar Módulo Estoque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Financial Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card: Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.faturamentoTotal)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>{metrics.totalVendas} vendas no período</span>
            </p>
          </div>
        </div>

        {/* Card: Lucro Bruto */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lucro Bruto Real</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.lucroTotal)}
            </div>
            <p className="text-xs text-teal-700 mt-1 flex items-center gap-1 font-semibold">
              <Percent className="w-3.5 h-3.5" />
              Margem de {metrics.margemMedia.toFixed(1)}% das vendas
            </p>
          </div>
        </div>

        {/* Card: Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.ticketMedio)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Média gasta por cliente/venda
            </p>
          </div>
        </div>

        {/* Card: Patrimônio em Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor em Estoque</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.valorEstoqueCusto)}
            </div>
            <p className="text-xs text-purple-700 mt-1 font-medium">
              Venda potencial: {formatCurrency(metrics.valorEstoqueVenda)}
            </p>
          </div>
        </div>

      </div>

      {/* Stock Alerts Notice Bar */}
      {metrics.produtosEstoqueBaixo.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
                Alerta de Reposição de Estoque ({metrics.produtosEstoqueBaixo.length} itens precisam de atenção)
              </p>
              <p className="text-xs text-amber-800">
                {metrics.produtosEsgotados.length > 0 && (
                  <span className="font-semibold text-rose-700 mr-2">
                    {metrics.produtosEsgotados.length} esgotado(s)!
                  </span>
                )}
                Alguns produtos atingiram ou estão abaixo do estoque mínimo cadastrado.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToEstoque}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors self-start sm:self-auto shrink-0 shadow-xs"
          >
            Ver Produtos em Alerta
          </button>
        </div>
      )}

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Daily Sales Bar Chart (Span 2) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Histórico de Vendas no Período</h3>
              <p className="text-xs text-slate-500">Faturamento acumulado por dia com vendas registradas</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {vendasPorDia.length} dia(s) com movimento
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-end min-h-[220px]">
            {vendasPorDia.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                <ShoppingBag className="w-8 h-8 mb-2 text-slate-300" />
                <p>Nenhuma venda registrada neste período.</p>
                <p className="text-slate-400 mt-1">Realize uma venda no PDV para visualizar o gráfico.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-44 flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-100 overflow-x-auto">
                  {vendasPorDia.map((item, idx) => {
                    const heightPercent = Math.max(12, Math.round((item.total / maxDayTotal) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 min-w-[36px] group relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-1 bg-slate-800 text-white text-[10px] rounded-md font-mono whitespace-nowrap pointer-events-none z-20 shadow-md">
                          {formatCurrency(item.total)}
                        </div>
                        {/* Bar */}
                        <div className="w-full bg-slate-100 rounded-t-md h-full flex items-end">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-md transition-all duration-500 group-hover:from-emerald-500 group-hover:to-teal-400"
                          />
                        </div>
                        {/* Day label */}
                        <span className="text-[10px] font-mono text-slate-500 truncate w-full text-center">
                          {item.dia}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Início do período</span>
                  <span>Mais recente</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Formas de Pagamento
            </h3>
            <p className="text-xs text-slate-500">Distribuição do faturamento por meio de pagamento</p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {vendasPorPagamento.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <PieIcon className="w-8 h-8 mb-2 text-slate-300" />
                <p>Nenhuma venda registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vendasPorPagamento.map((item, idx) => {
                  const percent = metrics.faturamentoTotal > 0 
                    ? ((item.total / metrics.faturamentoTotal) * 100).toFixed(1) 
                    : '0';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.cor }} />
                          {item.label}
                        </span>
                        <span className="font-bold text-slate-900">{formatCurrency(item.total)} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percent}%`, backgroundColor: item.cor }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Two Column Section: Top Products & Sales by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Best Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Top 5 Produtos Mais Vendidos
              </h3>
              <p className="text-xs text-slate-500">Itens com maior volume de saída nas vendas cadastradas</p>
            </div>
            {topProdutos.length > 0 && (
              <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
                Ranking
              </span>
            )}
          </div>

          {topProdutos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Nenhuma venda registrada até o momento.</p>
              <p className="mt-1">Quando você registrar vendas no PDV, os produtos campeões aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProdutos.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{prod.nome}</p>
                      <p className="text-[11px] text-slate-500">
                        {prod.quantidade} {prod.unidade} vendida(s)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{formatCurrency(prod.faturamento)}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">Total faturado</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales by Category & Inventory Quick Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Vendas por Categoria / Setor
                </h3>
                <p className="text-xs text-slate-500">Faturamento gerado por departamento do supermercado</p>
              </div>
            </div>

            {vendasPorCategoria.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Nenhum dado de categoria disponível ainda.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {vendasPorCategoria.map((cat, idx) => {
                  const percent = metrics.faturamentoTotal > 0 
                    ? ((cat.valor / metrics.faturamentoTotal) * 100).toFixed(1) 
                    : '0';
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{cat.categoria}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(cat.valor)} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supermarket Summary Box */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 p-3 rounded-xl">
            <div>
              <p className="text-xs font-bold text-slate-800">
                {produtos.length} produtos cadastrados no total
              </p>
              <p className="text-[11px] text-slate-500">
                {metrics.totalItensEstoque} unidades totais estocadas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigateToEstoque}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1"
              >
                Estoque <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNavigateToPDV}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-xs"
              >
                Abrir PDV <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
