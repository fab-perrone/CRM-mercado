import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Barcode, 
  User, 
  Layers,
  Sparkles,
  ShoppingBag,
  Percent
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSupermercado } from '../context/SupermercadoContext';
import { Produto, Venda, FormaPagamento } from '../types';
import { ReciboVendaModal } from './ReciboVendaModal';

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

interface VendasPDVViewProps {
  onNavigateToEstoque: () => void;
}

export const VendasPDVView: React.FC<VendasPDVViewProps> = ({ onNavigateToEstoque }) => {
  const { produtos, finalizarVenda } = useSupermercado();

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas');
  const [desconto, setDesconto] = useState<number>(0);
  const [tipoDesconto, setTipoDesconto] = useState<'valor' | 'porcentagem'>('valor');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [clienteNome, setClienteNome] = useState('');
  const [erroPDV, setErroPDV] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  // Completed sale receipt modal
  const [vendaConcluida, setVendaConcluida] = useState<Venda | null>(null);
  const [isReciboOpen, setIsReciboOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Add product to cart
  const handleAdicionarAoCarrinho = (produto: Produto, qtd = 1) => {
    setErroPDV(null);

    if (produto.estoque_atual <= 0) {
      setErroPDV(`O produto "${produto.nome}" está esgotado no estoque.`);
      return;
    }

    const itemExistente = carrinho.find(item => item.produto.id === produto.id);
    const qtdDesejada = itemExistente ? itemExistente.quantidade + qtd : qtd;

    if (qtdDesejada > produto.estoque_atual) {
      setErroPDV(`Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque_atual} ${produto.unidade}`);
      return;
    }

    if (itemExistente) {
      setCarrinho(carrinho.map(item => 
        item.produto.id === produto.id 
          ? { ...item, quantidade: Number((item.quantidade + qtd).toFixed(3)) } 
          : item
      ));
    } else {
      setCarrinho([...carrinho, { produto, quantidade: qtd }]);
    }

    setBusca('');
    searchInputRef.current?.focus();
  };

  // Update item quantity in cart
  const handleAtualizarQuantidade = (produtoId: string, novaQtd: number) => {
    if (novaQtd <= 0) {
      handleRemoverItem(produtoId);
      return;
    }

    const prod = produtos.find(p => p.id === produtoId);
    if (!prod) return;

    if (novaQtd > prod.estoque_atual) {
      setErroPDV(`Estoque insuficiente para "${prod.nome}". Máximo disponível: ${prod.estoque_atual} ${prod.unidade}`);
      return;
    }

    setCarrinho(carrinho.map(item => 
      item.produto.id === produtoId ? { ...item, quantidade: Number(novaQtd.toFixed(3)) } : item
    ));
  };

  const handleRemoverItem = (produtoId: string) => {
    setCarrinho(carrinho.filter(item => item.produto.id !== produtoId));
  };

  const handleLimparCarrinho = () => {
    if (carrinho.length === 0) return;
    if (window.confirm('Tem certeza que deseja cancelar todos os itens deste atendimento?')) {
      setCarrinho([]);
      setDesconto(0);
      setValorRecebido('');
      setClienteNome('');
      setErroPDV(null);
    }
  };

  // Barcode / Name input submit handler
  const handleBuscaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!busca.trim()) return;

    // Search exact barcode first
    const prodBarcode = produtos.find(p => p.codigo_barras.trim().toLowerCase() === busca.trim().toLowerCase());
    if (prodBarcode) {
      handleAdicionarAoCarrinho(prodBarcode, 1);
      return;
    }

    // Search exact name match
    const prodNomeExato = produtos.find(p => p.nome.trim().toLowerCase() === busca.trim().toLowerCase());
    if (prodNomeExato) {
      handleAdicionarAoCarrinho(prodNomeExato, 1);
      return;
    }

    // Search partial match
    const matches = produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
    if (matches.length === 1) {
      handleAdicionarAoCarrinho(matches[0], 1);
      return;
    }

    if (matches.length === 0) {
      setErroPDV(`Nenhum produto cadastrado com código ou nome "${busca}".`);
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return carrinho.reduce((acc, item) => acc + (item.produto.preco_venda * item.quantidade), 0);
  }, [carrinho]);

  const valorDescontoCalculado = useMemo(() => {
    if (tipoDesconto === 'porcentagem') {
      return Number(((subtotal * desconto) / 100).toFixed(2));
    }
    return Number(desconto || 0);
  }, [subtotal, desconto, tipoDesconto]);

  const totalFinal = Math.max(0, Number((subtotal - valorDescontoCalculado).toFixed(2)));

  const troco = useMemo(() => {
    const pago = parseFloat(valorRecebido) || 0;
    if (pago > totalFinal && formaPagamento === 'dinheiro') {
      return Number((pago - totalFinal).toFixed(2));
    }
    return 0;
  }, [valorRecebido, totalFinal, formaPagamento]);

  // Finalize Sale
  const handleFinalizar = async () => {
    if (carrinho.length === 0) {
      setErroPDV('Adicione pelo menos um produto ao carrinho antes de finalizar a venda.');
      return;
    }

    if (formaPagamento === 'dinheiro' && valorRecebido) {
      const pago = parseFloat(valorRecebido);
      if (pago < totalFinal) {
        setErroPDV(`O valor recebido em dinheiro (${formatCurrency(pago)}) é menor que o total da venda (${formatCurrency(totalFinal)}).`);
        return;
      }
    }

    setFinalizando(true);
    setErroPDV(null);

    try {
      const res = await finalizarVenda({
        itens: carrinho,
        desconto: valorDescontoCalculado,
        forma_pagamento: formaPagamento,
        valor_recebido: valorRecebido ? parseFloat(valorRecebido) : undefined,
        cliente_nome: clienteNome.trim() || undefined,
      });

      if (res.success && res.venda) {
        // Trigger confetti!
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }

        setVendaConcluida(res.venda);
        setIsReciboOpen(true);

        // Reset cart
        setCarrinho([]);
        setDesconto(0);
        setValorRecebido('');
        setClienteNome('');
      } else {
        setErroPDV(res.error || 'Erro ao finalizar a venda.');
      }
    } catch (err: any) {
      setErroPDV(err?.message || 'Falha ao processar a venda.');
    } finally {
      setFinalizando(false);
    }
  };

  // Filtered product catalog for quick click
  const catalogoFiltrado = useMemo(() => {
    return produtos.filter(p => {
      const matchCat = categoriaAtiva === 'todas' || p.categoria === categoriaAtiva;
      const matchBusca = !busca || p.nome.toLowerCase().includes(busca.toLowerCase()) || p.codigo_barras.includes(busca);
      return matchCat && matchBusca;
    });
  }, [produtos, categoriaAtiva, busca]);

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set(produtos.map(p => p.categoria));
    return Array.from(set);
  }, [produtos]);

  return (
    <div className="space-y-4 pb-12">
      
      {/* PDV Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Frente de Caixa / PDV
            </h1>
            <p className="text-xs text-slate-500">Ponto de venda com baixa automática no estoque</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {carrinho.length > 0 && (
            <button
              onClick={handleLimparCarrinho}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Caixa
            </button>
          )}
        </div>
      </div>

      {erroPDV && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{erroPDV}</span>
          </div>
          <button onClick={() => setErroPDV(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main PDV Layout: Grid with Left Catalog & Right Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Section: Scanner + Fast Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Barcode / Search Box */}
          <form onSubmit={handleBuscaSubmit} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Escaneie o código de barras ou digite o nome do produto..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                {busca && (
                  <button 
                    type="button"
                    onClick={() => setBusca('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 px-1">
              Dica: Pressione <b>Enter</b> para lançar o produto escaneado imediatamente no cupom.
            </p>
          </form>

          {/* Quick Category Pills */}
          {categoriasDisponiveis.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              <button
                onClick={() => setCategoriaAtiva('todas')}
                className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
                  categoriaAtiva === 'todas'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos ({produtos.length})
              </button>
              {categoriasDisponiveis.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaAtiva(cat)}
                  className={`px-3 py-1.5 rounded-full shrink-0 font-medium transition-colors ${
                    categoriaAtiva === cat
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Products Quick Grid */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Catálogo Rápido de Itens ({catalogoFiltrado.length})
              </span>
              <span className="text-[11px] text-slate-400">Clique para adicionar 1 item</span>
            </div>

            {produtos.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Nenhum produto cadastrado no supermercado.</p>
                <p className="mt-1">Cadastre seus produtos no estoque para iniciar as vendas.</p>
                <button
                  onClick={onNavigateToEstoque}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700"
                >
                  Ir para Estoque
                </button>
              </div>
            ) : catalogoFiltrado.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum produto encontrado com o filtro atual.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {catalogoFiltrado.map(prod => {
                  const esgotado = prod.estoque_atual <= 0;
                  return (
                    <button
                      key={prod.id}
                      onClick={() => handleAdicionarAoCarrinho(prod, 1)}
                      disabled={esgotado}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        esgotado
                          ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                          : 'bg-slate-50 hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-300 hover:shadow-xs cursor-pointer'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {prod.codigo_barras}
                        </span>
                        <p className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 leading-snug">
                          {prod.nome}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-700">
                          {formatCurrency(prod.preco_venda)}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                          esgotado ? 'bg-rose-100 text-rose-700' : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          {esgotado ? '0' : prod.estoque_atual} {prod.unidade}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Section: Shopping Cart & Checkout Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            
            {/* Cart Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Cupom de Venda ({carrinho.length} itens)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Caixa 01</span>
            </div>

            {/* Cart Items List */}
            <div className="p-3 max-h-[300px] overflow-y-auto divide-y divide-slate-100 flex-1">
              {carrinho.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Carrinho Vazio</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Escaneie ou selecione produtos ao lado para iniciar o atendimento.
                  </p>
                </div>
              ) : (
                carrinho.map((item, idx) => (
                  <div key={item.produto.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                        <p className="font-bold text-slate-800 truncate">{item.produto.nome}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatCurrency(item.produto.preco_venda)} / {item.produto.unidade}
                      </p>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => handleAtualizarQuantidade(item.produto.id, item.quantidade - 1)}
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={item.quantidade}
                        onChange={(e) => handleAtualizarQuantidade(item.produto.id, parseFloat(e.target.value) || 0)}
                        className="w-12 text-center font-bold text-xs bg-transparent outline-hidden"
                      />
                      <button
                        onClick={() => handleAtualizarQuantidade(item.produto.id, item.quantidade + 1)}
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-xs">
                        {formatCurrency(item.produto.preco_venda * item.quantidade)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoverItem(item.produto.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Form Section */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              
              {/* Optional Client Name */}
              <div>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Nome do cliente (opcional)"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Discount Row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-slate-500" /> Desconto:
                </span>
                <div className="flex items-center gap-1">
                  <select
                    value={tipoDesconto}
                    onChange={(e) => setTipoDesconto(e.target.value as 'valor' | 'porcentagem')}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="valor">R$</option>
                    <option value="porcentagem">%</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={desconto || ''}
                    onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-right font-semibold outline-hidden"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="space-y-1 pt-1 border-t border-slate-200">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {valorDescontoCalculado > 0 && (
                  <div className="flex justify-between text-xs text-rose-600 font-semibold">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(valorDescontoCalculado)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-300">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Total a Pagar:</span>
                  <span className="text-2xl font-black text-emerald-700">
                    {formatCurrency(totalFinal)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormaPagamento('dinheiro')}
                    className={`py-2 px-1 rounded-lg border font-semibold flex flex-col items-center gap-1 transition-all ${
                      formaPagamento === 'dinheiro'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('pix')}
                    className={`py-2 px-1 rounded-lg border font-semibold flex flex-col items-center gap-1 transition-all ${
                      formaPagamento === 'pix'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('cartao_debito')}
                    className={`py-2 px-1 rounded-lg border font-semibold flex flex-col items-center gap-1 transition-all ${
                      formaPagamento === 'cartao_debito'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('cartao_credito')}
                    className={`py-2 px-1 rounded-lg border font-semibold flex flex-col items-center gap-1 transition-all ${
                      formaPagamento === 'cartao_credito'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormaPagamento('vale_alimentacao')}
                    className={`py-2 px-1 rounded-lg border font-semibold flex flex-col items-center gap-1 transition-all col-span-2 ${
                      formaPagamento === 'vale_alimentacao'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Vale Alimentação / Refeição</span>
                  </button>
                </div>
              </div>

              {/* Cash Change Calculation if Dinheiro */}
              {formaPagamento === 'dinheiro' && totalFinal > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Valor Recebido (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      placeholder={totalFinal.toFixed(2)}
                      className="w-28 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-right font-bold text-sm outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Fast bills shortcuts */}
                  <div className="flex items-center justify-end gap-1 text-[10px]">
                    <span className="text-slate-400 mr-1">Atalhos:</span>
                    <button
                      type="button"
                      onClick={() => setValorRecebido(totalFinal.toString())}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700"
                    >
                      Exato
                    </button>
                    {[10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setValorRecebido(val.toString())}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700"
                      >
                        R${val}
                      </button>
                    ))}
                  </div>

                  {troco > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="font-bold text-emerald-800">Troco do Cliente:</span>
                      <span className="text-base font-black text-emerald-700">
                        {formatCurrency(troco)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Finalize Button */}
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={finalizando || carrinho.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{finalizando ? 'Processando Venda...' : 'FINALIZAR VENDA'}</span>
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Sale Receipt Modal */}
      <ReciboVendaModal
        isOpen={isReciboOpen}
        venda={vendaConcluida}
        onClose={() => setIsReciboOpen(false)}
        onNovaVenda={() => {
          setIsReciboOpen(false);
          searchInputRef.current?.focus();
        }}
      />

    </div>
  );
};
