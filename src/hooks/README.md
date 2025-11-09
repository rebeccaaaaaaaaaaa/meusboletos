# Guia de Uso dos Hooks

## 📚 Hooks Disponíveis

### 1. `useBoletos` - Gerenciamento de Boletos

Hook para gerenciar o estado global de boletos e operações CRUD.

```typescript
import { useBoletos } from '../hooks';

function MinhaPagina() {
  const { 
    boletos,           // Lista de boletos
    isLoading,         // Estado de carregamento
    error,             // Mensagem de erro
    addBoleto,         // Adicionar boleto
    updateBoleto,      // Atualizar boleto
    deleteBoleto,      // Deletar boleto
    markAsPaid,        // Marcar como pago
    markAsPending,     // Marcar como pendente
    clearError         // Limpar erro
  } = useBoletos();

  // Usar os dados e funções
  return (
    <div>
      {isLoading && <p>Carregando...</p>}
      {error && <p>Erro: {error}</p>}
      {boletos.map(boleto => (
        <div key={boleto.id}>{boleto.descricao}</div>
      ))}
    </div>
  );
}
```

### 2. `usePDFUpload` - Upload de PDF

Hook para gerenciar upload e extração de dados de PDFs.

```typescript
import { usePDFUpload } from '../hooks';

function PDFUploadComponent() {
  const {
    isUploading,       // Estado de upload
    error,             // Mensagem de erro
    uploadedData,      // Dados extraídos
    handleUpload,      // Função de upload
    reset              // Resetar estado
  } = usePDFUpload();

  const onFileSelect = async (file: File) => {
    try {
      const dados = await handleUpload(file);
      console.log('Dados extraídos:', dados);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => onFileSelect(e.target.files[0])} />
      {isUploading && <p>Processando PDF...</p>}
      {error && <p>Erro: {error}</p>}
    </div>
  );
}
```

### 3. `useBoletoValidation` - Validação de Códigos

Hook para validar códigos de boletos.

```typescript
import { useBoletoValidation } from '../hooks';

function CodeValidator() {
  const {
    isValidating,      // Estado de validação
    result,            // Resultado da validação
    error,             // Mensagem de erro
    validate,          // Função de validação
    reset              // Resetar estado
  } = useBoletoValidation();

  const handleValidate = (codigo: string) => {
    try {
      const resultado = validate(codigo);
      if (resultado.isValid) {
        console.log('Código válido:', resultado);
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  return (
    <div>
      {result?.isValid && (
        <div>
          <p>Banco: {result.banco}</p>
          <p>Valor: R$ {result.valor?.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
```

### 4. `useBoletoForm` - Formulário Completo

Hook principal que orquestra todos os outros hooks.

```typescript
import { useBoletoForm } from '../hooks';

function BoletoFormRefactored() {
  const {
    formData,              // Dados do formulário
    modoManual,            // Modo manual ativo?
    pdfUpload,             // Hook de PDF
    validation,            // Hook de validação
    setField,              // Atualizar campo
    setModoManual,         // Ativar modo manual
    handlePDFUpload,       // Processar PDF
    handleCodeValidation,  // Validar código
    reset,                 // Resetar tudo
    canSubmit,             // Pode submeter?
    getSubmitData          // Obter dados para envio
  } = useBoletoForm();

  const onSubmit = () => {
    if (canSubmit()) {
      const data = getSubmitData();
      // Enviar dados...
    }
  };

  return (
    <form>
      {/* Upload de PDF */}
      <PDFUpload onUpload={handlePDFUpload} isLoading={pdfUpload.isUploading} />
      
      {/* Input de código */}
      <input
        value={formData.codigoBarras || ''}
        onChange={(e) => setField('codigoBarras', e.target.value)}
      />
      
      {/* Botão de validação */}
      <button onClick={handleCodeValidation}>
        Validar Código
      </button>
      
      {/* Exibir resultado */}
      {validation.result?.isValid && (
        <div>Código válido!</div>
      )}
      
      {/* Campo de descrição */}
      <input
        value={formData.descricao || ''}
        onChange={(e) => setField('descricao', e.target.value)}
        placeholder="Descrição"
      />
      
      {/* Submit */}
      <button onClick={onSubmit} disabled={!canSubmit()}>
        Salvar Boleto
      </button>
    </form>
  );
}
```

## 🎯 Exemplo Completo: Refatorando BoletoForm

### Antes (355 linhas, tudo misturado):

```typescript
export function BoletoForm({ onSubmit }: Props) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  // ... muitos outros estados
  
  const handleUploadPDF = async (e) => {
    // 50+ linhas de lógica
  };
  
  const handleProcessar = () => {
    // 30+ linhas de lógica
  };
  
  const handleSubmit = (e) => {
    // 40+ linhas de lógica
  };
  
  return (
    // 200+ linhas de JSX
  );
}
```

### Depois (100 linhas, limpo e organizado):

```typescript
import { useBoletoForm } from '../../hooks';

export function BoletoForm({ onSubmit }: Props) {
  const form = useBoletoForm();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.canSubmit()) {
      const data = form.getSubmitData();
      onSubmit(data);
      form.reset();
    }
  };
  
  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={4}>
        {/* Upload de PDF */}
        <PDFUpload 
          onUpload={form.handlePDFUpload}
          isLoading={form.pdfUpload.isUploading}
        />
        
        {/* Input de código */}
        <CodeInput
          value={form.formData.codigoBarras || ''}
          onChange={(v) => form.setField('codigoBarras', v)}
          onValidate={form.handleCodeValidation}
          isValidating={form.validation.isValidating}
        />
        
        {/* Exibição de resultado */}
        {form.validation.result?.isValid && (
          <ValidationDisplay result={form.validation.result} />
        )}
        
        {/* Erro */}
        {form.validation.error && (
          <ErrorMessage message={form.validation.error} />
        )}
        
        {/* Campos do formulário */}
        <FormFields
          formData={form.formData}
          setField={form.setField}
        />
        
        {/* Botão de submit */}
        <Button type="submit" disabled={!form.canSubmit()}>
          Salvar Boleto
        </Button>
      </VStack>
    </Box>
  );
}
```

## ✅ Benefícios

1. **Separação de Responsabilidades**: Cada hook tem uma única responsabilidade
2. **Reutilização**: Hooks podem ser usados em múltiplos componentes
3. **Testabilidade**: Lógica isolada é fácil de testar
4. **Manutenibilidade**: Código menor e mais fácil de entender
5. **Performance**: Re-renders otimizados com useCallback

## 🚀 Próximos Passos

1. Refatorar BoletoForm.tsx usando `useBoletoForm`
2. Criar componentes menores (PDFUpload, CodeInput, etc)
3. Adicionar testes para os hooks
4. Criar Context API se necessário
