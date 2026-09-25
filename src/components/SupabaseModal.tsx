import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  HelpCircle,
  UploadCloud
} from 'lucide-react';
import { useSupermercado } from '../context/SupermercadoContext';
import { SUPABASE_SETUP_SQL } from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { supabaseConfig, configurarSupabase, sincronizarComSupabase, produtos, vendas } = useSupermercado();
  
  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  if (!isOpen) return null;

  const handleSalvarEConectar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setFeedback({ type: 'error', message: 'Por favor preencha a URL do Projeto e a Chave Anon do Supabase.' });
      return;
    }

    setTesting(true);
    setFeedback(null);
    try {
      const result = await configurarSupabase(url, anonKey);
      if (result.success) {
        setFeedback({ 
          type: 'success', 
          message: result.message || 'Conexão com o Supabase efetuada com sucesso!' 
        });
      } else {
        setFeedback({ 
          type: 'error', 
          message: result.message || 'Não foi possível conectar ao Supabase. Verifique a URL e a chave.' 
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro inesperado ao testar conexão.' });
    } finally {
      setTesting(false);
    }
  };

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSincronizar = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await sincronizarComSupabase();
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro ao sincronizar.' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/50 rounded-xl">
              <Database className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Conexão com o Supabase</h2>
              <p className="text-xs text-emerald-100/90">Banco de dados em nuvem para guardar Estoque e Vendas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Connection Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            supabaseConfig.isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {supabaseConfig.isConnected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <p className="font-semibold">
                {supabaseConfig.isConnected 
                  ? 'Supabase Conectado e Ativo' 
                  : 'Modo de Armazenamento Local Ativo'}
              </p>
              <p className="text-xs mt-0.5 text-slate-600">
                {supabaseConfig.isConnected 
                  ? 'Os produtos e vendas que você cadastrar serão salvos diretamente nas suas tabelas do Supabase.' 
                  : 'Os produtos e vendas que você criar agora são guardados no seu navegador. Assim que você conectar o Supabase, poderá enviá-los com 1 clique!'}
              </p>
            </div>
          </div>

          {feedback && (
            <div className={`p-3 rounded-lg text-sm border flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : feedback.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Supabase Credentials Form */}
          <form onSubmit={handleSalvarEConectar} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Project URL do Supabase
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo-seu-projeto.supabase.co"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Encontrada em: <b>Project Settings → API → Project URL</b>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Project API Key (anon / public)
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden font-mono"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Encontrada em: <b>Project Settings → API → Project API Keys → `anon public`</b>
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-medium underline"
              >
                Abrir Painel do Supabase <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="submit"
                disabled={testing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-xs"
              >
                {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {testing ? 'Testando Conexão...' : 'Testar e Conectar'}
              </button>
            </div>
          </form>

          {/* Sync Existing Local Data */}
          {supabaseConfig.isConnected && (produtos.length > 0 || vendas.length > 0) && (
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-900">Sincronizar Itens Cadastrados</p>
                <p className="text-xs text-teal-700">
                  Você tem {produtos.length} produtos e {vendas.length} vendas registradas. Clique para enviar tudo ao Supabase.
                </p>
              </div>
              <button
                onClick={handleSincronizar}
                disabled={syncing}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
            </div>
          )}

          {/* Script SQL Instructions */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Script SQL para criar as tabelas no Supabase
                </span>
              </div>
              <button
                onClick={handleCopiarSql}
                className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-white text-xs text-slate-600 space-y-2">
              <p>
                <b>Como criar as tabelas no seu Supabase:</b>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>Acesse seu projeto em <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">supabase.com</a></li>
                <li>Clique no menu lateral <b>SQL Editor</b></li>
                <li>Clique no botão <b>Copiar SQL</b> acima, cole no editor e clique em <b>Run</b></li>
              </ol>

              <button
                type="button"
                onClick={() => setShowSqlDetails(!showSqlDetails)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline block pt-1"
              >
                {showSqlDetails ? 'Ocultar código SQL' : 'Visualizar código SQL completo'}
              </button>

              {showSqlDetails && (
                <div className="mt-2 max-h-52 overflow-y-auto p-3 bg-slate-900 text-slate-100 font-mono text-[11px] rounded-lg">
                  <pre>{SUPABASE_SETUP_SQL}</pre>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
