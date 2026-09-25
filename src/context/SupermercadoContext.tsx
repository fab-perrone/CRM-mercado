import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Produto, 
  Venda, 
  ItemVenda, 
  MovimentacaoEstoque, 
  SupabaseConfig, 
  TipoMovimentacao 
} from '../types';
import { 
  getStoredSupabaseConfig, 
  getSupabaseClient, 
  testSupabaseConnection, 
  resetSupabaseClient,
  saveStoredSupabaseConfig 
} from '../lib/supabase';

interface SupermercadoContextType {
  produtos: Produto[];
  vendas: Venda[];
  movimentacoes: MovimentacaoEstoque[];
  loading: boolean;
  supabaseConfig: SupabaseConfig;
  carregarDados: () => Promise<void>;
  adicionarProduto: (produto: Omit<Produto, 'id' | 'criado_em' | 'atualizado_em'>) => Promise<{ success: boolean; error?: string; produto?: Produto }>;
  atualizarProduto: (id: string, produto: Partial<Produto>) => Promise<{ success: boolean; error?: string }>;
  excluirProduto: (id: string) => Promise<{ success: boolean; error?: string }>;
  ajustarEstoque: (produtoId: string, quantidadeAjuste: number, tipo: TipoMovimentacao, motivo?: string) => Promise<{ success: boolean; error?: string }>;
  finalizarVenda: (vendaData: {
    itens: Array<{ produto: Produto; quantidade: number }>;
    desconto: number;
    forma_pagamento: Venda['forma_pagamento'];
    valor_recebido?: number;
    cliente_nome?: string;
    observacoes?: string;
  }) => Promise<{ success: boolean; venda?: Venda; error?: string }>;
  cancelarVenda: (vendaId: string, motivo?: string) => Promise<{ success: boolean; error?: string }>;
  configurarSupabase: (url: string, anonKey: string) => Promise<{ success: boolean; message: string }>;
  sincronizarComSupabase: () => Promise<{ success: boolean; message: string }>;
  limparBancoLocal: () => void;
}

const SupermercadoContext = createContext<SupermercadoContextType | undefined>(undefined);

const LOCAL_STORAGE_PRODUTOS = 'supermercado_produtos';
const LOCAL_STORAGE_VENDAS = 'supermercado_vendas';
const LOCAL_STORAGE_MOVIMENTACOES = 'supermercado_movimentacoes';

