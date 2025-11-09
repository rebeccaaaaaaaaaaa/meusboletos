import { Box, Text } from '@chakra-ui/react';

/**
 * Componente para alertar sobre modo manual ativo
 */
export function ManualModeAlert() {
  return (
    <Box p={3} bg="orange.50" borderRadius="md" borderWidth={1} borderColor="orange.200">
      <Text color="orange.700" fontSize="sm" fontWeight="semibold">
        ⚠️ Modo Manual Ativo
      </Text>
      <Text color="orange.600" fontSize="xs" mt={1}>
        O boleto será salvo sem validação. Você poderá editar valor e vencimento depois.
      </Text>
    </Box>
  );
}
