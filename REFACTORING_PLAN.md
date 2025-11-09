# Plano de Refatoração - Meus Boletos

## 📋 Análise Atual

### Problemas Identificados

1. **BoletoForm.tsx é muito grande** (355+ linhas)
   - Múltiplas responsabilidades
   - Lógica de negócio misturada com UI
   - Difícil manutenção e testes

2. **Falta de componentização**
   - Upload de PDF poderia ser um componente separado
   - Validação e exibição de resultados misturadas
   - Campos de formulário não reutilizáveis

3. **Hooks customizados ausentes**
   - Lógica de processamento de PDF não isolada
   - Estado do formulário espalhado
   - Validações não reutilizáveis

4. **Falta de contextos**
   - Boletos gerenciados diretamente nas páginas
   - Sem provider para estado global
   - Dificulta compartilhamento de dados

5. **Testes impossíveis**
   - Componentes muito acoplados
   - Lógica não isolada
   - Dependências difíceis de mockar

---

## 🎯 Estrutura Proposta

```
src/
├── components/
│   ├── boleto/                          # Componentes de boleto
│   │   ├── BoletoCard/
│   │   │   ├── index.tsx
│   │   │   ├── BoletoCard.tsx
│   │   │   ├── BoletoActions.tsx       # Ações (editar, excluir, pagar)
│   │   │   └── BoletoDetails.tsx       # Detalhes expandidos
│   │   ├── BoletoForm/
│   │   │   ├── index.tsx
│   │   │   ├── BoletoForm.tsx          # Container principal
│   │   │   ├── CodeInput.tsx           # Input de código
│   │   │   ├── ValidationDisplay.tsx   # Exibição de validação
│   │   │   ├── FormFields.tsx          # Campos do formulário
│   │   │   └── ManualModeAlert.tsx     # Alerta de modo manual
│   │   ├── BoletoList/
│   │   │   ├── index.tsx
│   │   │   ├── BoletoList.tsx
│   │   │   ├── BoletoFilter.tsx        # Filtros e busca
│   │   │   ├── BoletoSort.tsx          # Ordenação
│   │   │   └── EmptyState.tsx          # Estado vazio
│   │   └── PDFUpload/
│   │       ├── index.tsx
│   │       ├── PDFUpload.tsx           # Upload de PDF
│   │       ├── PDFDropzone.tsx         # Área de drag & drop
│   │       └── PDFPreview.tsx          # Preview do PDF
│   ├── common/                          # Componentes comuns
│   │   ├── ErrorBoundary.tsx
│   │   ├── Loading.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── ConfirmDialog.tsx
│   └── ui/                              # Chakra UI wrappers
│       └── ...
├── hooks/
│   ├── useBoletos.ts                    # Hook para gerenciar boletos
│   ├── useBoletoForm.ts                 # Hook para formulário
│   ├── usePDFUpload.ts                  # Hook para upload PDF
│   ├── useBoletoValidation.ts           # Hook para validação
│   ├── useLocalStorage.ts               # Hook genérico de storage
│   └── useDebounce.ts                   # Hook de debounce
├── context/
│   ├── BoletoContext.tsx                # Contexto de boletos
│   └── ThemeContext.tsx                 # Contexto de tema (futuro)
├── services/
│   ├── pdf/
│   │   ├── pdfExtractor.ts              # Extração de PDF
│   │   ├── pdfValidator.ts              # Validação de PDF
│   │   └── index.ts
│   ├── boleto/
│   │   ├── boletoParser.ts              # Parser de códigos
│   │   ├── boletoValidator.ts           # Validação de boletos
│   │   ├── boletoFormatter.ts           # Formatação
│   │   └── index.ts
│   ├── storage/
│   │   ├── storage.ts                   # Storage genérico
│   │   ├── boletoStorage.ts             # Storage específico
│   │   └── index.ts
│   └── index.ts
├── utils/
│   ├── date.ts                          # Utilitários de data
│   ├── format.ts                        # Formatação (moeda, etc)
│   ├── validation.ts                    # Validações genéricas
│   └── constants.ts                     # Constantes
├── types/
│   ├── boleto.ts                        # Types de boleto
│   ├── pdf.ts                           # Types de PDF
│   ├── form.ts                          # Types de formulário
│   └── index.ts
└── pages/
    ├── Home/
    │   ├── index.tsx
    │   └── Home.tsx
    └── ...
```

---

## 🔄 Refatorações Prioritárias

### Fase 1: Hooks Customizados (Alta Prioridade)

#### 1.1. `useBoletos` - Gerenciamento de Estado

