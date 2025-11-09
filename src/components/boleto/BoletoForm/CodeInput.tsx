import { Box, Input, Text, Button } from '@chakra-ui/react';
import { Field } from '../../ui/field';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidate: () => void;
  isValidating?: boolean;
  disabled?: boolean;
}

/**
 * Componente para input e validação de código de boleto
 */
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
        type="button"
        onClick={onValidate}
        colorScheme="blue"
        width="full"
        loading={isValidating}
        disabled={!value.trim() || disabled || isValidating}
      >
        Processar Código
      </Button>
    </>
  );
}
