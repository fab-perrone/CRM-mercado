import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Produto, Venda, MovimentacaoEstoque, SupabaseConfig } from '../types';

const STORAGE_KEY_CONFIG = 'supermercado_supabase_credentials';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        isConnected: Boolean(parsed.isConnected),
        lastChecked: parsed.lastChecked,
      };
    }
  } catch (e) {
    console.error('Erro ao ler config do Supabase do localStorage', e);
  }

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: false,
  };
}

export function saveStoredSupabaseConfig(config: Partial<SupabaseConfig>) {
  const current = getStoredSupabaseConfig();
  const updated: SupabaseConfig = {
    ...current,
    ...config,
  };
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
  return updated;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  // Create or return existing client
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(config.url.trim(), config.anonKey.trim(), {
        auth: {
          persistSession: true,
        },
      });
    } catch (err) {
      console.error('Falha ao inicializar cliente Supabase:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function resetSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  saveStoredSupabaseConfig({ url: url.trim(), anonKey: anonKey.trim(), isConnected: false });
  try {
    supabaseInstance = createClient(url.trim(), anonKey.trim());
    return supabaseInstance;
  } catch (err) {
    console.error('Falha ao redefinir cliente Supabase:', err);
    supabaseInstance = null;
    return null;
  }
}

// Test connection and verify if the tables exist
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string; tablesCreated?: boolean }> {
  try {
    const targetUrl = url || getStoredSupabaseConfig().url;
    const targetKey = anonKey || getStoredSupabaseConfig().anonKey;

    if (!targetUrl || !targetKey) {
      return {
        success: false,
        message: 'URL e Anon Key do Supabase são obrigatórios.',
      };
    }

    const testClient = createClient(targetUrl.trim(), targetKey.trim());
    
    // Probe "produtos" table
    const { error } = await testClient
      .from('produtos')
      .select('id')
      .limit(1);

    if (error) {
      // Check if it's a 404 / relation does not exist error
      if (error.code === '42P01' || error.message.includes('relation "public.produtos" does not exist') || error.message.includes('not found')) {
        saveStoredSupabaseConfig({ isConnected: true, errorMessage: undefined, lastChecked: new Date().toISOString() });
        return {
          success: true,
          tablesCreated: false,
          message: 'Conectado ao Supabase! Porém as tabelas ainda não foram criadas. Copie e execute o script SQL fornecido no SQL Editor do seu projeto Supabase.',
        };
      }

      return {
        success: false,
        message: `Falha na conexão: ${error.message} (Código: ${error.code || 'sem código'})`,
      };
    }

    saveStoredSupabaseConfig({ isConnected: true, errorMessage: undefined, lastChecked: new Date().toISOString() });
    return {
      success: true,
      tablesCreated: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Todas as tabelas prontas.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao conectar com Supabase: ${err?.message || 'Verifique as credenciais e tente novamente.'}`,
    };
  }
}

// SQL Script ready to run in Supabase SQL Editor
export const SUPABASE_SETUP_SQL = `-- SCRIPT DE CRIAÇÃO DAS TABELAS DO SUPERMERCADO NO SUPABASE
-- Execute este script no SQL Editor do seu painel Supabase (supabase.com)

-- 1. Tabela de Produtos (Estoque)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    unidade TEXT NOT NULL DEFAULT 'UN',
    data_validade DATE,
    fornecedor TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Vendas
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_venda BIGSERIAL UNIQUE,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    custo_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    lucro_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL,
    valor_recebido NUMERIC(12,2),
    troco NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'concluida',
    cliente_nome TEXT,
    observacoes TEXT
);

-- 3. Tabela de Itens da Venda
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    produto_nome TEXT NOT NULL,
    produto_codigo TEXT NOT NULL,
    unidade TEXT NOT NULL DEFAULT 'UN',
    quantidade NUMERIC(12,3) NOT NULL DEFAULT 1.000,
    preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    preco_custo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    lucro_item NUMERIC(12,2) NOT NULL DEFAULT 0.00
);

-- 4. Tabela de Movimentações de Estoque (Histórico de entradas e saídas)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    produto_nome TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'entrada', 'saida_venda', 'ajuste_manual', 'perda_avaria', 'devolucao'
    quantidade NUMERIC(12,3) NOT NULL,
    estoque_anterior NUMERIC(12,3) NOT NULL,
    estoque_posterior NUMERIC(12,3) NOT NULL,
    motivo TEXT,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para buscas rápidas no PDV e Relatórios
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);
CREATE INDEX IF NOT EXISTS idx_vendas_data_hora ON public.vendas(data_hora);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);