```typescript
// src/hooks/useBoletos.ts
import { useState, useEffect, useCallback } from 'react';
import * as boletoStorage from '../services/storage/boletoStorage';
import { Boleto, CreateBoletoInput } from '../types';

export function useBoletos() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar boletos
  useEffect(() => {
    try {
      const loaded = boletoStorage.loadBoletos();
      setBoletos(loaded);
    } catch (err) {
      setError('Erro ao carregar boletos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Adicionar boleto
  const addBoleto = useCallback((input: CreateBoletoInput) => {
    try {
      const novoBoleto = boletoStorage.addBoleto(input);
      setBoletos(prev => [...prev, novoBoleto]);
      return novoBoleto;
    } catch (err) {
      setError('Erro ao adicionar boleto');
      throw err;
    }
  }, []);

  // Atualizar boleto
  const updateBoleto = useCallback((id: string, updates: Partial<Boleto>) => {
    try {
      const atualizado = boletoStorage.updateBoleto(id, updates);
      setBoletos(prev => prev.map(b => b.id === id ? atualizado : b));
      return atualizado;
    } catch (err) {
      setError('Erro ao atualizar boleto');
      throw err;
    }
  }, []);

  // Deletar boleto
  const deleteBoleto = useCallback((id: string) => {
    try {
      boletoStorage.deleteBoleto(id);
      setBoletos(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      setError('Erro ao deletar boleto');
      throw err;
    }
  }, []);

  // Marcar como pago
  const markAsPaid = useCallback((id: string) => {
    return updateBoleto(id, { status: 'pago' });
  }, [updateBoleto]);

  return {
    boletos,
    isLoading,
    error,
    addBoleto,
    updateBoleto,
    deleteBoleto,
    markAsPaid,
  };
}
```

#### 1.2. `usePDFUpload` - Upload e Extração

```typescript
// src/hooks/usePDFUpload.ts
import { useState, useCallback } from 'react';
import { extrairDadosDoBoleto, validarArquivoPDF } from '../services/pdf';
import { BoletoExtraido } from '../types';

interface UsePDFUploadResult {
  isUploading: boolean;
  error: string | null;
  uploadedData: BoletoExtraido | null;
  handleUpload: (file: File) => Promise<BoletoExtraido>;
  reset: () => void;
}

export function usePDFUpload(): UsePDFUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<BoletoExtraido | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    // Validar arquivo
    const validacao = validarArquivoPDF(file);
    if (!validacao.valido) {
      const errorMsg = validacao.erro || 'Arquivo inválido';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsUploading(true);
    setError(null);

    try {
      // Extrair dados do PDF
      const dados = await extrairDadosDoBoleto(file);
      setUploadedData(dados);
      return dados;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar PDF';
      setError(errorMsg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setError(null);
    setUploadedData(null);
  }, []);

  return {
    isUploading,
    error,
    uploadedData,
    handleUpload,
    reset,
  };
}
```

#### 1.3. `useBoletoValidation` - Validação de Códigos

```typescript
// src/hooks/useBoletoValidation.ts
import { useState, useCallback } from 'react';
import { parseBoleto } from '../services/boleto';
import { BoletoParseResult } from '../types';

interface UseBoletoValidationResult {
  isValidating: boolean;
  result: BoletoParseResult | null;
  error: string | null;
  validate: (codigo: string) => BoletoParseResult;
  reset: () => void;
}

export function useBoletoValidation(): UseBoletoValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<BoletoParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((codigo: string) => {
    if (!codigo.trim()) {
      const errorMsg = 'Digite o código do boleto';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsValidating(true);
    setError(null);

    try {
      const parseResult = parseBoleto(codigo);
      
      if (!parseResult.isValid) {
        setError(parseResult.error || 'Código inválido');
      }
      
      setResult(parseResult);
      return parseResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao validar código';
      setError(errorMsg);
      throw err;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsValidating(false);
    setResult(null);
    setError(null);
  }, []);

  return {
    isValidating,
    result,
    error,
    validate,
    reset,
  };
}
```

#### 1.4. `useBoletoForm` - Gerenciamento do Formulário

