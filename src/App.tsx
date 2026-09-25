import React, { useState } from 'react';
import { SupermercadoProvider, useSupermercado } from './context/SupermercadoContext';
import { Header, TabActive } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { VendasPDVView } from './components/VendasPDVView';
import { HistoricoVendasView } from './components/HistoricoVendasView';
import { SupabaseModal } from './components/SupabaseModal';
import { Loader2 } from 'lucide-react';

function SupermercadoApp() {
  const { loading } = useSupermercado();
  const [activeTab, setActiveTab] = useState<TabActive>('dashboard');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isNovoProdutoOpen, setIsNovoProdutoOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">Carregando Sistema do Supermercado...</p>
        <p className="text-xs text-slate-500 mt-1">Conectando ao banco de dados e preparando estoque</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateToEstoque={() => setActiveTab('estoque')}
            onNavigateToPDV={() => setActiveTab('pdv')}
            onNovoProduto={() => {
              setActiveTab('estoque');
              setIsNovoProdutoOpen(true);
            }}
          />
        )}

        {activeTab === 'estoque' && (
          <EstoqueView
            isNovoProdutoOpen={isNovoProdutoOpen}
            setIsNovoProdutoOpen={setIsNovoProdutoOpen}
          />
        )}

        {activeTab === 'pdv' && (
          <VendasPDVView
            onNavigateToEstoque={() => setActiveTab('estoque')}
          />
        )}

        {activeTab === 'vendas' && (
          <HistoricoVendasView />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Supermercado Gestão</span>
            <span>•</span>
            <span>Estoque, Vendas & Dashboard</span>
          </div>
          <span className="text-slate-400">Sistema Conectado & Operacional</span>
        </div>
      </footer>

      {/* Supabase Connection & SQL Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <SupermercadoProvider>
      <SupermercadoApp />
    </SupermercadoProvider>
  );
}
