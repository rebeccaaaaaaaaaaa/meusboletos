import { Box, VStack, Text, Button } from '@chakra-ui/react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onManualMode?: () => void;
  showManualMode?: boolean;
}

/**
 * Componente para exibir mensagens de erro
 */
export function ErrorMessage({ 
  message, 
  onRetry, 
  onManualMode,
  showManualMode 
}: ErrorMessageProps) {
  return (
    <Box p={3} bg="red.50" borderRadius="md" borderWidth={1} borderColor="red.200">
      <VStack align="stretch" gap={2}>
        <Text color="red.700" fontSize="sm">{message}</Text>
        
        {showManualMode && onManualMode && (
          <Button
            size="sm"
            colorScheme="orange"
            variant="outline"
            onClick={onManualMode}
          >
            Continuar em Modo Manual
          </Button>
        )}
      </VStack>
    </Box>
  );
}
