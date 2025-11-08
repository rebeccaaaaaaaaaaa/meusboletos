// Tipos para boletos
export enum BoletoStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  VENCIDO = 'VENCIDO',
  CANCELADO = 'CANCELADO',
}

export interface Boleto {
  id: string;
  codigoBarras: string;
  linhaDigitavel: string;
  descricao: string;
  valor: number;
  vencimento: string; // ISO date string
  banco?: string;
  beneficiario?: string;
  numeroDocumento?: string;
  status: BoletoStatus;
  dataPagamento?: string; // ISO date string
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateBoletoInput = Omit<Boleto, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: BoletoStatus;
}

export type UpdateBoletoInput = Partial<Omit<Boleto, 'id' | 'createdAt' | 'updatedAt'>>;

export interface BoletoFilters {
  status?: BoletoStatus;
  mes?: number;
  ano?: number;
  search?: string;
}
