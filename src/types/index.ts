export type UnidadeMedida = 'UN' | 'KG' | 'G' | 'L' | 'ML' | 'PCT' | 'CX';

export type CategoriaProduto = 
  | 'Mercearia'
  | 'Hortifrúti'
  | 'Açougue & Carnes'
  | 'Bebidas'
  | 'Laticínios & Frios'
  | 'Padaria & Confeitaria'
  | 'Limpeza'
  | 'Higiene & Perfumaria'
  | 'Congelados'
  | 'Doces & Biscoitos'
  | 'Pet Shop'
  | 'Outros';

export interface Produto {
  id: string;
  codigo_barras: string;
  nome: string;
  categoria: CategoriaProduto;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: UnidadeMedida;
  data_validade?: string;
  fornecedor?: string;
  observacoes?: string;
  criado_em: string;
  atualizado_em: string;
}

export type FormaPagamento = 
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'pix'
  | 'vale_alimentacao'
  | 'outro';

export interface ItemVenda {
  id: string;
  venda_id?: string;
  produto_id: string;
  produto_nome: string;
  produto_codigo: string;
  unidade: UnidadeMedida;
  quantidade: number;
  preco_unitario: number;
  preco_custo_unitario: number;
  subtotal: number;
  lucro_item: number;
}

export interface Venda {
  id: string;
  numero_venda: number;
  data_hora: string;
  subtotal: number;
  desconto: number;
  total: number;
  custo_total: number;
  lucro_total: number;
  forma_pagamento: FormaPagamento;
  valor_recebido?: number;
  troco?: number;
  status: 'concluida' | 'cancelada';
  cliente_nome?: string;
  observacoes?: string;
  itens: ItemVenda[];
}

export type TipoMovimentacao = 
  | 'entrada'
  | 'saida_venda'
  | 'ajuste_manual'
  | 'perda_avaria'
  | 'devolucao';

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  estoque_anterior: number;
  estoque_posterior: number;
  motivo?: string;
  data_hora: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastChecked?: string;
  errorMessage?: string;
}
