import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Printer, 
  XCircle, 
  Eye, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Layers, 
  Calendar,
  AlertCircle,
  X,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { useSupermercado } from '../context/SupermercadoContext';
import { Venda } from '../types';
import { ReciboVendaModal } from './ReciboVendaModal';

export const HistoricoVendasView: React.FC = () => {
  const { vendas, cancelarVenda } = useSupermercado();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'concluida' | 'cancelada'>('todas');
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos');

  // Modals
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [vendaParaRecibo, setVendaParaRecibo] = useState<Venda | null>(null);
  const [vendaCancelar, setVendaCancelar] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formaPagamentoLabels: Record<string, { label: string; icon: any }> = {
    dinheiro: { label: 'Dinheiro', icon: DollarSign },
    pix: { label: 'PIX', icon: QrCode },
    cartao_debito: { label: 'Cartão Débito', icon: CreditCard },
    cartao_credito: { label: 'Cartão Crédito', icon: CreditCard },
    vale_alimentacao: { label: 'Vale Alim./Ref.', icon: Layers },
    outro: { label: 'Outro', icon: CreditCard },
  };

  // Filter sales
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const matchStatus = filtroStatus === 'todas' || v.status === filtroStatus;
      const matchPagamento = filtroPagamento === 'todos' || v.forma_pagamento === filtroPagamento;
      
      const matchBusca = 
        String(v.numero_venda).includes(busca) ||
        (v.cliente_nome && v.cliente_nome.toLowerCase().includes(busca.toLowerCase())) ||
        v.itens.some(item => item.produto_nome.toLowerCase().includes(busca.toLowerCase()));

      return matchStatus && matchPagamento && matchBusca;
    });
  }, [vendas, filtroStatus, filtroPagamento, busca]);

  const totais = useMemo(() => {
    const concluidas = vendasFiltradas.filter(v => v.status === 'concluida');
    const faturamento = concluidas.reduce((acc, v) => acc + v.total, 0);
    const lucro = concluidas.reduce((acc, v) => acc + v.lucro_total, 0);
    return {
      quantidade: concluidas.length,
      faturamento,
      lucro,
    };
  }, [vendasFiltradas]);

  const handleConfirmarCancelamento = async () => {
    if (!vendaCancelar) return;
    setCancelando(true);
    setCancelError(null);

    const res = await cancelarVenda(vendaCancelar.id, motivoCancelamento.trim() || undefined);
    setCancelando(false);

    if (res.success) {
      setVendaCancelar(null);
      setMotivoCancelamento('');
      if (vendaSelecionada?.id === vendaCancelar.id) {
        setVendaSelecionada(null);
      }
    } else {
      setCancelError(res.error || 'Erro ao cancelar venda.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Histórico de Vendas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte todas as operações realizadas, reimprima comprovantes e efetue estornos
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
            Total Faturado: {formatCurrency(totais.faturamento)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por Nº do cupom, nome do cliente ou produto vendido..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden transition-all"
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

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="todas">Todos Status</option>
              <option value="concluida">Concluídas</option>
              <option value="cancelada">Canceladas</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={filtroPagamento}
              onChange={(e) => setFiltroPagamento(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-hidden"
            >
              <option value="todos">Todas Formas</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_debito">Débito</option>
              <option value="cartao_credito">Crédito</option>
              <option value="vale_alimentacao">Vale Alimentação</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {vendas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">Nenhuma venda registrada ainda</h3>
            <p className="mt-1">Quando você concluir sua primeira venda no PDV, o histórico será exibido aqui.</p>
          </div>
        ) : vendasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma venda encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Nº Venda</th>
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Forma Pagto</th>
                  <th className="py-3 px-4 text-center">Itens</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Desconto</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendasFiltradas.map((v) => {
                  const isCancelada = v.status === 'cancelada';
                  const pagtoInfo = formaPagamentoLabels[v.forma_pagamento] || { label: v.forma_pagamento, icon: CreditCard };
                  const PagtoIcon = pagtoInfo.icon;

                  return (
                    <tr 
                      key={v.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${isCancelada ? 'opacity-50 bg-slate-50/40' : ''}`}
                    >
                      {/* Sale # */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        #{String(v.numero_venda).padStart(6, '0')}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                        {new Date(v.data_hora).toLocaleString('pt-BR')}
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {v.cliente_nome || <span className="text-slate-400 italic">Consumidor Final</span>}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <PagtoIcon className="w-3.5 h-3.5 text-emerald-600" />
                          {pagtoInfo.label}
                        </span>
                      </td>

                      {/* Items count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {v.itens.length} {v.itens.length === 1 ? 'item' : 'itens'}
                        </span>
                      </td>

                      {/* Subtotal */}
                      <td className="py-3.5 px-4 text-right text-slate-600 font-medium">
                        {formatCurrency(v.subtotal)}
                      </td>

                      {/* Discount */}
                      <td className="py-3.5 px-4 text-right text-rose-600 font-medium">
                        {v.desconto > 0 ? `- ${formatCurrency(v.desconto)}` : '-'}
                      </td>

                      {/* Final Total */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(v.total)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isCancelada 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isCancelada ? 'Cancelada' : 'Concluída'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setVendaSelecionada(v)}
                            title="Ver detalhes dos itens"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setVendaParaRecibo(v)}
                            title="Imprimir cupom"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!isCancelada && (
                            <button
                              onClick={() => {
                                setVendaCancelar(v);
                                setMotivoCancelamento('');
                                setCancelError(null);
                              }}
                              title="Cancelar venda (estornar estoque)"
                              className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
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

      {/* MODAL: Detalhes da Venda */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  Detalhes da Venda #{String(vendaSelecionada.numero_venda).padStart(6, '0')}
                </h3>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Data / Hora</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(vendaSelecionada.data_hora).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Forma de Pagamento</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {vendaSelecionada.forma_pagamento.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Cliente</span>
                  <span className="font-semibold text-slate-800">
                    {vendaSelecionada.cliente_nome || 'Consumidor Final'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Status</span>
                  <span className={`font-bold ${vendaSelecionada.status === 'cancelada' ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {vendaSelecionada.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Itens da Venda ({vendaSelecionada.itens.length})
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {vendaSelecionada.itens.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">{item.produto_nome}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.quantidade} {item.unidade} x {formatCurrency(item.preco_unitario)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{formatCurrency(item.subtotal)}</p>
                        <p className="text-[10px] text-teal-700 font-semibold">
                          Lucro: {formatCurrency(item.lucro_item)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(vendaSelecionada.subtotal)}</span>
                </div>
                {vendaSelecionada.desconto > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(vendaSelecionada.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-emerald-200">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(vendaSelecionada.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-teal-800 font-semibold pt-1">
                  <span>Lucro Real desta Venda:</span>
                  <span>{formatCurrency(vendaSelecionada.lucro_total)}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between">
              <button
                onClick={() => {
                  setVendaParaRecibo(vendaSelecionada);
                  setVendaSelecionada(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Cupom
              </button>
              <button
                onClick={() => setVendaSelecionada(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancelar Venda */}
      {vendaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Cancelar Venda</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja cancelar a <b>Venda #{String(vendaCancelar.numero_venda).padStart(6, '0')}</b> no valor de <b>{formatCurrency(vendaCancelar.total)}</b>?
              <br /><br />
              <span className="text-emerald-700 font-semibold">
                ✓ Todos os {vendaCancelar.itens.length} itens serão devolvidos automaticamente ao estoque.
              </span>
            </p>

            {cancelError && (
              <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                {cancelError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Motivo do cancelamento (opcional):
              </label>
              <input
                type="text"
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Cliente desistiu ou erro na digitação"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVendaCancelar(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelando}
                onClick={handleConfirmarCancelamento}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                {cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReciboVendaModal
        isOpen={Boolean(vendaParaRecibo)}
        venda={vendaParaRecibo}
        onClose={() => setVendaParaRecibo(null)}
      />

    </div>
  );
};