```typescript
// src/hooks/useBoletoForm.ts
import { useState, useCallback } from 'react';
import { CreateBoletoInput } from '../types';
import { usePDFUpload } from './usePDFUpload';
import { useBoletoValidation } from './useBoletoValidation';

interface UseBoletoFormResult {
  // Estado
  formData: Partial<CreateBoletoInput>;
  modoManual: boolean;
  
  // PDF Upload
  pdfUpload: ReturnType<typeof usePDFUpload>;
  
  // Validação
  validation: ReturnType<typeof useBoletoValidation>;
  
  // Ações
  setField: (field: keyof CreateBoletoInput, value: any) => void;
  setModoManual: (value: boolean) => void;
  handlePDFUpload: (file: File) => Promise<void>;
  handleCodeValidation: () => void;
  reset: () => void;
  canSubmit: () => boolean;
}

export function useBoletoForm(): UseBoletoFormResult {
  const [formData, setFormData] = useState<Partial<CreateBoletoInput>>({});
  const [modoManual, setModoManual] = useState(false);
  
  const pdfUpload = usePDFUpload();
  const validation = useBoletoValidation();

  const setField = useCallback((field: keyof CreateBoletoInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePDFUpload = useCallback(async (file: File) => {
    try {
      const dados = await pdfUpload.handleUpload(file);
      
      // Preencher formulário com dados extraídos
      if (dados.codigoBarras || dados.linhaDigitavel) {
        const codigo = dados.codigoBarras || dados.linhaDigitavel;
        setField('codigoBarras', codigo);
        
        // Validar código
        const result = validation.validate(codigo!);
        
        if (result.isValid) {
          // Mesclar dados do PDF com resultado da validação
          setFormData({
            codigoBarras: result.codigoBarras,
            linhaDigitavel: result.linhaDigitavel,
            valor: dados.valor ?? result.valor,
            vencimento: dados.vencimento || result.vencimento?.toISOString(),
            banco: result.banco,
            beneficiario: dados.beneficiario,
          });
        }
      }
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
    }
  }, [pdfUpload, validation, setField]);

  const handleCodeValidation = useCallback(() => {
    if (!formData.codigoBarras) {
      throw new Error('Código não informado');
    }
    
    validation.validate(formData.codigoBarras);
  }, [formData.codigoBarras, validation]);

  const reset = useCallback(() => {
    setFormData({});
    setModoManual(false);
    pdfUpload.reset();
    validation.reset();
  }, [pdfUpload, validation]);

  const canSubmit = useCallback(() => {
    if (modoManual) {
      return !!formData.descricao;
    }
    return validation.result?.isValid && !!formData.descricao;
  }, [modoManual, formData.descricao, validation.result]);

  return {
    formData,
    modoManual,
    pdfUpload,
    validation,
    setField,
    setModoManual,
    handlePDFUpload,
    handleCodeValidation,
    reset,
    canSubmit,
  };
}
```

---

### Fase 2: Componentes Menores (Média Prioridade)

#### 2.1. PDFUpload Component

```typescript
// src/components/boleto/PDFUpload/PDFUpload.tsx
import { useRef } from 'react';
import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';

interface PDFUploadProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function PDFUpload({ onUpload, isLoading, disabled }: PDFUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Limpar input para permitir upload do mesmo arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        colorScheme="purple"
        width="full"
        loading={isLoading}
        disabled={disabled}
      >
        <HStack>
          <FiUpload />
          <Text>{isLoading ? 'Processando PDF...' : 'Upload de Boleto PDF'}</Text>
        </HStack>
      </Button>
    </Box>
  );
}
```

#### 2.2. CodeInput Component

```typescript
// src/components/boleto/BoletoForm/CodeInput.tsx
import { Box, Input, Text, Button } from '@chakra-ui/react';
import { Field } from '../../ui/field';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  isValidating?: boolean;
  disabled?: boolean;
}

export function CodeInput({ 
  value, 
  onChange, 
  onValidate, 
  isValidating, 
  disabled 
}: CodeInputProps) {
  return (
    <>
      <Field label="Código do Boleto" required>
        <Input
          placeholder="Digite ou cole o código de barras ou linha digitável"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fontFamily="mono"
          disabled={disabled}
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          44 dígitos (código de barras) ou 47 dígitos (linha digitável)
        </Text>
      </Field>

      <Button
        variant="outline"
        onClick={onValidate}
        colorScheme="blue"
        width="full"
        loading={isValidating}
        disabled={!value.trim() || disabled}
      >
        Processar Código
      </Button>
    </>
  );
}
```

#### 2.3. ValidationDisplay Component

