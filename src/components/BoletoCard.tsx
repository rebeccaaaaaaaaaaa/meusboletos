import {
  Box,
  Button,
  Text,
  HStack,
  VStack,
  Badge,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { FiCopy, FiEdit, FiTrash2, FiCheck } from 'react-icons/fi';
import { Boleto, BoletoStatus } from '../types';
import { formatarLinhaDigitavel } from '../services';

interface BoletoCardProps {
  boleto: Boleto;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMarkAsPaid?: (id: string) => void;
}

const statusConfig = {
  [BoletoStatus.PENDENTE]: { label: 'Pendente', color: 'orange' },
  [BoletoStatus.PAGO]: { label: 'Pago', color: 'green' },
  [BoletoStatus.VENCIDO]: { label: 'Vencido', color: 'red' },
  [BoletoStatus.CANCELADO]: { label: 'Cancelado', color: 'gray' },
};

export function BoletoCard({ boleto, onEdit, onDelete, onMarkAsPaid }: BoletoCardProps) {
  const handleCopyCodigoBarras = async () => {
    try {
      await navigator.clipboard.writeText(boleto.codigoBarras);
      alert('✓ Código de barras copiado!');
    } catch (error) {
      alert('✗ Erro ao copiar código');
    }
  };

  const handleCopyLinhaDigitavel = async () => {
    try {
      await navigator.clipboard.writeText(formatarLinhaDigitavel(boleto.linhaDigitavel));
      alert('✓ Linha digitável copiada!');
    } catch (error) {
      alert('✗ Erro ao copiar linha digitável');
    }
  };

  const vencimento = new Date(boleto.vencimento);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);
  const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Box
      borderWidth={1}
      borderRadius="lg"
      p={4}
      bg="white"
      boxShadow="sm"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s"
    >
      <VStack align="stretch" gap={3}>
        {/* Header com título e status */}
        <Flex justify="space-between" align="start">
          <Box flex={1}>
            <Text fontSize="lg" fontWeight="bold" mb={1}>
              {boleto.descricao}
            </Text>
            {boleto.beneficiario && (
              <Text fontSize="sm" color="gray.600">
                {boleto.beneficiario}
              </Text>
            )}
          </Box>
          <Badge colorScheme={statusConfig[boleto.status].color}>
            {statusConfig[boleto.status].label}
          </Badge>
        </Flex>

        {/* Informações principais */}
        <VStack align="stretch" gap={2} fontSize="sm">
          {boleto.banco && (
            <HStack>
              <Text fontWeight="semibold" minW="80px">Banco:</Text>
              <Text>{boleto.banco}</Text>
            </HStack>
          )}

          <HStack>
            <Text fontWeight="semibold" minW="80px">Valor:</Text>
            <Text fontSize="lg" fontWeight="bold" color="blue.600">
              R$ {boleto.valor.toFixed(2).replace('.', ',')}
            </Text>
          </HStack>

          <HStack>
            <Text fontWeight="semibold" minW="80px">Vencimento:</Text>
            <Text>
              {vencimento.toLocaleDateString('pt-BR')}
              {boleto.status === BoletoStatus.PENDENTE && diasRestantes >= 0 && (
                <Text as="span" ml={2} color={diasRestantes <= 3 ? 'red.500' : 'gray.500'}>
                  ({diasRestantes === 0 ? 'Vence hoje' : diasRestantes === 1 ? 'Vence amanhã' : `${diasRestantes} dias`})
                </Text>
              )}
            </Text>
          </HStack>

          {boleto.dataPagamento && (
            <HStack>
              <Text fontWeight="semibold" minW="80px">Pago em:</Text>
              <Text>{new Date(boleto.dataPagamento).toLocaleDateString('pt-BR')}</Text>
            </HStack>
          )}

          {boleto.observacoes && (
            <Box>
              <Text fontWeight="semibold">Observações:</Text>
              <Text color="gray.600" mt={1}>{boleto.observacoes}</Text>
            </Box>
          )}
        </VStack>

        {/* Códigos */}
        <VStack align="stretch" gap={2} pt={2} borderTopWidth={1}>
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                CÓDIGO DE BARRAS
              </Text>
              <IconButton
                aria-label="Copiar código de barras"
                size="sm"
                variant="ghost"
                onClick={handleCopyCodigoBarras}
              >
                <FiCopy />
              </IconButton>
            </HStack>
            <Text fontSize="xs" fontFamily="mono" bg="gray.50" p={2} borderRadius="md">
              {boleto.codigoBarras}
            </Text>
          </Box>

          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.600">
                LINHA DIGITÁVEL
              </Text>
              <IconButton
                aria-label="Copiar linha digitável"
                size="sm"
                variant="ghost"
                onClick={handleCopyLinhaDigitavel}
              >
                <FiCopy />
              </IconButton>
            </HStack>
            <Text fontSize="xs" fontFamily="mono" bg="gray.50" p={2} borderRadius="md">
              {formatarLinhaDigitavel(boleto.linhaDigitavel)}
            </Text>
          </Box>
        </VStack>

        {/* Ações */}
        <HStack justify="flex-end" gap={2} pt={2}>
          {boleto.status === BoletoStatus.PENDENTE && onMarkAsPaid && (
            <Button
              size="sm"
              colorScheme="green"
              variant="outline"
              onClick={() => onMarkAsPaid(boleto.id)}
            >
              <FiCheck /> Marcar como Pago
            </Button>
          )}
          
          {onEdit && (
            <IconButton
              aria-label="Editar"
              size="sm"
              variant="ghost"
              onClick={() => onEdit(boleto.id)}
            >
              <FiEdit />
            </IconButton>
          )}
          
          {onDelete && (
            <IconButton
              aria-label="Excluir"
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={() => onDelete(boleto.id)}
            >
              <FiTrash2 />
            </IconButton>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
