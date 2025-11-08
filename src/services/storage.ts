import { Boleto, BoletoStatus, CreateBoletoInput, UpdateBoletoInput } from '../types';

const STORAGE_KEY = 'meusboletos_data';

/**
 * Gera um ID único
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Carrega todos os boletos do localStorage
 */
export function loadBoletos(): Boleto[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const boletos = JSON.parse(data) as Boleto[];
    
    // Atualizar status de boletos vencidos
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return boletos.map(boleto => {
      if (boleto.status === BoletoStatus.PENDENTE) {
        const vencimento = new Date(boleto.vencimento);
        vencimento.setHours(0, 0, 0, 0);
        
        if (vencimento < hoje) {
          return { ...boleto, status: BoletoStatus.VENCIDO };
        }
      }
      return boleto;
    });
  } catch (error) {
    console.error('Erro ao carregar boletos:', error);
    return [];
  }
}

/**
 * Salva boletos no localStorage
 */
function saveBoletos(boletos: Boleto[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos));
  } catch (error) {
    console.error('Erro ao salvar boletos:', error);
    throw new Error('Não foi possível salvar os dados');
  }
}

/**
 * Cria um novo boleto
 */
export function createBoleto(input: CreateBoletoInput): Boleto {
  const boletos = loadBoletos();
  
  // Verificar se já existe boleto com o mesmo código de barras
  const existe = boletos.some(b => b.codigoBarras === input.codigoBarras);
  if (existe) {
    throw new Error('Já existe um boleto com este código de barras');
  }
  
  const agora = new Date().toISOString();
  const novoBoleto: Boleto = {
    id: generateId(),
    ...input,
    status: input.status || BoletoStatus.PENDENTE,
    createdAt: agora,
    updatedAt: agora,
  };
  
  boletos.push(novoBoleto);
  saveBoletos(boletos);
  
  return novoBoleto;
}

/**
 * Atualiza um boleto existente
 */
export function updateBoleto(id: string, input: UpdateBoletoInput): Boleto {
  const boletos = loadBoletos();
  const index = boletos.findIndex(b => b.id === id);
  
  if (index === -1) {
    throw new Error('Boleto não encontrado');
  }
  
  const boletoAtualizado: Boleto = {
    ...boletos[index],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  
  boletos[index] = boletoAtualizado;
  saveBoletos(boletos);
  
  return boletoAtualizado;
}

/**
 * Deleta um boleto
 */
export function deleteBoleto(id: string): void {
  const boletos = loadBoletos();
  const filtrados = boletos.filter(b => b.id !== id);
  
  if (filtrados.length === boletos.length) {
    throw new Error('Boleto não encontrado');
  }
  
  saveBoletos(filtrados);
}

/**
 * Busca um boleto por ID
 */
export function getBoletoById(id: string): Boleto | undefined {
  const boletos = loadBoletos();
  return boletos.find(b => b.id === id);
}

/**
 * Marca um boleto como pago
 */
export function marcarComoPago(id: string): Boleto {
  return updateBoleto(id, {
    status: BoletoStatus.PAGO,
    dataPagamento: new Date().toISOString(),
  });
}

/**
 * Exporta os dados em JSON
 */
export function exportarDados(): string {
  const boletos = loadBoletos();
  return JSON.stringify(boletos, null, 2);
}

/**
 * Importa dados de JSON
 */
export function importarDados(json: string): void {
  try {
    const boletos = JSON.parse(json) as Boleto[];
    
    // Validar estrutura básica
    if (!Array.isArray(boletos)) {
      throw new Error('Formato inválido');
    }
    
    saveBoletos(boletos);
  } catch (error) {
    throw new Error('Erro ao importar dados. Verifique o formato do arquivo.');
  }
}
