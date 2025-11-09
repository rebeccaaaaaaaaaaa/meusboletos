# Documentação Técnica - Meus Boletos

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Integração com PDF](#integração-com-pdf)
6. [Extração de Dados de Boletos](#extração-de-dados-de-boletos)
7. [Validação e Processamento](#validação-e-processamento)
8. [Armazenamento de Dados](#armazenamento-de-dados)
9. [Fluxo de Dados](#fluxo-de-dados)
10. [Desafios e Soluções](#desafios-e-soluções)

---

## Visão Geral

**Meus Boletos** é uma aplicação web React para gerenciamento de boletos bancários. O sistema permite aos usuários:
- ✅ Fazer upload de PDFs de boletos e extrair automaticamente os dados
- ✅ Inserir códigos de boletos manualmente (código de barras ou linha digitável)
- ✅ Visualizar, editar e organizar boletos
- ✅ Armazenar dados localmente no navegador (localStorage)

### Principais Funcionalidades
- **Upload de PDF**: Extração automática de código, valor, vencimento, beneficiário
- **Validação de Códigos**: Validação de dígitos verificadores usando módulo 10 e 11
- **Modo Manual**: Fallback para boletos com códigos inválidos
- **Persistência Local**: Dados salvos no localStorage do navegador

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   Interface (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ BoletoForm   │  │ BoletoCard   │  │ BoletoList   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Camada de Serviços                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │pdfExtractor  │  │boletoParser  │  │   storage    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  Bibliotecas Externas                    │
│              ┌──────────────────────┐                    │
│              │     pdfjs-dist       │                    │
│              └──────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     localStorage                         │
└─────────────────────────────────────────────────────────┘
```

---

## Tecnologias Utilizadas

### Frontend
- **React 19.1.1**: Framework para construção da interface
- **TypeScript**: Tipagem estática e segurança de tipos
- **Chakra UI v3**: Biblioteca de componentes UI
- **React Router**: Navegação entre páginas
- **Vite**: Build tool e dev server

### Extração de PDF
- **pdfjs-dist 5.4.394**: Biblioteca Mozilla para leitura e parsing de PDFs
- **PDF.js Worker**: Worker thread para processamento assíncrono

### Processamento de Dados
- **Regex (Regular Expressions)**: Extração de padrões de texto
- **Algoritmos de Validação**: Módulo 10 e Módulo 11 para dígitos verificadores

---

## Estrutura do Projeto

```
meusboletos/
├── src/
│   ├── components/
│   │   ├── BoletoForm.tsx       # Formulário de upload/inserção
│   │   ├── BoletoCard.tsx       # Card de exibição de boleto
│   │   ├── BoletoList.tsx       # Lista de boletos
│   │   └── ui/                  # Componentes Chakra UI
│   ├── services/
│   │   ├── pdfExtractor.ts      # Extração de dados do PDF ⭐
│   │   ├── boletoParser.ts      # Validação de códigos ⭐
│   │   ├── storage.ts           # Persistência localStorage
│   │   └── index.ts             # Export barrel
│   ├── pages/
│   │   └── Home.tsx             # Página principal
│   ├── types/
│   │   └── index.ts             # Definições TypeScript
│   └── App.tsx                  # Componente raiz
├── public/                      # Arquivos estáticos
├── package.json
└── vite.config.ts
```

---

## Integração com PDF

### 1. Configuração do PDF.js

#### Instalação
```bash
npm install pdfjs-dist@5.4.394
```

#### Configuração do Worker
```typescript
// src/services/pdfExtractor.ts
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker local (não CDN)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
```

**Por que usar worker local?**
- Evita problemas de CORS com CDNs
- Funciona offline
- Mais confiável em ambientes de produção

### 2. Extração de Texto do PDF

```typescript
async function extrairTextoDoPDF(file: File): Promise<string> {
  // 1. Converter File para ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // 2. Carregar documento PDF
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let textoCompleto = '';
  
  // 3. Iterar sobre todas as páginas
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // 4. Extrair texto de cada item
    const pageText = textContent.items
      .map((item: any) => item.str)
      .filter((str: string) => str.trim().length > 0)
      .join(' ');
    
    textoCompleto += pageText + '\n';
  }
  
  return textoCompleto;
}
```

**Processo:**
1. Converte o arquivo PDF em ArrayBuffer
2. Usa PDF.js para carregar o documento
3. Itera sobre cada página
4. Extrai itens de texto usando `getTextContent()`
5. Junta tudo em uma string

### 3. Validação do Arquivo

```typescript
export function validarArquivoPDF(file: File): { valido: boolean; erro?: string } {
  // Verificar tipo
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valido: false, erro: 'O arquivo deve ser um PDF' };
  }
  
  // Verificar tamanho (máx 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valido: false, erro: 'O arquivo é muito grande. Máximo: 10MB' };
  }
  
  // Verificar se não está vazio
  if (file.size === 0) {
    return { valido: false, erro: 'O arquivo está vazio' };
  }
  
  return { valido: true };
}
```

---

## Extração de Dados de Boletos

### 1. Interface de Dados Extraídos

```typescript
export interface BoletoExtraido {
  codigoBarras?: string;        // 44 dígitos
  linhaDigitavel?: string;      // 47 dígitos
  valor?: number;               // Valor em reais
  vencimento?: string;          // Formato: YYYY-MM-DD
  beneficiario?: string;        // Nome + CNPJ
  pagador?: string;             // Nome do pagador
  numeroDocumento?: string;     // Número do documento
}
```

### 2. Extração da Linha Digitável

A linha digitável tem 47 dígitos no formato:
```
AAAAA.AAAAA BBBBB.BBBBBB CCCCC.CCCCCC D FFFFVVVVVVVVVV
```

Onde:
- **AAAAA.AAAAA**: Banco (3) + Moeda (1) + 5 dígitos do campo livre + DV
- **BBBBB.BBBBBB**: 10 dígitos do campo livre + DV
- **CCCCC.CCCCCC**: 10 dígitos do campo livre + DV
- **D**: Dígito verificador geral
- **FFFF**: Fator de vencimento (4 dígitos)
- **VVVVVVVVVV**: Valor (10 dígitos, em centavos)

```typescript
const regexLinha = /\d{5}[\.\s]+\d{5}[\.\s]+\d{5}[\.\s]+\d{6}[\.\s]+\d{5}[\.\s]+\d{6}[\.\s]+\d[\.\s]+\d{14}/g;
const matchesLinha = texto.match(regexLinha);

if (matchesLinha && matchesLinha.length > 0) {
  const linhaLimpa = matchesLinha[0].replace(/[^\d]/g, '');
  if (linhaLimpa.length === 47) {
    resultado.linhaDigitavel = linhaLimpa;
  }
}
```

### 3. Reconstrução do Código de Barras

O código de barras tem 44 dígitos e é reconstruído a partir da linha digitável:

```typescript
// Linha digitável: 10491212034100010004400000042499112400000058333
// Posições:        0-9 | 10-20 | 21-31 | 32 | 33-46

const codigoBarras = 
  linha.substring(0, 4) +       // Banco (3) + Moeda (1) - pos 0-3
  linha.substring(32, 33) +     // DV geral - pos 32
  linha.substring(33, 37) +     // Fator vencimento - pos 33-36
  linha.substring(37, 47) +     // Valor (10 dígitos) - pos 37-46
  linha.substring(4, 9) +       // Campo livre parte 1 - pos 4-8
  linha.substring(10, 20) +     // Campo livre parte 2 - pos 10-19
  linha.substring(21, 31);      // Campo livre parte 3 - pos 21-30
```

**Estrutura do Código de Barras (44 dígitos):**
```
Posição  | Campo
---------|----------------------------------
0-2      | Código do banco (ex: 104 = CEF)
3        | Código da moeda (9 = Real)
4        | Dígito verificador geral
5-8      | Fator de vencimento
9-18     | Valor (em centavos, 10 dígitos)
19-43    | Campo livre (25 dígitos)
```

### 4. Extração do Valor

```typescript
// Extrair da linha digitável (mais confiável)
const valorStr = linha.substring(37, 47); // Últimos 10 dígitos
const valorNum = parseInt(valorStr);
resultado.valor = valorNum / 100; // Converter centavos para reais

// Exemplo: "0000058333" → 58333 → 583.33
```

### 5. Extração do Vencimento

**Problema:** O fator de vencimento mudou em 2025 devido a novas regras da FEBRABAN.

**Solução:** Extrair diretamente do texto do PDF

```typescript
const regexesVencimento = [
  /Vencimento[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
  /(?:VENCIMENTO|Data de Vencimento)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
  /\d{2}\/\d{2}\/\d{4}/g, // Fallback: qualquer data
];

for (const regex of regexesVencimento) {
  const matchVencimento = texto.match(regex);
  if (matchVencimento && matchVencimento[0]) {
    const dataMatch = matchVencimento[0].match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (dataMatch) {
      const [dia, mes, ano] = dataMatch[0].split(/[\/\-]/);
      resultado.vencimento = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
      break;
    }
  }
}
```

**Formato de saída:** `YYYY-MM-DD` (ex: `2025-10-20`)

### 6. Extração do Beneficiário

```typescript
// Procurar padrão: NOME COMPLETO + CNPJ
const regexCNPJ = /([A-ZÇÃÕÁÉÍÓÚ][A-Z\s]+?(?:LTDA|S\.A\.|SPE|EIRELI|ME|EPP)?)\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})/gi;

const matchesCNPJ = texto.match(regexCNPJ);

if (matchesCNPJ && matchesCNPJ.length > 0) {
  for (const match of matchesCNPJ) {
    const partes = match.trim().split(/\s+(?=\d{2}\.\d{3})/);
    if (partes.length >= 2) {
      const nome = partes[0].trim();
      const cnpj = partes[1].trim();
      
      // Validar que é um nome válido
      if (nome.length >= 10 && 
          !nome.includes('Local de Pagamento') && 
          !nome.includes('Endereço')) {
        resultado.beneficiario = `${nome} ${cnpj}`;
        break;
      }
    }
  }
}
```

**Exemplo:** `CASA UN MIRAVISTA EMPREENDIMENTOS IMOBILIARIOS SPE 50.733.941/0001-02`

### 7. Extração do Número do Documento

```typescript
const regexesDocumento = [
  /(?:Nosso N[uú]mero|Nº do Documento)[\s:]*(\d+[\-\/]?\d*)/gi,
  /(?:Nr\.\s*do Documento|Número do Documento)[\s:]*(\d+[\-\/]?\d*)/gi,
  /(?:Documento)[\s:]+(\d{5,}[\-\/]?\d*)/gi,
];

for (const regex of regexesDocumento) {
  const matchesDocumento = texto.match(regex);
  if (matchesDocumento && matchesDocumento.length > 0) {
    for (const match of matchesDocumento) {
      const doc = match
        .replace(/(?:Nosso N[uú]mero|N[uú]mero do Documento|Nº do Documento|Documento)[\s:]*/gi, '')
        .trim();
      
      // Validar que não é uma data ou valor muito pequeno
      if (doc.length >= 3 && !doc.includes('/') && !doc.match(/^\d{2}$/)) {
        resultado.numeroDocumento = doc;
        break;
      }
    }
    if (resultado.numeroDocumento) break;
  }
}
```

---

## Validação e Processamento

### 1. Algoritmo de Módulo 10

Usado para validar os campos da linha digitável:

```typescript
function calcularDVModulo10(numero: string): number {
  let soma = 0;
  let peso = 2;

  // Percorrer da direita para esquerda
  for (let i = numero.length - 1; i >= 0; i--) {
    const multiplicacao = parseInt(numero[i]) * peso;
    soma += multiplicacao > 9 
      ? Math.floor(multiplicacao / 10) + (multiplicacao % 10) 
      : multiplicacao;
    peso = peso === 2 ? 1 : 2;
  }

  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}
```

**Como funciona:**
1. Multiplica cada dígito por 2 ou 1 alternadamente (da direita para esquerda)
2. Se resultado > 9, soma os dígitos (ex: 14 → 1+4 = 5)
3. Soma todos os resultados
4. DV = 10 - (soma % 10)

### 2. Algoritmo de Módulo 11

Usado para validar o código de barras:

```typescript
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
```

**Como funciona:**
1. Multiplica cada dígito por 2 a 9 ciclicamente (da direita para esquerda)
2. Soma todos os resultados
3. DV = 11 - (soma % 11)
4. Se DV = 0, 10 ou 11, usar 1

### 3. Validação da Linha Digitável

```typescript
function validarLinhaDigitavel(linha: string): boolean {
  const limpa = limparCodigo(linha);
  
  if (limpa.length !== 47) {
    return false;
  }

  // Validar cada campo
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
```

### 4. Validação do Código de Barras

```typescript
function validarCodigoBarras(codigoBarras: string): boolean {
  const limpa = limparCodigo(codigoBarras);
  
  if (limpa.length !== 44) {
    return false;
  }

  // Extrair DV (posição 4)
  const dv = parseInt(limpa.substring(4, 5));
  
  // Montar código sem o DV
  const codigoSemDV = limpa.substring(0, 4) + limpa.substring(5, 44);
  
  // Calcular DV
  const dvCalculado = calcularDVModulo11(codigoSemDV);

  return dv === dvCalculado;
}
```

---

## Armazenamento de Dados

### 1. Estrutura de Dados

```typescript
export interface Boleto {
  id: string;                    // UUID v4
  codigoBarras: string;          // 44 dígitos
  linhaDigitavel: string;        // 47 dígitos
  descricao: string;             // Descrição do usuário
  valor: number;                 // Valor em reais
  vencimento: Date;              // Data de vencimento
  banco: string;                 // Nome do banco
  beneficiario?: string;         // Opcional
  observacoes?: string;          // Opcional
  status: 'pendente' | 'pago';   // Status do pagamento
  dataCriacao: Date;             // Data de criação
  dataAtualizacao: Date;         // Última atualização
}
```

### 2. Operações de Storage

```typescript
// Salvar boletos
export function saveBoletos(boletos: Boleto[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boletos));
}

// Carregar boletos
export function loadBoletos(): Boleto[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  
  const boletos = JSON.parse(data);
  
  // Converter strings para Date
  return boletos.map((b: any) => ({
    ...b,
    vencimento: new Date(b.vencimento),
    dataCriacao: new Date(b.dataCriacao),
    dataAtualizacao: new Date(b.dataAtualizacao),
  }));
}

// Adicionar novo boleto
export function addBoleto(input: CreateBoletoInput): Boleto {
  const boletos = loadBoletos();
  
  const novoBoleto: Boleto = {
    id: crypto.randomUUID(),
    ...input,
    vencimento: new Date(input.vencimento),
    status: 'pendente',
    dataCriacao: new Date(),
    dataAtualizacao: new Date(),
  };
  
  boletos.push(novoBoleto);
  saveBoletos(boletos);
  
  return novoBoleto;
}
```

---

## Fluxo de Dados

### Upload de PDF

```
┌─────────────────┐
│ Usuário seleciona│
│  arquivo PDF    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ validarArquivoPDF()     │
│ - Verifica tipo         │
│ - Verifica tamanho      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ extrairTextoDoPDF()     │
│ - Carrega PDF           │
│ - Extrai texto páginas  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ extrairCodigosDoTexto() │
│ - Linha digitável       │
│ - Código de barras      │
│ - Valor                 │
│ - Vencimento            │
│ - Beneficiário          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ parseBoleto()           │
│ - Valida código         │
│ - Extrai dados          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Mesclar dados           │
│ - Prioriza dados PDF    │
│ - Usa validação parser  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Preenche formulário     │
│ - Código                │
│ - Valor                 │
│ - Vencimento            │
│ - Beneficiário          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Usuário confirma        │
│ e salva boleto          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ addBoleto()             │
│ Salva no localStorage   │
└─────────────────────────┘
```

### Inserção Manual

```
┌─────────────────┐
│ Usuário digita  │
│  código manual  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ parseBoleto()           │
│ - Limpa código          │
│ - Valida formato        │
│ - Valida DVs            │
└────────┬────────────────┘
         │
         ▼
    ┌───┴────┐
    │ Válido?│
    └───┬────┘
        │
   ┌────┴────┐
   │Sim │ Não│
   ▼    │    ▼
┌──────┐│┌──────────────┐
│Mostra││ Modo Manual  │
│dados ││ (opcional)   │
└──┬───┘│└───────┬──────┘
   │    │        │
   └────┴────────┘
        │
        ▼
┌─────────────────────────┐
│ Usuário preenche        │
│ campos e salva          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ addBoleto()             │
│ Salva no localStorage   │
└─────────────────────────┘
```

---

## Desafios e Soluções

### 1. ❌ Worker do PDF.js via CDN falhando

**Problema:** Erro de CORS ao tentar carregar worker de CDN externo

**Solução:** Usar worker local com `import.meta.url`
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
```

### 2. ❌ Fator de vencimento incorreto após 2025

**Problema:** FEBRABAN mudou padrão em 21/02/2025, causando datas erradas

**Solução:** Extrair vencimento diretamente do texto do PDF
```typescript
// Antes: Calcular pela data base + fator
const vencimento = new Date(1997, 9, 7);
vencimento.setDate(vencimento.getDate() + fator);

// Depois: Extrair do texto
const regex = /\d{2}\/\d{2}\/\d{4}/g;
const match = texto.match(regex);
```

### 3. ❌ Problema de fuso horário em datas

**Problema:** `new Date('2025-10-20')` retorna dia anterior devido a UTC

**Solução:** Criar Date com ano, mês, dia separados
```typescript
// Antes:
new Date('2025-10-20') // → 2025-10-19 21:00:00 GMT-3

// Depois:
const [ano, mes, dia] = '2025-10-20'.split('-').map(Number);
new Date(ano, mes - 1, dia) // → 2025-10-20 00:00:00
```

### 4. ❌ Reconstrução incorreta do código de barras

**Problema:** Código tinha 44 dígitos mas estava faltando alguns

**Solução:** Remover DVs dos campos ao reconstruir
```typescript
// Estrutura correta da linha digitável:
// Posições 0-9: campo1 (9 dígitos) + DV (1)
// Posições 10-20: campo2 (10 dígitos) + DV (1)
// Posições 21-31: campo3 (10 dígitos) + DV (1)
// Posição 32: DV geral
// Posições 33-46: fator (4) + valor (10)

const codigoBarras = 
  linha.substring(0, 4) +     // Sem DV
  linha.substring(32, 33) +   // DV geral
  linha.substring(33, 47) +   // Fator + valor
  linha.substring(4, 9) +     // Campo 1 (sem DV na pos 9)
  linha.substring(10, 20) +   // Campo 2 (sem DV na pos 20)
  linha.substring(21, 31);    // Campo 3 (sem DV na pos 31)
```

### 5. ❌ Validação de DV retornando NaN

**Problema:** Sequência multiplicadora muito curta para código de 43 dígitos

**Solução:** Implementar multiplicador cíclico de 2 a 9
```typescript
function calcularDVModulo11(numero: string): number {
  let soma = 0;
  let multiplicador = 2;

  for (let i = numero.length - 1; i >= 0; i--) {
    soma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 9 ? 2 : multiplicador + 1;
  }

  const resto = soma % 11;
  const dv = 11 - resto;
  return (dv === 0 || dv === 10 || dv === 11) ? 1 : dv;
}
```

### 6. ❌ Beneficiário extraindo texto errado

**Problema:** Regex pegava "Local de Pagamento" em vez do nome da empresa

**Solução:** Buscar padrão "Nome + CNPJ" e filtrar textos inválidos
```typescript
const regexCNPJ = /([A-ZÇÃÕÁÉÍÓÚ][A-Z\s]+?(?:SPE|LTDA))\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})/gi;

// Filtrar resultados inválidos
if (nome.length >= 10 && 
    !nome.includes('Local de Pagamento') && 
    !nome.includes('Endereço')) {
  resultado.beneficiario = `${nome} ${cnpj}`;
}
```

---

## Melhorias Futuras

### Técnicas
- [ ] Suporte a OCR para PDFs escaneados
- [ ] Cache de PDFs processados
- [ ] Testes unitários e integração
- [ ] Backend para sincronização multi-dispositivo
- [ ] Export/import de dados (JSON, CSV)

### Funcionalidades
- [ ] Notificações de vencimento
- [ ] Integração com bancos (Pix, pagamento online)
- [ ] Categorização de boletos
- [ ] Relatórios e gráficos
- [ ] Busca e filtros avançados

### UX
- [ ] Modo escuro
- [ ] Suporte a drag-and-drop para PDFs
- [ ] Preview do PDF antes de processar
- [ ] Histórico de pagamentos

---

## Conclusão

O projeto **Meus Boletos** demonstra uma integração completa entre React, TypeScript e PDF.js para criar uma solução prática de gerenciamento de boletos. Os principais destaques técnicos são:

1. **Extração robusta de PDF** usando PDF.js com worker local
2. **Algoritmos de validação** implementados do zero (Módulo 10 e 11)
3. **Regex complexos** para parsing de texto não estruturado
4. **Tratamento de edge cases** (fuso horário, padrões FEBRABAN, etc)
5. **Arquitetura modular** com separação de responsabilidades

A documentação completa do código fonte está disponível através dos comentários inline e da estrutura organizada do projeto.

---

**Autor:** Sistema de Gerenciamento de Boletos  
**Versão:** 1.0.0  
**Última Atualização:** Novembro 2025