-- 5. Habilitar RLS nas Tabelas do Banco de Dados
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas granulares de acesso (anon e autenticado) nas tabelas
DROP POLICY IF EXISTS "Permitir select em produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir insert em produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir update em produtos" ON public.produtos;
DROP POLICY IF EXISTS "Permitir delete em produtos" ON public.produtos;
CREATE POLICY "Permitir select em produtos" ON public.produtos FOR SELECT TO public USING (true);
CREATE POLICY "Permitir insert em produtos" ON public.produtos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Permitir update em produtos" ON public.produtos FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete em produtos" ON public.produtos FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Permitir select em vendas" ON public.vendas;
DROP POLICY IF EXISTS "Permitir insert em vendas" ON public.vendas;
DROP POLICY IF EXISTS "Permitir update em vendas" ON public.vendas;
DROP POLICY IF EXISTS "Permitir delete em vendas" ON public.vendas;
CREATE POLICY "Permitir select em vendas" ON public.vendas FOR SELECT TO public USING (true);
CREATE POLICY "Permitir insert em vendas" ON public.vendas FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Permitir update em vendas" ON public.vendas FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete em vendas" ON public.vendas FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Permitir select em itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Permitir insert em itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Permitir update em itens_venda" ON public.itens_venda;
DROP POLICY IF EXISTS "Permitir delete em itens_venda" ON public.itens_venda;
CREATE POLICY "Permitir select em itens_venda" ON public.itens_venda FOR SELECT TO public USING (true);
CREATE POLICY "Permitir insert em itens_venda" ON public.itens_venda FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Permitir update em itens_venda" ON public.itens_venda FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete em itens_venda" ON public.itens_venda FOR DELETE TO public USING (true);

DROP POLICY IF EXISTS "Permitir select em movimentacoes_estoque" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Permitir insert em movimentacoes_estoque" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Permitir update em movimentacoes_estoque" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Permitir delete em movimentacoes_estoque" ON public.movimentacoes_estoque;
CREATE POLICY "Permitir select em movimentacoes_estoque" ON public.movimentacoes_estoque FOR SELECT TO public USING (true);
CREATE POLICY "Permitir insert em movimentacoes_estoque" ON public.movimentacoes_estoque FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Permitir update em movimentacoes_estoque" ON public.movimentacoes_estoque FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete em movimentacoes_estoque" ON public.movimentacoes_estoque FOR DELETE TO public USING (true);

-- 6. CRIAÇÃO DO BUCKET E POLÍTICAS DE ARMAZENAMENTO (SUPABASE STORAGE)
-- O Supabase já possui o RLS de storage ativado por padrão sob a role supabase_storage_admin.
-- Nunca execute 'ALTER TABLE storage.objects' pois gera o erro 42501.

-- Cria o bucket público 'supermercado-arquivos' para fotos de produtos, comprovantes e backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'supermercado-arquivos', 
    'supermercado-arquivos', 
    true, 
    52428800, -- Limite de 50MB por arquivo
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/json', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Armazenamento para o bucket 'supermercado-arquivos'
DROP POLICY IF EXISTS "Permitir visualizacao publica de arquivos do supermercado" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de arquivos no bucket do supermercado" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualizacao de arquivos no bucket do supermercado" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusao de arquivos no bucket do supermercado" ON storage.objects;

-- Política 1: Leitura pública de objetos (SELECT)
CREATE POLICY "Permitir visualizacao publica de arquivos do supermercado"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'supermercado-arquivos');

-- Política 2: Upload de arquivos (INSERT)
CREATE POLICY "Permitir upload de arquivos no bucket do supermercado"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'supermercado-arquivos');

-- Política 3: Atualização de arquivos (UPDATE)
CREATE POLICY "Permitir atualizacao de arquivos no bucket do supermercado"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'supermercado-arquivos')
WITH CHECK (bucket_id = 'supermercado-arquivos');

-- Política 4: Exclusão de arquivos (DELETE)
CREATE POLICY "Permitir exclusao de arquivos no bucket do supermercado"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'supermercado-arquivos');
`;
