import { Box, VStack, HStack, Text } from '@chakra-ui/react';
import { formatarLinhaDigitavel } from '../../../services';

interface ValidationResult {
  isValid: boolean;
  banco?: string;
  valor?: number;
  vencimento?: Date;
  linhaDigitavel: string;
}

interface ValidationDisplayProps {
  result: ValidationResult;
}

/**
 * Componente para exibir o resultado da validação do código
 */
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
