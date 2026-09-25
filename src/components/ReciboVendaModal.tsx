import React from 'react';
import { Printer, X, CheckCircle, ArrowRight } from 'lucide-react';
import { Venda } from '../types';

interface ReciboVendaModalProps {
  venda: Venda | null;
  isOpen: boolean;
  onClose: () => void;
  onNovaVenda?: () => void;
}

export const ReciboVendaModal: React.FC<ReciboVendaModalProps> = ({
  venda,
  isOpen,
  onClose,
  onNovaVenda,
}) => {
  if (!isOpen || !venda) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formaPagamentoTexto: Record<string, string> = {
    dinheiro: 'Dinheiro',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    pix: 'PIX',
    vale_alimentacao: 'Vale Alimentação / Refeição',
    outro: 'Outro',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
        
        {/* Modal Top Bar */}
        <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">Venda Concluída com Sucesso!</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Content */}
        <div className="p-6 bg-slate-100 flex flex-col items-center overflow-y-auto max-h-[70vh]">
          <div 
            id="printable-receipt"
            className="w-full bg-white p-5 rounded-lg shadow-xs border border-slate-200 text-slate-800 font-mono text-xs leading-relaxed"
          >
            {/* Supermarket Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h3 className="font-bold text-base text-slate-900">SUPERMERCADO</h3>
              <p className="text-[10px] text-slate-500">CUPOM NÃO FISCAL DE VENDA</p>
              <p className="text-[11px] mt-1">Data: {new Date(venda.data_hora).toLocaleString('pt-BR')}</p>
              <p className="text-[11px] font-bold">Venda Nº: {String(venda.numero_venda).padStart(6, '0')}</p>
              {venda.cliente_nome && (
                <p className="text-[11px]">Cliente: {venda.cliente_nome}</p>
              )}
            </div>

            {/* Table of items */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 text-[10px] font-bold text-slate-500 uppercase pb-1 mb-1 border-b border-slate-200">
                <span className="col-span-6">Item / Descrição</span>
                <span className="col-span-3 text-right">Qtd x Unit</span>
                <span className="col-span-3 text-right">Total</span>
              </div>
              <div className="space-y-1.5">
                {venda.itens.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 text-[11px]">
                    <div className="col-span-6 truncate pr-1">
                      <span className="text-slate-500 text-[10px] mr-1">#{idx + 1}</span>
                      <span className="font-medium text-slate-800">{item.produto_nome}</span>
                      <div className="text-[9px] text-slate-400 font-mono">{item.produto_codigo}</div>
                    </div>
                    <div className="col-span-3 text-right text-slate-600">
                      {item.quantidade} {item.unidade} x {formatCurrency(item.preco_unitario)}
                    </div>
                    <div className="col-span-3 text-right font-semibold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Section */}
            <div className="py-3 space-y-1 border-b border-dashed border-slate-300">
              <div className="flex justify-between text-xs">
                <span>Subtotal:</span>
                <span>{formatCurrency(venda.subtotal)}</span>
              </div>
              {venda.desconto > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-medium">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(venda.desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL A PAGAR:</span>
                <span>{formatCurrency(venda.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 text-[11px] space-y-1 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="font-bold">{formaPagamentoTexto[venda.forma_pagamento] || venda.forma_pagamento}</span>
              </div>
              {venda.valor_recebido !== undefined && venda.valor_recebido > 0 && (
                <div className="flex justify-between">
                  <span>Valor Recebido:</span>
                  <span>{formatCurrency(venda.valor_recebido)}</span>
                </div>
              )}
              {venda.troco !== undefined && venda.troco > 0 && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Troco:</span>
                  <span>{formatCurrency(venda.troco)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500">
              <p>Obrigado pela preferência!</p>
              <p className="mt-1 font-mono tracking-widest text-[9px] text-slate-400">
                *{venda.id.slice(0, 18)}*
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-300"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cupom
          </button>
          
          {onNovaVenda ? (
            <button
              onClick={() => {
                onClose();
                onNovaVenda();
              }}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span>Nova Venda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Fechar
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
