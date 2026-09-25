import React from 'react';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  History, 
  PlusCircle, 
  Store 
} from 'lucide-react';
import { useSupermercado } from '../context/SupermercadoContext';

export type TabActive = 'dashboard' | 'estoque' | 'pdv' | 'vendas';

interface HeaderProps {
  activeTab: TabActive;
  onTabChange: (tab: TabActive) => void;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { produtos } = useSupermercado();

  const produtosBaixoEstoque = produtos.filter(p => p.estoque_atual <= p.estoque_minimo).length;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">SUPERMERCADO</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                  Gestão
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Estoque, PDV & Vendas</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('estoque')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === 'estoque'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque</span>
              {produtosBaixoEstoque > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title={`${produtosBaixoEstoque} produtos com estoque baixo`} />
              )}
            </button>

            <button
              onClick={() => onTabChange('pdv')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pdv'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Vendas (PDV)</span>
            </button>

            <button
              onClick={() => onTabChange('vendas')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'vendas'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico de Vendas</span>
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick PDV Button */}
            {activeTab !== 'pdv' && (
              <button
                onClick={() => onTabChange('pdv')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Nova Venda</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center py-1 px-2 font-medium ${
              activeTab === 'dashboard' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4 mb-0.5" />
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('estoque')}
            className={`flex flex-col items-center py-1 px-2 font-medium relative ${
              activeTab === 'estoque' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Package className="w-4 h-4 mb-0.5" />
            Estoque
            {produtosBaixoEstoque > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => onTabChange('pdv')}
            className={`flex flex-col items-center py-1 px-2 font-medium ${
              activeTab === 'pdv' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mb-0.5" />
            PDV
          </button>
          <button
            onClick={() => onTabChange('vendas')}
            className={`flex flex-col items-center py-1 px-2 font-medium ${
              activeTab === 'vendas' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            Vendas
          </button>
        </div>

      </div>
    </header>
  );
};
