import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Sliders, 
  AlertTriangle, 
  CheckCircle, 
  Barcode, 
  History, 
  X, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useSupermercado } from '../context/SupermercadoContext';
import { Produto, CategoriaProduto, UnidadeMedida, TipoMovimentacao } from '../types';

const CATEGORIAS: CategoriaProduto[] = [
  'Mercearia',
  'Hortifrúti',
  'Açougue & Carnes',
  'Bebidas',
  'Laticínios & Frios',
  'Padaria & Confeitaria',
  'Limpeza',
  'Higiene & Perfumaria',
  'Congelados',
  'Doces & Biscoitos',
  'Pet Shop',
  'Outros',
];

const UNIDADES: UnidadeMedida[] = ['UN', 'KG', 'G', 'L', 'ML', 'PCT', 'CX'];

interface EstoqueViewProps {
  isNovoProdutoOpen?: boolean;
  setIsNovoProdutoOpen?: (open: boolean) => void;
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  isNovoProdutoOpen: externalNovoOpen,
  setIsNovoProdutoOpen: setExternalNovoOpen,
}) => {
  const { 
    produtos, 
    movimentacoes, 
    adicionarProduto, 
    atualizarProduto, 
    excluirProduto, 
    ajustarEstoque 
  } = useSupermercado();

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'normal' | 'baixo' | 'zerado'>('todos');

  // Modals state
  const [internalNovoOpen, setInternalNovoOpen] = useState(false);
  const isNovoModalOpen = externalNovoOpen !== undefined ? externalNovoOpen : internalNovoOpen;
  const setNovoModalOpen = (open: boolean) => {
    if (setExternalNovoOpen) setExternalNovoOpen(open);
    setInternalNovoOpen(open);
  };

  const [editandoProduto, setEditandoProduto] = useState<Produto | null>(null);
  const [ajustandoProduto, setAjustandoProduto] = useState<Produto | null>(null);
  const [isHistoricoOpen, setIsHistoricoOpen] = useState(false);
  const [produtoExcluir, setProdutoExcluir] = useState<Produto | null>(null);

  // Form State for New/Edit Product
  const [formData, setFormData] = useState({
    codigo_barras: '',
    nome: '',
    categoria: 'Mercearia' as CategoriaProduto,
    preco_custo: 0,
    preco_venda: 0,
    estoque_atual: 0,
    estoque_minimo: 5,
    unidade: 'UN' as UnidadeMedida,
    data_validade: '',
    fornecedor: '',
    observacoes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Form State for Stock Adjustment
  const [ajusteData, setAjusteData] = useState({
    tipo: 'entrada' as TipoMovimentacao,
    quantidade: 1,
    motivo: '',
  });
  const [ajusteError, setAjusteError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Filter products based on search, category and status
  const produtosFiltrados = useMemo(() => {
    return produtos.filter(p => {
      const matchBusca = 
        p.nome.toLowerCase().includes(busca.toLowerCase()) || 
        p.codigo_barras.toLowerCase().includes(busca.toLowerCase()) ||
        (p.fornecedor && p.fornecedor.toLowerCase().includes(busca.toLowerCase()));

      const matchCategoria = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;

      let matchStatus = true;
      if (statusFiltro === 'zerado') {
        matchStatus = p.estoque_atual <= 0;
      } else if (statusFiltro === 'baixo') {
        matchStatus = p.estoque_atual > 0 && p.estoque_atual <= p.estoque_minimo;
      } else if (statusFiltro === 'normal') {
        matchStatus = p.estoque_atual > p.estoque_minimo;
      }

      return matchBusca && matchCategoria && matchStatus;
    });
  }, [produtos, busca, categoriaFiltro, statusFiltro]);

  // Open Add Product Modal
  const handleOpenNovo = () => {
    // Generate an automatic EAN barcode
    const randomBarcode = `789${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    setFormData({
      codigo_barras: randomBarcode,
      nome: '',
      categoria: 'Mercearia',
      preco_custo: 0,
      preco_venda: 0,
      estoque_atual: 0,
      estoque_minimo: 5,
      unidade: 'UN',
      data_validade: '',
      fornecedor: '',
      observacoes: '',
    });
    setFormError(null);
    setEditandoProduto(null);
    setNovoModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEdit = (produto: Produto) => {
    setEditandoProduto(produto);
    setFormData({
      codigo_barras: produto.codigo_barras,
      nome: produto.nome,
      categoria: produto.categoria,
      preco_custo: produto.preco_custo,
      preco_venda: produto.preco_venda,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo,
      unidade: produto.unidade,
      data_validade: produto.data_validade || '',
      fornecedor: produto.fornecedor || '',
      observacoes: produto.observacoes || '',
    });
    setFormError(null);
    setNovoModalOpen(true);
  };

  // Save product (New or Edit)
  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.codigo_barras.trim()) {
      setFormError('O código de barras é obrigatório.');
      return;
    }
    if (!formData.nome.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }
    if (formData.preco_venda <= 0) {
      setFormError('O preço de venda deve ser maior que zero.');
      return;
    }

    if (editandoProduto) {
      const res = await atualizarProduto(editandoProduto.id, {
        codigo_barras: formData.codigo_barras.trim(),
        nome: formData.nome.trim(),
        categoria: formData.categoria,
        preco_custo: Number(formData.preco_custo) || 0,
        preco_venda: Number(formData.preco_venda) || 0,
        estoque_minimo: Number(formData.estoque_minimo) || 0,
        unidade: formData.unidade,
        data_validade: formData.data_validade || undefined,
        fornecedor: formData.fornecedor?.trim() || undefined,
        observacoes: formData.observacoes?.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao atualizar produto.');
        return;
      }
    } else {
      const res = await adicionarProduto({
        codigo_barras: formData.codigo_barras.trim(),
        nome: formData.nome.trim(),
        categoria: formData.categoria,
        preco_custo: Number(formData.preco_custo) || 0,
        preco_venda: Number(formData.preco_venda) || 0,
        estoque_atual: Number(formData.estoque_atual) || 0,
        estoque_minimo: Number(formData.estoque_minimo) || 0,
        unidade: formData.unidade,
        data_validade: formData.data_validade || undefined,
        fornecedor: formData.fornecedor?.trim() || undefined,
        observacoes: formData.observacoes?.trim() || undefined,
      });

      if (!res.success) {
        setFormError(res.error || 'Erro ao adicionar produto.');
        return;
      }
    }

    setNovoModalOpen(false);
  };

  // Open Quick Stock Adjustment
  const handleOpenAjuste = (produto: Produto) => {
    setAjustandoProduto(produto);
    setAjusteData({
      tipo: 'entrada',
      quantidade: 1,
      motivo: 'Entrada de mercadoria com nota',
    });
    setAjusteError(null);
  };

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajustandoProduto) return;
    setAjusteError(null);

    const qtd = Number(ajusteData.quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      setAjusteError('Informe uma quantidade válida maior que zero.');
      return;
    }

    const res = await ajustarEstoque(
      ajustandoProduto.id,
      qtd,
      ajusteData.tipo,
      ajusteData.motivo.trim() || undefined
    );

    if (!res.success) {
      setAjusteError(res.error || 'Erro ao ajustar estoque.');
      return;
    }

    setAjustandoProduto(null);
  };

  const handleConfirmarExclusao = async () => {
    if (!produtoExcluir) return;
    await excluirProduto(produtoExcluir.id);
    setProdutoExcluir(null);
  };

  // Calculated margin for form preview
  const margemForm = useMemo(() => {
    const custo = Number(formData.preco_custo) || 0;
    const venda = Number(formData.preco_venda) || 0;
    if (venda <= 0) return { valor: 0, percentual: 0 };
    const valor = venda - custo;
    const percentual = (valor / venda) * 100;
    return { valor, percentual };
  }, [formData.preco_custo, formData.preco_venda]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Controle de Estoque & Produtos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre, edite e acompanhe os níveis de estoque dos seus produtos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHistoricoOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Histórico de Movimentações</span>
          </button>

          <button
            onClick={handleOpenNovo}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, código de barras / EAN ou fornecedor..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
            />
            {busca && (
              <button 
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs shrink-0 overflow-x-auto">
            <button
              onClick={() => setStatusFiltro('todos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFiltro === 'todos' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Todos ({produtos.length})
            </button>
            <button
              onClick={() => setStatusFiltro('normal')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFiltro === 'normal' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setStatusFiltro('baixo')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFiltro === 'baixo' ? 'bg-amber-50 text-amber-900 border border-amber-200 font-bold' : 'text-slate-600'
              }`}
            >
              Estoque Baixo
            </button>
            <button
              onClick={() => setStatusFiltro('zerado')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFiltro === 'zerado' ? 'bg-rose-50 text-rose-900 border border-rose-200 font-bold' : 'text-slate-600'
              }`}
            >
              Esgotado
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setCategoriaFiltro('todas')}
            className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors ${
              categoriaFiltro === 'todas'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas Categorias
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              className={`px-3 py-1 rounded-full shrink-0 font-medium transition-colors ${
                categoriaFiltro === cat
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {produtos.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">Nenhum produto cadastrado no estoque</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Todas as informações serão criadas por você. Clique abaixo para cadastrar o primeiro produto do seu supermercado.
            </p>
            <button
              onClick={handleOpenNovo}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto Agora
            </button>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum produto corresponde aos filtros de busca aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Código / EAN</th>
                  <th className="py-3 px-4">Produto & Categoria</th>
                  <th className="py-3 px-4 text-right">Preço de Custo</th>
                  <th className="py-3 px-4 text-right">Preço de Venda</th>
                  <th className="py-3 px-4 text-center">Margem</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-center">Est. Mínimo</th>
                  <th className="py-3 px-4 text-right">Total Estocado</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtosFiltrados.map((p) => {
                  const isEsgotado = p.estoque_atual <= 0;
                  const isBaixo = !isEsgotado && p.estoque_atual <= p.estoque_minimo;
                  const margemPercentual = p.preco_venda > 0 
                    ? (((p.preco_venda - p.preco_custo) / p.preco_venda) * 100).toFixed(1) 
                    : '0';

                  const valorEstoque = p.preco_custo * p.estoque_atual;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Barcode */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.codigo_barras}
                        </span>
                      </td>

                      {/* Product Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{p.nome}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {p.categoria}
                          </span>
                          {p.fornecedor && (
                            <span className="text-[10px] text-slate-400">
                              • {p.fornecedor}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        {formatCurrency(p.preco_custo)}
                      </td>

                      {/* Sale Price */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(p.preco_venda)}
                      </td>

                      {/* Profit Margin */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700">
                          {margemPercentual}%
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs ${
                          isEsgotado
                            ? 'bg-rose-100 text-rose-800'
                            : isBaixo
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isEsgotado ? (
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                          ) : isBaixo ? (
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          )}
                          {p.estoque_atual} {p.unidade}
                        </span>
                      </td>

                      {/* Min Stock */}
                      <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                        {p.estoque_minimo} {p.unidade}
                      </td>

                      {/* Total Stock Cost Value */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                        {formatCurrency(valorEstoque)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenAjuste(p)}
                            title="Ajustar estoque (+/-)"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Editar produto"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setProdutoExcluir(p)}
                            title="Excluir produto"
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Adicionar / Editar Produto */}
      {isNovoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide">
                  {editandoProduto ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h3>
              </div>
              <button 
                onClick={() => setNovoModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarProduto} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Barcode & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Código de Barras / SKU *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.codigo_barras}
                      onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                      placeholder="Ex: 7891000100103"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, codigo_barras: `789${Math.floor(1000000000 + Math.random() * 9000000000)}` })}
                      title="Gerar código aleatório"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 hover:underline font-semibold"
                    >
                      Gerar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as CategoriaProduto })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Arroz Tipo 1 Branco 5kg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  required
                />
              </div>

              {/* Prices & Profit Preview */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Preço de Custo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.preco_custo || ''}
                      onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Preço de Venda (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.preco_venda || ''}
                      onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) || 0 })}
                      placeholder="0,00"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-emerald-900 pt-1 border-t border-emerald-200/60">
                  <span>Lucro Bruto por unidade: <b>{formatCurrency(margemForm.valor)}</b></span>
                  <span>Margem: <b>{margemForm.percentual.toFixed(1)}%</b></span>
                </div>
              </div>

              {/* Stock and Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Unidade
                  </label>
                  <select
                    value={formData.unidade}
                    onChange={(e) => setFormData({ ...formData, unidade: e.target.value as UnidadeMedida })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    {UNIDADES.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {!editandoProduto && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Estoque Inicial
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.estoque_atual}
                      onChange={(e) => setFormData({ ...formData, estoque_atual: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                  </div>
                )}

                <div className={editandoProduto ? 'col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.estoque_minimo}
                    onChange={(e) => setFormData({ ...formData, estoque_minimo: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Fornecedor and Validade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    placeholder="Ex: Distribuidora Silva"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.data_validade}
                    onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNovoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                >
                  {editandoProduto ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ajuste Rápido de Estoque */}
      {ajustandoProduto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Ajustar Estoque</h3>
              </div>
              <button onClick={() => setAjustandoProduto(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarAjuste} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-900">{ajustandoProduto.nome}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Código: {ajustandoProduto.codigo_barras}</p>
                <div className="mt-2 text-xs flex justify-between">
                  <span>Estoque Atual:</span>
                  <span className="font-bold text-slate-900">{ajustandoProduto.estoque_atual} {ajustandoProduto.unidade}</span>
                </div>
              </div>

              {ajusteError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                  {ajusteError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tipo de Movimentação
                </label>
                <select
                  value={ajusteData.tipo}
                  onChange={(e) => setAjusteData({ ...ajusteData, tipo: e.target.value as TipoMovimentacao })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
                >
                  <option value="entrada">➕ Entrada / Compra de Mercadoria</option>
                  <option value="perda_avaria">➖ Saída por Perda / Quebra / Validade</option>
                  <option value="ajuste_manual">🔄 Ajuste Manual (Definir nova contagem real)</option>
                  <option value="devolucao">↩️ Devolução de Cliente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {ajusteData.tipo === 'ajuste_manual' ? 'Novo Estoque Total' : 'Quantidade a Movimentar'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={ajusteData.quantidade}
                  onChange={(e) => setAjusteData({ ...ajusteData, quantidade: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Motivo / Observação
                </label>
                <input
                  type="text"
                  value={ajusteData.motivo}
                  onChange={(e) => setAjusteData({ ...ajusteData, motivo: e.target.value })}
                  placeholder="Ex: Entrada NF 1024, ou Quebra na gôndola"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAjustandoProduto(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Histórico de Movimentações */}
      {isHistoricoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Histórico de Movimentações de Estoque</h3>
              </div>
              <button onClick={() => setIsHistoricoOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {movimentacoes.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Nenhuma movimentação de estoque registrada até o momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {movimentacoes.map((mov) => {
                    const isPositive = mov.tipo === 'entrada' || mov.tipo === 'devolucao';
                    return (
                      <div key={mov.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {isPositive ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{mov.produto_nome}</p>
                            <p className="text-[11px] text-slate-500">
                              {mov.motivo || mov.tipo} • {new Date(mov.data_hora).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-black ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isPositive ? '+' : '-'}{mov.quantidade}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {mov.estoque_anterior} ➔ {mov.estoque_posterior}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsHistoricoOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Exclusão de Produto */}
      {produtoExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Excluir Produto</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja remover <b>"{produtoExcluir.nome}"</b> do seu catálogo de produtos? Essa ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setProdutoExcluir(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
