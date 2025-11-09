/**
 * Serviço para processar e extrair informações de códigos de barras de boletos bancários
 */

interface BoletoParseResult {
  codigoBarras: string;
  linhaDigitavel: string;
  banco?: string;
  valor?: number;
  vencimento?: Date;
  isValid: boolean;
  error?: string;
}

// Mapa de códigos de bancos
const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica Federal',
  '237': 'Bradesco',
  '341': 'Itaú',
  '356': 'Banco Real',
  '389': 'Banco Mercantil',
  '399': 'HSBC',
  '422': 'Banco Safra',
  '453': 'Banco Rural',
  '633': 'Banco Rendimento',
  '652': 'Itaú Unibanco',
  '745': 'Citibank',
};

/**
 * Remove caracteres não numéricos
 */
function limparCodigo(codigo: string): string {
  return codigo.replace(/\D/g, '');
}

/**
 * Calcula o dígito verificador usando módulo 10
 */
function calcularDVModulo10(numero: string): number {
  let soma = 0;
  let peso = 2;

  for (let i = numero.length - 1; i >= 0; i--) {
    const multiplicacao = parseInt(numero[i]) * peso;
    soma += multiplicacao > 9 ? Math.floor(multiplicacao / 10) + (multiplicacao % 10) : multiplicacao;
    peso = peso === 2 ? 1 : 2;
  }

  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

/**
 * Calcula o dígito verificador usando módulo 11
 */
function calcularDVModulo11(numero: string): number {
  let soma = 0;
  let multiplicador = 2;

  // Percorrer da direita para esquerda
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 9 ? 2 : multiplicador + 1;
  }

  const resto = soma % 11;
  const dv = 11 - resto;
  
  // Se DV for 0, 10 ou 11, usar 1
  if (dv === 0 || dv === 10 || dv === 11) {
    return 1;
  }
  return dv;
}

/**
 * Valida linha digitável
 */
function validarLinhaDigitavel(linha: string): boolean {
  const limpa = limparCodigo(linha);
  
  if (limpa.length !== 47) {
    return false;
  }

  // Validar cada campo da linha digitável
  const campo1 = limpa.substring(0, 9);
  const dv1 = parseInt(limpa.substring(9, 10));
  const campo2 = limpa.substring(10, 20);
  const dv2 = parseInt(limpa.substring(20, 21));
  const campo3 = limpa.substring(21, 31);
  const dv3 = parseInt(limpa.substring(31, 32));

  return (
    calcularDVModulo10(campo1) === dv1 &&
    calcularDVModulo10(campo2) === dv2 &&
    calcularDVModulo10(campo3) === dv3
  );
}

/**
 * Converte linha digitável para código de barras
 */
function linhaParaCodigoBarras(linha: string): string {
  const limpa = limparCodigo(linha);
  
  if (limpa.length !== 47) {
    throw new Error('Linha digitável inválida');
  }

  // Reorganizar os campos
  const codigoBarras =
    limpa.substring(0, 4) + // Código do banco + moeda
    limpa.substring(32, 33) + // DV geral
    limpa.substring(33, 47) + // Fator vencimento + valor
    limpa.substring(4, 9) + // Campo livre parte 1
    limpa.substring(10, 20) + // Campo livre parte 2
    limpa.substring(21, 31); // Campo livre parte 3

  return codigoBarras;
}

/**
 * Converte código de barras para linha digitável
 */
function codigoBarrasParaLinha(codigoBarras: string): string {
  const limpa = limparCodigo(codigoBarras);
  
  if (limpa.length !== 44) {
    throw new Error('Código de barras inválido');
  }

  // Campo 1: Código do banco + moeda + primeiros 5 dígitos do campo livre
  const campo1 = limpa.substring(0, 4) + limpa.substring(19, 24);
  const dv1 = calcularDVModulo10(campo1);

  // Campo 2: Próximos 10 dígitos do campo livre
  const campo2 = limpa.substring(24, 34);
  const dv2 = calcularDVModulo10(campo2);

  // Campo 3: Últimos 10 dígitos do campo livre
  const campo3 = limpa.substring(34, 44);
  const dv3 = calcularDVModulo10(campo3);

  // Campo 4: DV geral
  const campo4 = limpa.substring(4, 5);

  // Campo 5: Fator de vencimento + valor
  const campo5 = limpa.substring(5, 19);

  return `${campo1}${dv1}${campo2}${dv2}${campo3}${dv3}${campo4}${campo5}`;
}

/**
 * Extrai o valor do boleto
 */
function extrairValor(codigoBarras: string): number | undefined {
  const limpa = limparCodigo(codigoBarras);
  
  if (limpa.length !== 44) {
    console.log('❌ Código não tem 44 dígitos para extrair valor:', limpa.length);
    return undefined;
  }

  const valorString = limpa.substring(9, 19);
  const valor = parseInt(valorString) / 100;

  console.log('💰 Extração de valor:', {
    codigoBarras: limpa,
    valorString: valorString,
    posicoes: '9-19',
    valorCalculado: valor
  });

  return valor > 0 ? valor : undefined;
}

