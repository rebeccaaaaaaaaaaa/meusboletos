import { Box, Button, VStack, HStack, Text, Separator } from '@chakra-ui/react';
import { useBoletoForm } from '../../../hooks';
import { CreateBoletoInput } from '../../../types';
import { PDFUpload } from '../PDFUpload';
import { CodeInput } from './CodeInput';
import { ValidationDisplay } from './ValidationDisplay';
import { ErrorMessage } from './ErrorMessage';
import { FormFields } from './FormFields';
import { ManualModeAlert } from './ManualModeAlert';

interface BoletoFormProps {
  onSubmit: (boleto: CreateBoletoInput) => void;
  onCancel?: () => void;
}

/**
 * Formulário de boleto refatorado
 * Usa hooks customizados e componentes menores
 */
export function BoletoForm({ onSubmit, onCancel }: BoletoFormProps) {
  const form = useBoletoForm();

  const handlePDFUpload = async (file: File) => {
    try {
      await form.handlePDFUpload(file);
      alert('✓ PDF processado com sucesso! Verifique os dados extraídos.');
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  const handleValidateCode = () => {
    try {
      form.handleCodeValidation();
    } catch (err) {
      // Erro já tratado pelo hook
    }
  };

  const handleManualMode = () => {
    form.setModoManual(true);
    alert('⚠️ Modo manual ativado! Preencha os campos manualmente. Você poderá editar o valor e vencimento depois de salvar.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.canSubmit()) {
      return;
    }

    try {
      const data = form.getSubmitData();
      onSubmit(data);
      form.reset();
    } catch (err) {
      // Erro já tratado
    }
  };

  const hasError = form.pdfUpload.error || form.validation.error;
  const showManualMode = 
    !form.modoManual && 
    !form.validation.result?.isValid && 
    form.formData.codigoBarras;

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {/* Upload de PDF */}
        <PDFUpload
          onUpload={handlePDFUpload}
          isLoading={form.pdfUpload.isUploading}
          disabled={form.modoManual}
        />

        <HStack>
          <Separator flex={1} />
          <Text fontSize="sm" color="gray.500">OU</Text>
          <Separator flex={1} />
        </HStack>

        {/* Input de código */}
        <CodeInput
          value={form.formData.codigoBarras || ''}
          onChange={(value) => form.setField('codigoBarras', value)}
          onValidate={handleValidateCode}
          isValidating={form.validation.isValidating}
          disabled={form.modoManual}
        />

        {/* Mensagens de erro */}
        {hasError && (
          <ErrorMessage
            message={form.pdfUpload.error || form.validation.error || ''}
            showManualMode={!!showManualMode}
            onManualMode={handleManualMode}
          />
        )}

        {/* Resultado da validação */}
        {form.validation.result?.isValid && (
          <ValidationDisplay result={form.validation.result} />
        )}

        {/* Campos do formulário */}
        <FormFields
          formData={form.formData}
          setField={form.setField}
        />

        {/* Alerta de modo manual */}
        {form.modoManual && <ManualModeAlert />}

        {/* Botões de ação */}
        <HStack justify="flex-end" gap={3}>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            colorScheme="green"
            disabled={!form.canSubmit()}
          >
            Salvar Boleto
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