export const SupermercadoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // STRICTLY EMPTY INITIAL ARRAYS - User requested: "todas as informações eu que vou criar (não crie informações modelo)"
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());

  // Load data from local or Supabase
  const carregarDados = useCallback(async () => {
    setLoading(true);
    const client = getSupabaseClient();
    let loadedFromSupabase = false;

    if (client) {
      try {
        // Fetch products from Supabase
        const { data: remoteProdutos, error: pError } = await client
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true });

        // Fetch sales with items from Supabase
        const { data: remoteVendas, error: vError } = await client
          .from('vendas')
          .select('*, itens:itens_venda(*)')
          .order('data_hora', { ascending: false });

        // Fetch movements from Supabase
        const { data: remoteMovs, error: mError } = await client
          .from('movimentacoes_estoque')
          .select('*')
          .order('data_hora', { ascending: false });

        if (!pError && !vError && !mError && remoteProdutos && remoteVendas) {
          setProdutos(remoteProdutos);
          setVendas(remoteVendas.map((v: any) => ({
            ...v,
            itens: v.itens || [],
          })));
          setMovimentacoes(remoteMovs || []);
          loadedFromSupabase = true;
          setSupabaseConfig(prev => ({ ...prev, isConnected: true }));
        }
      } catch (err) {
        console.warn('Não foi possível carregar do Supabase. Carregando armazenamento local:', err);
      }
    }

    if (!loadedFromSupabase) {
      // Load from LocalStorage (starts as [] if nothing created yet)
      try {
        const storedProdutos = localStorage.getItem(LOCAL_STORAGE_PRODUTOS);
        const storedVendas = localStorage.getItem(LOCAL_STORAGE_VENDAS);
        const storedMovs = localStorage.getItem(LOCAL_STORAGE_MOVIMENTACOES);

        setProdutos(storedProdutos ? JSON.parse(storedProdutos) : []);
        setVendas(storedVendas ? JSON.parse(storedVendas) : []);
        setMovimentacoes(storedMovs ? JSON.parse(storedMovs) : []);
      } catch (e) {
        console.error('Erro ao ler do localStorage', e);
        setProdutos([]);
        setVendas([]);
        setMovimentacoes([]);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Keep localStorage updated as fallback
  const syncLocal = (newProdutos: Produto[], newVendas: Venda[], newMovs: MovimentacaoEstoque[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PRODUTOS, JSON.stringify(newProdutos));
      localStorage.setItem(LOCAL_STORAGE_VENDAS, JSON.stringify(newVendas));
      localStorage.setItem(LOCAL_STORAGE_MOVIMENTACOES, JSON.stringify(newMovs));
    } catch (e) {
      console.error('Falha ao gravar no localStorage', e);
    }
  };

  const adicionarProduto = async (dados: Omit<Produto, 'id' | 'criado_em' | 'atualizado_em'>) => {
    // Validate barcode uniqueness
    const exists = produtos.some(p => p.codigo_barras.trim().toLowerCase() === dados.codigo_barras.trim().toLowerCase());
    if (exists) {
      return { success: false, error: 'Já existe um produto cadastrado com este Código de Barras / SKU.' };
    }

    const agora = new Date().toISOString();
    const novoProduto: Produto = {
      ...dados,
      id: crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      criado_em: agora,
      atualizado_em: agora,
    };

    let novaMov: MovimentacaoEstoque | null = null;
    if (novoProduto.estoque_atual > 0) {
      novaMov = {
        id: crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}`,
        produto_id: novoProduto.id,
        produto_nome: novoProduto.nome,
        tipo: 'entrada',
        quantidade: novoProduto.estoque_atual,
        estoque_anterior: 0,
        estoque_posterior: novoProduto.estoque_atual,
        motivo: 'Estoque inicial de cadastro',
        data_hora: agora,
      };
    }

    // Try Supabase first
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error: insertError } = await client.from('produtos').insert([novoProduto]);
        if (insertError) {
          console.warn('Erro ao inserir no Supabase, salvando localmente:', insertError.message);
        } else if (novaMov) {
          await client.from('movimentacoes_estoque').insert([novaMov]);
        }
      } catch (err) {
        console.warn('Exceção Supabase ao adicionar produto:', err);
      }
    }

    const updatedProdutos = [...produtos, novoProduto];
    const updatedMovs = novaMov ? [novaMov, ...movimentacoes] : movimentacoes;

    setProdutos(updatedProdutos);
    if (novaMov) setMovimentacoes(updatedMovs);
    syncLocal(updatedProdutos, vendas, updatedMovs);

    return { success: true, produto: novoProduto };
  };

  const atualizarProduto = async (id: string, updates: Partial<Produto>) => {
    const produtoAtual = produtos.find(p => p.id === id);
    if (!produtoAtual) {
      return { success: false, error: 'Produto não encontrado.' };
    }

    // If changing barcode, check uniqueness
    if (updates.codigo_barras && updates.codigo_barras !== produtoAtual.codigo_barras) {
      const exists = produtos.some(p => p.id !== id && p.codigo_barras.trim().toLowerCase() === updates.codigo_barras!.trim().toLowerCase());
      if (exists) {
        return { success: false, error: 'Já existe outro produto cadastrado com este Código de Barras.' };
      }
    }

    const agora = new Date().toISOString();
    const produtoAtualizado: Produto = {
      ...produtoAtual,
      ...updates,
      atualizado_em: agora,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('produtos').update(produtoAtualizado).eq('id', id);
      } catch (err) {
        console.warn('Erro ao atualizar no Supabase:', err);
      }
    }

    const updated = produtos.map(p => p.id === id ? produtoAtualizado : p);
    setProdutos(updated);
    syncLocal(updated, vendas, movimentacoes);

    return { success: true };
  };

  const excluirProduto = async (id: string) => {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('produtos').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao excluir no Supabase:', err);
      }
    }

    const updated = produtos.filter(p => p.id !== id);
    setProdutos(updated);
    syncLocal(updated, vendas, movimentacoes);

    return { success: true };
  };

  const ajustarEstoque = async (
    produtoId: string, 
    quantidadeAjuste: number, 
    tipo: TipoMovimentacao, 
    motivo?: string
  ) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
      return { success: false, error: 'Produto não encontrado.' };
    }

    const estoqueAnterior = produto.estoque_atual;
    let estoquePosterior = estoqueAnterior;

    if (tipo === 'entrada' || tipo === 'devolucao') {
      estoquePosterior = estoqueAnterior + Math.abs(quantidadeAjuste);
    } else if (tipo === 'saida_venda' || tipo === 'perda_avaria') {
      estoquePosterior = Math.max(0, estoqueAnterior - Math.abs(quantidadeAjuste));
    } else if (tipo === 'ajuste_manual') {
      // If manual adjustment, quantidadeAjuste is the new absolute stock value
      estoquePosterior = Math.max(0, quantidadeAjuste);
    }

    const agora = new Date().toISOString();
    const movId = crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}`;
    const novaMov: MovimentacaoEstoque = {
      id: movId,
      produto_id: produto.id,
      produto_nome: produto.nome,
      tipo,
      quantidade: Math.abs(estoquePosterior - estoqueAnterior),
      estoque_anterior: estoqueAnterior,
      estoque_posterior: estoquePosterior,
      motivo: motivo || `Ajuste (${tipo})`,
      data_hora: agora,
    };

    const produtoAtualizado: Produto = {
      ...produto,
      estoque_atual: estoquePosterior,
      atualizado_em: agora,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('produtos').update({ estoque_atual: estoquePosterior, atualizado_em: agora }).eq('id', produtoId);
        await client.from('movimentacoes_estoque').insert([novaMov]);
      } catch (err) {
        console.warn('Erro ao registrar ajuste no Supabase:', err);
      }
    }

    const updatedProdutos = produtos.map(p => p.id === produtoId ? produtoAtualizado : p);
    const updatedMovs = [novaMov, ...movimentacoes];

    setProdutos(updatedProdutos);
    setMovimentacoes(updatedMovs);
    syncLocal(updatedProdutos, vendas, updatedMovs);

    return { success: true };
  };

  const finalizarVenda = async (dados: {
    itens: Array<{ produto: Produto; quantidade: number }>;
    desconto: number;
    forma_pagamento: Venda['forma_pagamento'];
    valor_recebido?: number;
    cliente_nome?: string;
    observacoes?: string;
  }) => {
    if (!dados.itens || dados.itens.length === 0) {
      return { success: false, error: 'A venda deve conter pelo menos um item.' };
    }

    // Verify stock availability
    for (const item of dados.itens) {
      const p = produtos.find(prod => prod.id === item.produto.id);
      if (!p) {
        return { success: false, error: `Produto ${item.produto.nome} não encontrado no estoque.` };
      }
      if (p.estoque_atual < item.quantidade) {
        return { 
          success: false, 
          error: `Estoque insuficiente para "${p.nome}". Estoque atual: ${p.estoque_atual} ${p.unidade}, solicitado: ${item.quantidade} ${p.unidade}.` 
        };
      }
    }

    const agora = new Date().toISOString();
    const vendaId = crypto.randomUUID ? crypto.randomUUID() : `venda_${Date.now()}`;
    const proximoNumero = vendas.length > 0 ? Math.max(...vendas.map(v => v.numero_venda || 0)) + 1 : 1;

    let subtotal = 0;
    let custoTotal = 0;

    const itensVenda: ItemVenda[] = dados.itens.map((item, idx) => {
      const itemSubtotal = Number((item.produto.preco_venda * item.quantidade).toFixed(2));
      const itemCusto = Number((item.produto.preco_custo * item.quantidade).toFixed(2));
      const itemLucro = Number((itemSubtotal - itemCusto).toFixed(2));

      subtotal += itemSubtotal;
      custoTotal += itemCusto;

      return {
        id: crypto.randomUUID ? crypto.randomUUID() : `item_${Date.now()}_${idx}`,
        venda_id: vendaId,
        produto_id: item.produto.id,
        produto_nome: item.produto.nome,
        produto_codigo: item.produto.codigo_barras,
        unidade: item.produto.unidade,
        quantidade: item.quantidade,
        preco_unitario: item.produto.preco_venda,
        preco_custo_unitario: item.produto.preco_custo,
        subtotal: itemSubtotal,
        lucro_item: itemLucro,
      };
    });

    const desconto = Math.max(0, Number(dados.desconto) || 0);
    const total = Math.max(0, Number((subtotal - desconto).toFixed(2)));
    const lucroTotal = Number((total - custoTotal).toFixed(2));

    const valorRecebido = dados.valor_recebido ? Number(dados.valor_recebido) : undefined;
    const troco = (valorRecebido && valorRecebido > total) ? Number((valorRecebido - total).toFixed(2)) : 0;

    const novaVenda: Venda = {
      id: vendaId,
      numero_venda: proximoNumero,
      data_hora: agora,
      subtotal: Number(subtotal.toFixed(2)),
      desconto,
      total,
      custo_total: Number(custoTotal.toFixed(2)),
      lucro_total: lucroTotal,
      forma_pagamento: dados.forma_pagamento,
      valor_recebido: valorRecebido,
      troco,
      status: 'concluida',
      cliente_nome: dados.cliente_nome?.trim() || undefined,
      observacoes: dados.observacoes?.trim() || undefined,
      itens: itensVenda,
    };

    // Prepare stock movements and update product stocks
    const novasMovimentacoes: MovimentacaoEstoque[] = [];
    const produtosAtualizados = [...produtos];

    for (const item of dados.itens) {
      const pIndex = produtosAtualizados.findIndex(p => p.id === item.produto.id);
      if (pIndex !== -1) {
        const prod = produtosAtualizados[pIndex];
        const estoqueAnt = prod.estoque_atual;
        const estoquePos = Math.max(0, Number((estoqueAnt - item.quantidade).toFixed(3)));

        produtosAtualizados[pIndex] = {
          ...prod,
          estoque_atual: estoquePos,
          atualizado_em: agora,
        };

        novasMovimentacoes.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}_${item.produto.id}`,
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: 'saida_venda',
          quantidade: item.quantidade,
          estoque_anterior: estoqueAnt,
          estoque_posterior: estoquePos,
          motivo: `Venda #${proximoNumero}`,
          data_hora: agora,
        });
      }
    }

    // Save to Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        // 1. Insert Venda
        const { itens, ...vendaDbData } = novaVenda;
        await client.from('vendas').insert([vendaDbData]);

        // 2. Insert Itens
        await client.from('itens_venda').insert(itensVenda);

        // 3. Update products and insert movements
        for (const mov of novasMovimentacoes) {
          await client.from('movimentacoes_estoque').insert([mov]);
          await client.from('produtos').update({ 
            estoque_atual: mov.estoque_posterior, 
            atualizado_em: agora 
          }).eq('id', mov.produto_id);
        }
      } catch (err) {
        console.warn('Erro ao salvar venda no Supabase (mantida local):', err);
      }
    }

    const updatedVendas = [novaVenda, ...vendas];
    const updatedMovs = [...novasMovimentacoes, ...movimentacoes];

    setProdutos(produtosAtualizados);
    setVendas(updatedVendas);
    setMovimentacoes(updatedMovs);
    syncLocal(produtosAtualizados, updatedVendas, updatedMovs);

    return { success: true, venda: novaVenda };
  };

  const cancelarVenda = async (vendaId: string, motivo?: string) => {
    const venda = vendas.find(v => v.id === vendaId);
    if (!venda) {
      return { success: false, error: 'Venda não encontrada.' };
    }
    if (venda.status === 'cancelada') {
      return { success: false, error: 'Esta venda já está cancelada.' };
    }

    const agora = new Date().toISOString();
    const produtosAtualizados = [...produtos];
    const estornoMovs: MovimentacaoEstoque[] = [];

    // Return items to stock
    for (const item of venda.itens) {
      const pIndex = produtosAtualizados.findIndex(p => p.id === item.produto_id);
      if (pIndex !== -1) {
        const prod = produtosAtualizados[pIndex];
        const estoqueAnt = prod.estoque_atual;
        const estoquePos = Number((estoqueAnt + item.quantidade).toFixed(3));

        produtosAtualizados[pIndex] = {
          ...prod,
          estoque_atual: estoquePos,
          atualizado_em: agora,
        };

        estornoMovs.push({
          id: crypto.randomUUID ? crypto.randomUUID() : `mov_canc_${Date.now()}_${item.id}`,
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: 'devolucao',
          quantidade: item.quantidade,
          estoque_anterior: estoqueAnt,
          estoque_posterior: estoquePos,
          motivo: `Cancelamento Venda #${venda.numero_venda}${motivo ? ': ' + motivo : ''}`,
          data_hora: agora,
        });
      }
    }

    const vendaCancelada: Venda = {
      ...venda,
      status: 'cancelada',
      observacoes: (venda.observacoes ? venda.observacoes + ' | ' : '') + `Cancelada em ${new Date().toLocaleString('pt-BR')}${motivo ? ': ' + motivo : ''}`,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('vendas').update({ status: 'cancelada', observacoes: vendaCancelada.observacoes }).eq('id', vendaId);
        for (const mov of estornoMovs) {
          await client.from('movimentacoes_estoque').insert([mov]);
          await client.from('produtos').update({ estoque_atual: mov.estoque_posterior, atualizado_em: agora }).eq('id', mov.produto_id);
        }
      } catch (err) {
        console.warn('Erro ao atualizar cancelamento no Supabase:', err);
      }
    }

    const updatedVendas = vendas.map(v => v.id === vendaId ? vendaCancelada : v);
    const updatedMovs = [...estornoMovs, ...movimentacoes];

    setProdutos(produtosAtualizados);
    setVendas(updatedVendas);
    setMovimentacoes(updatedMovs);
    syncLocal(produtosAtualizados, updatedVendas, updatedMovs);

    return { success: true };
  };

  const configurarSupabase = async (url: string, anonKey: string) => {
    resetSupabaseClient(url, anonKey);
    const test = await testSupabaseConnection(url, anonKey);

    const updatedConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      isConnected: test.success,
      lastChecked: new Date().toISOString(),
      errorMessage: test.success ? undefined : test.message,
    };

    saveStoredSupabaseConfig(updatedConfig);
    setSupabaseConfig(updatedConfig);

    if (test.success) {
      await carregarDados();
    }

    return { success: test.success, message: test.message };
  };

  const sincronizarComSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase não está configurado. Conecte sua URL e Chave Anon primeiro.' };
    }

    try {
      // 1. Sync products
      if (produtos.length > 0) {
        const { error: pErr } = await client.from('produtos').upsert(produtos, { onConflict: 'codigo_barras' });
        if (pErr) throw new Error(`Falha ao sincronizar produtos: ${pErr.message}`);
      }

      // 2. Sync sales & items
      for (const v of vendas) {
        const { itens, ...vendaData } = v;
        const { error: vErr } = await client.from('vendas').upsert(vendaData, { onConflict: 'id' });
        if (vErr) throw new Error(`Falha ao sincronizar venda #${v.numero_venda}: ${vErr.message}`);

        if (itens && itens.length > 0) {
          const { error: iErr } = await client.from('itens_venda').upsert(itens, { onConflict: 'id' });
          if (iErr) console.warn('Aviso itens:', iErr.message);
        }
      }

      // 3. Sync movements
      if (movimentacoes.length > 0) {
        await client.from('movimentacoes_estoque').upsert(movimentacoes, { onConflict: 'id' });
      }

      return { 
        success: true, 
        message: `Sincronização concluída com sucesso! ${produtos.length} produtos e ${vendas.length} vendas sincronizados com o Supabase.` 
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao sincronizar dados com o Supabase.' };
    }
  };

  const limparBancoLocal = () => {
    localStorage.removeItem(LOCAL_STORAGE_PRODUTOS);
    localStorage.removeItem(LOCAL_STORAGE_VENDAS);
    localStorage.removeItem(LOCAL_STORAGE_MOVIMENTACOES);
    setProdutos([]);
    setVendas([]);
    setMovimentacoes([]);
  };

  return (
    <SupermercadoContext.Provider
      value={{
        produtos,
        vendas,
        movimentacoes,
        loading,
        supabaseConfig,
        carregarDados,
        adicionarProduto,
        atualizarProduto,
        excluirProduto,
        ajustarEstoque,
        finalizarVenda,
        cancelarVenda,
        configurarSupabase,
        sincronizarComSupabase,
        limparBancoLocal,
      }}
    >
      {children}
    </SupermercadoContext.Provider>
  );
};

export const useSupermercado = () => {
  const context = useContext(SupermercadoContext);
  if (!context) {
    throw new Error('useSupermercado deve ser usado dentro de um SupermercadoProvider');
  }
  return context;
};