/**
 * Extrai a data de vencimento
 */
function extrairVencimento(codigoBarras: string): Date | undefined {
  const limpa = limparCodigo(codigoBarras);
  
  if (limpa.length !== 44) {
    return undefined;
  }

  const fatorVencimento = parseInt(limpa.substring(5, 9));

  if (fatorVencimento === 0) {
    return undefined;
  }

  // Data base: 07/10/1997
  const dataBase = new Date(1997, 9, 7);
  const vencimento = new Date(dataBase);
  vencimento.setDate(vencimento.getDate() + fatorVencimento);

  return vencimento;
}

/**
 * Identifica o banco pelo código
 */
function identificarBanco(codigoBarras: string): string | undefined {
  const limpa = limparCodigo(codigoBarras);
  
  if (limpa.length < 3) {
    return undefined;
  }

  const codigoBanco = limpa.substring(0, 3);
  return BANCOS[codigoBanco];
}

/**
 * Valida código de barras
 */
function validarCodigoBarras(codigoBarras: string): boolean {
  const limpa = limparCodigo(codigoBarras);
  
  if (limpa.length !== 44) {
    console.log('❌ Código de barras não tem 44 dígitos:', limpa.length);
    return false;
  }

  // Extrair DV
  const dv = parseInt(limpa.substring(4, 5));
  
  // Montar código sem o DV
  const codigoSemDV = limpa.substring(0, 4) + limpa.substring(5, 44);
  
  // Calcular DV
  const dvCalculado = calcularDVModulo11(codigoSemDV);

  console.log('🔐 Validação DV:', {
    codigoBarras: limpa,
    codigoBarrasLength: limpa.length,
    codigoSemDV: codigoSemDV,
    codigoSemDVLength: codigoSemDV.length,
    dvEncontrado: dv,
    dvCalculado: dvCalculado,
    valido: dv === dvCalculado
  });

  return dv === dvCalculado;
}

/**
 * Formata linha digitável com pontos e espaços
 */
export function formatarLinhaDigitavel(linha: string): string {
  const limpa = limparCodigo(linha);
  
  if (limpa.length !== 47) {
    return linha;
  }

  return `${limpa.substring(0, 5)}.${limpa.substring(5, 10)} ${limpa.substring(10, 15)}.${limpa.substring(15, 21)} ${limpa.substring(21, 26)}.${limpa.substring(26, 32)} ${limpa.substring(32, 33)} ${limpa.substring(33, 47)}`;
}

/**
 * Função principal para processar código de boleto
 */
export function parseBoleto(codigo: string): BoletoParseResult {
  const limpa = limparCodigo(codigo);

  // Verificar se é linha digitável (47 dígitos) ou código de barras (44 dígitos)
  if (limpa.length === 47) {
    // É linha digitável
    if (!validarLinhaDigitavel(limpa)) {
      return {
        codigoBarras: '',
        linhaDigitavel: '',
        isValid: false,
        error: 'Linha digitável inválida',
      };
    }

    try {
      const codigoBarras = linhaParaCodigoBarras(limpa);
      
      if (!validarCodigoBarras(codigoBarras)) {
        return {
          codigoBarras: '',
          linhaDigitavel: '',
          isValid: false,
          error: 'Código de barras inválido',
        };
      }

      return {
        codigoBarras,
        linhaDigitavel: limpa,
        banco: identificarBanco(codigoBarras),
        valor: extrairValor(codigoBarras),
        vencimento: extrairVencimento(codigoBarras),
        isValid: true,
      };
    } catch (error) {
      return {
        codigoBarras: '',
        linhaDigitavel: '',
        isValid: false,
        error: 'Erro ao processar linha digitável',
      };
    }
  } else if (limpa.length === 44) {
    // É código de barras
    if (!validarCodigoBarras(limpa)) {
      return {
        codigoBarras: '',
        linhaDigitavel: '',
        isValid: false,
        error: 'Código de barras inválido',
      };
    }

    try {
      const linhaDigitavel = codigoBarrasParaLinha(limpa);

      return {
        codigoBarras: limpa,
        linhaDigitavel,
        banco: identificarBanco(limpa),
        valor: extrairValor(limpa),
        vencimento: extrairVencimento(limpa),
        isValid: true,
      };
    } catch (error) {
      return {
        codigoBarras: '',
        linhaDigitavel: '',
        isValid: false,
        error: 'Erro ao processar código de barras',
      };
    }
  }

  return {
    codigoBarras: '',
    linhaDigitavel: '',
    isValid: false,
    error: 'Código inválido. Use 44 dígitos (código de barras) ou 47 dígitos (linha digitável)',
  };
}
