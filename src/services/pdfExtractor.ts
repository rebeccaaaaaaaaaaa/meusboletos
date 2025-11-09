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
    
    // Extrair texto preservando alguma estrutura
    const pageText = textContent.items
      .map((item: any) => {
        // Adicionar quebra de linha para itens que mudam muito de posição vertical
        return item.str;
      })
      .filter((str: string) => str.trim().length > 0) // Remover strings vazias
      .join(' ');
    
    textoCompleto += pageText + '\n';
  }
  
  console.log('📄 TEXTO COMPLETO DO PDF:');
  console.log('='.repeat(80));
  console.log(textoCompleto);
  console.log('='.repeat(80));
  console.log('Primeiros 1000 caracteres:', textoCompleto.substring(0, 1000));
  
  return textoCompleto;
}

/**
 * Procura por código de barras ou linha digitável no texto extraído
 */
function extrairCodigosDoTexto(texto: string): BoletoExtraido {
  const resultado: BoletoExtraido = {};
  
  // Remove espaços e caracteres especiais para facilitar a busca
  const textoLimpo = texto.replace(/\s+/g, '');
  
  // Procurar por linha digitável (47 dígitos - mais flexível)
  // Padrão: AAAAA.AAAAA BBBBB.BBBBBB CCCCC.CCCCCC D EEEEEEEEEEEEEE
  // Exemplo: 10491.21203 41000.100044 00000.042499 1 12400000058333
  const regexLinha = /\d{5}[\.\s]+\d{5}[\.\s]+\d{5}[\.\s]+\d{6}[\.\s]+\d{5}[\.\s]+\d{6}[\.\s]+\d[\.\s]+\d{14}/g;
  const matchesLinha = texto.match(regexLinha);
  
  if (matchesLinha && matchesLinha.length > 0) {
    // Pegar a primeira ocorrência válida
    for (const match of matchesLinha) {
      const linhaLimpa = match.replace(/[^\d]/g, '');
      if (linhaLimpa.length === 47) {
        resultado.linhaDigitavel = linhaLimpa;
        console.log('🔍 Linha digitável encontrada:', match, '→', linhaLimpa);
        break;
      }
    }
  }
  
  // Se não encontrou, tentar padrão sem espaços obrigatórios
  if (!resultado.linhaDigitavel) {
    const regexLinhaSimples = /\d{5}\.?\d{5}\s+\d{5}\.?\d{6}\s+\d{5}\.?\d{6}\s+\d\s+\d{14}/g;
    const matchSimples = texto.match(regexLinhaSimples);
    if (matchSimples && matchSimples[0]) {
      const linhaLimpa = matchSimples[0].replace(/[^\d]/g, '');
      if (linhaLimpa.length === 47) {
        resultado.linhaDigitavel = linhaLimpa;
        console.log('🔍 Linha digitável encontrada (simples):', matchSimples[0], '→', linhaLimpa);
      }
    }
  }
  
  // Procurar por código de barras (44 dígitos seguidos)
  const regexCodigo = /\d{44}/g;
  const matchesCodigo = textoLimpo.match(regexCodigo);
  
  if (matchesCodigo && matchesCodigo.length > 0) {
    // Preferir código que não seja a linha digitável convertida
    for (const match of matchesCodigo) {
      if (match !== resultado.linhaDigitavel?.substring(0, 44)) {
        resultado.codigoBarras = match;
        break;
      }
    }
  }
  
  // Extrair valor - do código de barras primeiro (mais confiável)
  if (resultado.linhaDigitavel) {
    // Extrair valor da linha digitável: últimos 10 dígitos do campo 5
    // Formato: AAAAA.AAAAA BBBBB.BBBBBB CCCCC.CCCCCC D FFFFVVVVVVVVVV
    // F = fator vencimento (4 dígitos), V = valor (10 dígitos)
    const linhaLimpa = resultado.linhaDigitavel;
    const valorStr = linhaLimpa.substring(37, 47); // Últimos 10 dígitos
    const valorNum = parseInt(valorStr);
    if (valorNum > 0) {
      resultado.valor = valorNum / 100;
      console.log('💰 Valor extraído da linha digitável:', valorStr, '→', resultado.valor);
    }
  }
  
  // Se não conseguiu extrair da linha, tentar do texto
  if (!resultado.valor) {
    const regexesValor = [
      /\(=\)\s*Valor\s+(?:do\s+Documento|Cobrado)[\s:]*(\d{1,3}(?:\.\d{3})*,\d{2})/gi,
      /Valor\s+(?:do\s+Documento|Cobrado)[\s:]*(\d{1,3}(?:\.\d{3})*,\d{2})/gi,
      /(?:Valor|VALOR)[\s:=]*R?\$?[\s]*(\d{1,3}(?:\.\d{3})*,\d{2})/gi,
      /R\$[\s]*(\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    ];
    
    for (const regex of regexesValor) {
      const matchValor = texto.match(regex);
      if (matchValor && matchValor[0]) {
        const valorMatch = matchValor[0].match(/(\d{1,3}(?:\.\d{3})*,\d{2})/);
        if (valorMatch) {
          const valorStr = valorMatch[0].replace(/\./g, '').replace(',', '.');
          resultado.valor = parseFloat(valorStr);
          console.log('💰 Valor extraído do texto:', matchValor[0], '→', resultado.valor);
          break;
        }
      }
    }
  }
  
  // Extrair vencimento - do TEXTO primeiro (mais confiável que calcular pelo fator)
  console.log('🔍 Procurando vencimento no texto...');
  
  const regexesVencimento = [
    /Vencimento[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
    /(?:VENCIMENTO|Data de Vencimento|Data do Vencimento)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
    /(?:Vencimento|VENCIMENTO)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/gi,
    // Tentar pegar qualquer data no formato dd/mm/yyyy próxima à palavra "Vencimento"
    /\d{2}\/\d{2}\/\d{4}/g,
  ];
  
  for (const regex of regexesVencimento) {
    const matchVencimento = texto.match(regex);
    console.log('🔍 Testando regex:', regex, '→ Matches:', matchVencimento);
    
    if (matchVencimento && matchVencimento[0]) {
      const dataMatch = matchVencimento[0].match(/(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/);
      if (dataMatch) {
        const partes = dataMatch[0].split(/[\/\-]/);
        let [dia, mes, ano] = partes;
        
        // Converter ano de 2 dígitos para 4 dígitos
        if (ano.length === 2) {
          const anoNum = parseInt(ano);
          ano = anoNum > 50 ? `19${ano}` : `20${ano}`;
        }
        
        resultado.vencimento = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        console.log('✅ Vencimento extraído do texto:', matchVencimento[0], '→', resultado.vencimento);
        break;
      }
    }
  }
  
  if (!resultado.vencimento) {
    console.log('❌ Não foi possível extrair vencimento do texto');
  }
  
  // Reconstruir código de barras da linha digitável
  if (resultado.linhaDigitavel) {
    // Converter linha digitável para código de barras
    // Linha digitável: AAAAA.AAAAA BBBBB.BBBBBB CCCCC.CCCCCC D FFFFVVVVVVVVVV
    // Formato: [Banco+Moeda+5dig] DV1 [10dig] DV2 [10dig] DV3 [DV geral] [Fator+Valor]
    // Posições: 0-9 (campo1+DV), 10-20 (campo2+DV), 21-31 (campo3+DV), 32 (DV), 33-47 (fator+valor)
    
    const linha = resultado.linhaDigitavel;
    
    console.log('🔍 Análise da linha digitável:', {
      linhaCompleta: linha,
      comprimento: linha.length,
      campo1: linha.substring(0, 10) + ' (posições 0-9)',
      campo2: linha.substring(10, 21) + ' (posições 10-20)',
      campo3: linha.substring(21, 32) + ' (posições 21-31)',
      dvGeral: linha.substring(32, 33) + ' (posição 32)',
      fatorEValor: linha.substring(33, 47) + ' (posições 33-46)',
      fatorExtraido: linha.substring(33, 37) + ' (posições 33-36)',
      valorExtraido: linha.substring(37, 47) + ' (posições 37-46)'
    });
    
    // Reconstruir código de barras (44 dígitos) removendo os DVs dos campos
    const codigoBarras = 
      linha.substring(0, 4) +       // Banco (3) + Moeda (1) - posições 0-3
      linha.substring(32, 33) +     // DV geral - posição 32
      linha.substring(33, 37) +     // Fator vencimento (4 dígitos) - posições 33-36
      linha.substring(37, 47) +     // Valor (10 dígitos) - posições 37-46
      linha.substring(4, 9) +       // Campo livre parte 1 (5 dígitos) - posições 4-8 (sem DV na pos 9)
      linha.substring(10, 20) +     // Campo livre parte 2 (10 dígitos) - posições 10-19 (sem DV na pos 20)
      linha.substring(21, 31);      // Campo livre parte 3 (10 dígitos) - posições 21-30 (sem DV na pos 31)
    
    // Atribuir código de barras reconstruído
    resultado.codigoBarras = codigoBarras;
    
    // Extrair fator de vencimento do código de barras (posições 5-8)
    const fatorStr = codigoBarras.substring(5, 9);
    const fator = parseInt(fatorStr);
    
    console.log('📊 Código de barras reconstruído:', codigoBarras, `(${codigoBarras.length} dígitos)`);
    console.log('📊 Estrutura:', {
      banco: codigoBarras.substring(0, 3),
      moeda: codigoBarras.substring(3, 4),
      dv: codigoBarras.substring(4, 5),
      fator: codigoBarras.substring(5, 9),
      valor: codigoBarras.substring(9, 19),
      campoLivre: codigoBarras.substring(19, 44)
    });
    console.log('📊 Fator extraído:', fatorStr, '→', fator);
  }
  
  // Extrair beneficiário/cedente - buscar no texto todo
  // Primeiro, procurar pelo padrão "Nome completo CNPJ" em qualquer lugar
  const regexCNPJ = /([A-ZÇÃÕÁÉÍÓÚ][A-Z\s]+?(?:LTDA|S\.A\.|SPE|EIRELI|ME|EPP)?)\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})/gi;
  const matchesCNPJ = texto.match(regexCNPJ);
  
  if (matchesCNPJ && matchesCNPJ.length > 0) {
    // Pegar a primeira empresa com CNPJ (geralmente é o beneficiário)
    for (const match of matchesCNPJ) {
      const partes = match.trim().split(/\s+(?=\d{2}\.\d{3})/);
      if (partes.length >= 2) {
        const nome = partes[0].trim();
        const cnpj = partes[1].trim();
        
        // Validar que é um nome válido (não é "Local de Pagamento" etc)
        if (nome.length >= 10 && 
            !nome.includes('Local de Pagamento') && 
            !nome.includes('Endereço') &&
            !nome.includes('Agência')) {
          resultado.beneficiario = `${nome} ${cnpj}`;
          console.log('🏢 Beneficiário encontrado:', resultado.beneficiario);
          break;
        }
      }
    }
  }
  
  // Se não encontrou com CNPJ, procurar após palavra "Beneficiário"
  if (!resultado.beneficiario) {
    const regexesBeneficiario = [
      /Benefici[aá]rio[\s:]+([A-ZÇÃÕÁÉÍÓÚ][A-Z\s]+?)(?=\s+(?:Local|Endereço|CEP|Agência|Vencimento|\d{2}\/))/gi,
      /Benefici[aá]rio[\s:]+([^\n]{10,100}?)(?=\s+(?:Local|Endereço))/gi,
    ];
    
    for (const regex of regexesBeneficiario) {
      const matchBeneficiario = texto.match(regex);
      if (matchBeneficiario && matchBeneficiario[0]) {
        let nome = matchBeneficiario[0]
          .replace(/Benefici[aá]rio[\s:]*/gi, '')
          .trim();
        
        // Limpar números isolados no final
        nome = nome.replace(/\s+\d+[\s\d\-\/]*$/, '').trim();
        
        if (nome.length >= 10 && nome.length <= 100 && !nome.includes('Local de Pagamento')) {
          resultado.beneficiario = nome.substring(0, 100);
          console.log('🏢 Beneficiário encontrado (alternativo):', resultado.beneficiario);
          break;
        }
      }
    }
  }
  
  // Extrair pagador/sacado
  const regexesPagador = [
    /(?:Pagador|Sacado|PAGADOR|SACADO)[\s:\/]*([A-ZÇÃÕÁÉÍÓÚ][^\n\d]{4,100})/gi,
    /(?:Pagador|PAGADOR)[\s:\/]*([^\n]{5,100})/gi,
  ];
  
  for (const regex of regexesPagador) {
    const matchPagador = texto.match(regex);
    if (matchPagador && matchPagador[0]) {
      let nome = matchPagador[0]
        .replace(/(?:Pagador|Sacado|PAGADOR|SACADO)[\s:\/]*/gi, '')
        .trim();
      
      // Limpar possíveis documentos ou códigos
      nome = nome.replace(/\s+\d{3}\.\d{3}\.\d{3}\-\d{2}.*$/, '').trim();
      nome = nome.replace(/\s+\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}.*$/, '').trim();
      
      if (nome.length >= 5 && nome.length <= 100) {
        resultado.pagador = nome.substring(0, 100);
        break;
      }
    }
  }
  
  // Extrair número do documento - procurar vários padrões
  const regexesDocumento = [
    /(?:Nosso N[uú]mero|Nº do Documento|N[°º]\s*Documento)[\s:]*(\d+[\-\/]?\d*)/gi,
    /(?:Nr\.\s*do Documento|Número do Documento)[\s:]*(\d+[\-\/]?\d*)/gi,
    /(?:Documento)[\s:]+(\d{5,}[\-\/]?\d*)/gi,
  ];
  
  for (const regex of regexesDocumento) {
    const matchesDocumento = texto.match(regex);
    if (matchesDocumento && matchesDocumento.length > 0) {
      for (const match of matchesDocumento) {
        const doc = match
          .replace(/(?:Nosso N[uú]mero|N[uú]mero do Documento|Nº do Documento|N[°º]\s*Documento|Nr\.\s*do Documento|Documento)[\s:]*/gi, '')
          .trim();
        
        // Validar que não é uma data ou valor muito pequeno
        if (doc.length >= 3 && !doc.includes('/') && !doc.match(/^\d{2}$/)) {
          resultado.numeroDocumento = doc;
          console.log('📄 Número do documento encontrado:', doc);
          break;
        }
      }
      if (resultado.numeroDocumento) break;
    }
  }
  
  // Se não encontrou, procurar por sequência de dígitos isolada perto de "Documento"
  if (!resultado.numeroDocumento) {
    const textoLinhas = texto.split('\n');
    for (let i = 0; i < textoLinhas.length; i++) {
      const linha = textoLinhas[i];
      if (linha.includes('Documento') && !linha.includes('Valor do Documento')) {
        // Procurar número na mesma linha ou próxima
        const matchNum = linha.match(/\b(\d{5,})\b/);
        if (matchNum) {
          resultado.numeroDocumento = matchNum[1];
          console.log('📄 Número do documento encontrado (linha):', matchNum[1]);
          break;
        }
      }
    }
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
    
    console.log('✅ Dados extraídos do PDF:', {
      temCodigoBarras: !!dados.codigoBarras,
      temLinhaDigitavel: !!dados.linhaDigitavel,
      valor: dados.valor,
      vencimento: dados.vencimento,
      beneficiario: dados.beneficiario?.substring(0, 30) + '...',
      numeroDocumento: dados.numeroDocumento,
    });
    
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