```typescript
// src/components/boleto/BoletoForm/ValidationDisplay.tsx
import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import { formatarLinhaDigitavel } from '../../../services/boleto';
import { BoletoParseResult } from '../../../types';

interface ValidationDisplayProps {
  result: BoletoParseResult;
}

export function ValidationDisplay({ result }: ValidationDisplayProps) {
  if (!result.isValid) {
    return null;
  }

  return (
    <Box p={4} bg="green.50" borderRadius="md" borderWidth={1} borderColor="green.200">
      <VStack align="stretch" gap={2}>
        <Text fontWeight="bold" color="green.700">✓ Código válido!</Text>
        
        {result.banco && (
          <HStack>
            <Text fontWeight="semibold">Banco:</Text>
            <Text>{result.banco}</Text>
          </HStack>
        )}
        
        {result.valor && (
          <HStack>
            <Text fontWeight="semibold">Valor:</Text>
            <Text>R$ {result.valor.toFixed(2).replace('.', ',')}</Text>
          </HStack>
        )}
        
        {result.vencimento && (
          <HStack>
            <Text fontWeight="semibold">Vencimento:</Text>
            <Text>{new Date(result.vencimento).toLocaleDateString('pt-BR')}</Text>
          </HStack>
        )}
        
        <Box>
          <Text fontWeight="semibold">Linha Digitável:</Text>
          <Text fontSize="sm" fontFamily="mono">
            {formatarLinhaDigitavel(result.linhaDigitavel)}
          </Text>
        </Box>
      </VStack>
    </Box>
  );
}
```

---

### Fase 3: Context API (Média Prioridade)

#### 3.1. BoletoContext

```typescript
// src/context/BoletoContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { useBoletos } from '../hooks/useBoletos';

type BoletoContextType = ReturnType<typeof useBoletos>;

const BoletoContext = createContext<BoletoContextType | undefined>(undefined);

export function BoletoProvider({ children }: { children: ReactNode }) {
  const boletos = useBoletos();
  
  return (
    <BoletoContext.Provider value={boletos}>
      {children}
    </BoletoContext.Provider>
  );
}

export function useBoletoContext() {
  const context = useContext(BoletoContext);
  if (!context) {
    throw new Error('useBoletoContext must be used within BoletoProvider');
  }
  return context;
}
```

---

### Fase 4: Utilitários (Baixa Prioridade)

#### 4.1. Formatação

```typescript
// src/utils/format.ts
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}
```

#### 4.2. Validação

```typescript
// src/utils/validation.ts
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  // Implementar validação completa
  return true;
}

export function isValidDate(date: string): boolean {
  const d = new Date(date);
  return !isNaN(d.getTime());
}

export function isValidCode(code: string): boolean {
  const cleaned = code.replace(/\D/g, '');
  return cleaned.length === 44 || cleaned.length === 47;
}
```

---

## 📊 Cronograma de Implementação

### Sprint 1 (1 semana)
- [ ] Criar hooks customizados
- [ ] Testar hooks isoladamente
- [ ] Documentar APIs dos hooks

### Sprint 2 (1 semana)
- [ ] Refatorar BoletoForm usando hooks
- [ ] Criar componentes menores (PDFUpload, CodeInput, etc)
- [ ] Criar testes unitários para componentes

### Sprint 3 (1 semana)
- [ ] Implementar BoletoContext
- [ ] Refatorar páginas para usar contexto
- [ ] Criar utilitários de formatação e validação

### Sprint 4 (1 semana)
- [ ] Remover código legado
- [ ] Otimizar performance
- [ ] Documentar nova arquitetura
- [ ] Code review e ajustes finais

---

## ✅ Benefícios da Refatoração

### 1. **Manutenibilidade**
- Componentes menores e focados
- Responsabilidades bem definidas
- Fácil localização de bugs

### 2. **Testabilidade**
- Hooks isolados podem ser testados unitariamente
- Componentes menores facilitam testes
- Mocks mais simples

### 3. **Reutilização**
- Hooks podem ser usados em múltiplos componentes
- Componentes UI genéricos
- Lógica de negócio centralizada

### 4. **Performance**
- Componentes menores re-renderizam menos
- Context API evita prop drilling
- Memoization mais efetiva

### 5. **Escalabilidade**
- Fácil adicionar novos recursos
- Estrutura clara para novos desenvolvedores
- Padrões consistentes

---

## 🚀 Próximos Passos

1. **Revisar este plano** com o time
2. **Começar pelos hooks** (maior impacto, menor risco)
3. **Refatorar incrementalmente** (não tudo de uma vez)
4. **Manter testes** em paralelo
5. **Documentar mudanças** no README

---

## 📚 Referências

- [React Hooks Patterns](https://reactpatterns.com/)
- [Clean Code React](https://github.com/ryanmcdermott/clean-code-javascript)
- [Component Composition](https://reactjs.org/docs/composition-vs-inheritance.html)
- [Context Best Practices](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
