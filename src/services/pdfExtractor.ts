import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js usando o arquivo local
// O Vite vai copiar este arquivo automaticamente durante o build
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface BoletoExtraido {
  codigoBarras?: string;
  linhaDigitavel?: string;
  valor?: number;
  vencimento?: string;
  beneficiario?: string;
  pagador?: string;
  numeroDocumento?: string;
}

/**
 * Extrai texto de todas as páginas de um PDF
 */
async function extrairTextoDoPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let textoCompleto = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    textoCompleto += pageText + '\n';
  }
  
  return textoCompleto;
}

/**
 * Procura por código de barras ou linha digitável no texto extraído
 */
function extrairCodigosDoTexto(texto: string): BoletoExtraido {
  const resultado: BoletoExtraido = {};
  
  // Remove espaços e caracteres especiais para facilitar a busca
  const textoLimpo = texto.replace(/\s+/g, '');
  
  // Procurar por linha digitável (47 dígitos com possíveis espaços/pontos)
  const regexLinha = /(\d{5}[\.\s]?\d{5}[\.\s]?\d{5}[\.\s]?\d{6}[\.\s]?\d{5}[\.\s]?\d{6}[\.\s]?\d[\.\s]?\d{14})/g;
  const matchLinha = texto.match(regexLinha);
  
  if (matchLinha && matchLinha[0]) {
    const linhaLimpa = matchLinha[0].replace(/[\.\s]/g, '');
    if (linhaLimpa.length === 47) {
      resultado.linhaDigitavel = linhaLimpa;
    }
  }
  
  // Procurar por código de barras (44 dígitos seguidos)
  const regexCodigo = /(\d{44})/g;
  const matchCodigo = textoLimpo.match(regexCodigo);
  
  if (matchCodigo && matchCodigo[0]) {
    resultado.codigoBarras = matchCodigo[0];
  }
  
  // Extrair valor (procurar por padrões como "R$ 1.234,56" ou "Valor: 1234.56")
  const regexValor = /(?:R\$|Valor|VALOR)[\s:]*(\d{1,3}(?:\.\d{3})*,\d{2})/gi;
  const matchValor = texto.match(regexValor);
  
  if (matchValor && matchValor[0]) {
    const valorStr = matchValor[0].replace(/[^\d,]/g, '').replace(',', '.');
    resultado.valor = parseFloat(valorStr);
  }
  
  // Extrair vencimento (procurar por datas no formato DD/MM/YYYY)
  const regexVencimento = /(?:Vencimento|VENCIMENTO|Data de Vencimento)[\s:]*(\d{2}\/\d{2}\/\d{4})/gi;
  const matchVencimento = texto.match(regexVencimento);
  
  if (matchVencimento && matchVencimento[0]) {
    const dataMatch = matchVencimento[0].match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dataMatch) {
      const [dia, mes, ano] = dataMatch[0].split('/');
      resultado.vencimento = `${ano}-${mes}-${dia}`;
    }
  }
  
  // Extrair beneficiário/cedente
  const regexBeneficiario = /(?:Benefici[aá]rio|Cedente|BENEFICI[AÁ]RIO|CEDENTE)[\s:]*([^\n]{5,100})/gi;
  const matchBeneficiario = texto.match(regexBeneficiario);
  
  if (matchBeneficiario && matchBeneficiario[0]) {
    resultado.beneficiario = matchBeneficiario[0]
      .replace(/(?:Benefici[aá]rio|Cedente|BENEFICI[AÁ]RIO|CEDENTE)[\s:]*/gi, '')
      .trim()
      .substring(0, 100);
  }
  
  // Extrair pagador/sacado
  const regexPagador = /(?:Pagador|Sacado|PAGADOR|SACADO)[\s:]*([^\n]{5,100})/gi;
  const matchPagador = texto.match(regexPagador);
  
  if (matchPagador && matchPagador[0]) {
    resultado.pagador = matchPagador[0]
      .replace(/(?:Pagador|Sacado|PAGADOR|SACADO)[\s:]*/gi, '')
      .trim()
      .substring(0, 100);
  }
  
  // Extrair número do documento
  const regexDocumento = /(?:N[uú]mero do Documento|Nosso N[uú]mero|N° Documento)[\s:]*(\d+[\-\/]?\d*)/gi;
  const matchDocumento = texto.match(regexDocumento);
  
  if (matchDocumento && matchDocumento[0]) {
    resultado.numeroDocumento = matchDocumento[0]
      .replace(/(?:N[uú]mero do Documento|Nosso N[uú]mero|N° Documento)[\s:]*/gi, '')
      .trim();
  }
  
  return resultado;
}

/**
 * Função principal que processa o PDF e extrai dados do boleto
 */
export async function extrairDadosDoBoleto(file: File): Promise<BoletoExtraido> {
  try {
    // Validar se é PDF
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('O arquivo deve ser um PDF');
    }
    
    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('O arquivo é muito grande. Máximo: 10MB');
    }
    
    // Extrair texto do PDF
    const texto = await extrairTextoDoPDF(file);
    
    if (!texto || texto.trim().length === 0) {
      throw new Error('Não foi possível extrair texto do PDF. O arquivo pode estar vazio ou protegido.');
    }
    
    // Extrair dados do boleto do texto
    const dados = extrairCodigosDoTexto(texto);
    
    // Validar se encontrou pelo menos o código de barras ou linha digitável
    if (!dados.codigoBarras && !dados.linhaDigitavel) {
      throw new Error('Não foi possível identificar o código de barras no PDF. Tente digitar manualmente.');
    }
    
    return dados;
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao processar PDF: ' + String(error));
  }
}

/**
 * Valida se o arquivo é um PDF válido antes do processamento
 */
export function validarArquivoPDF(file: File): { valido: boolean; erro?: string } {
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valido: false, erro: 'O arquivo deve ser um PDF' };
  }
  
  if (file.size > 10 * 1024 * 1024) {
    return { valido: false, erro: 'O arquivo é muito grande. Máximo: 10MB' };
  }
  
  if (file.size === 0) {
    return { valido: false, erro: 'O arquivo está vazio' };
  }
  
  return { valido: true };
}
