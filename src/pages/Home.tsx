import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  Text,
  Input,
  Grid,
  Flex,
  Badge,
  NativeSelectRoot,
  NativeSelectField,
} from '@chakra-ui/react';
import { FiPlus, FiDownload, FiUpload } from 'react-icons/fi';
import { BoletoCard } from '../components/BoletoCard';
import { BoletoForm } from '../components/BoletoForm';
import { Dialog } from '../components/ui/dialog';
import * as storage from '../services/storage';
import { Boleto, BoletoStatus, CreateBoletoInput } from '../types';

export default function Home() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BoletoStatus | 'TODOS'>('TODOS');
  const [sortBy, setSortBy] = useState<'vencimento' | 'valor' | 'created'>('vencimento');

  useEffect(() => {
    carregarBoletos();
  }, []);

  const carregarBoletos = () => {
    const dados = storage.loadBoletos();
    setBoletos(dados);
  };

  const handleCreate = (input: CreateBoletoInput) => {
    try {
      storage.createBoleto(input);
      carregarBoletos();
      setIsModalOpen(false);
      alert('✓ Boleto adicionado com sucesso!');
    } catch (error) {
      alert('✗ Erro ao salvar: ' + (error instanceof Error ? error.message : 'Ocorreu um erro'));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este boleto?')) {
      try {
        storage.deleteBoleto(id);
        carregarBoletos();
        // Boleto excluído com sucesso - sem notificação adicional
      } catch (error) {
        alert('✗ Erro ao excluir: ' + (error instanceof Error ? error.message : 'Ocorreu um erro'));
      }
    }
  };

  const handleMarkAsPaid = (id: string) => {
    try {
      storage.marcarComoPago(id);
      carregarBoletos();
      // Boleto marcado como pago - feedback visual automático pela mudança de status
    } catch (error) {
      alert('✗ Erro ao atualizar: ' + (error instanceof Error ? error.message : 'Ocorreu um erro'));
    }
  };

  const handleExport = () => {
    try {
      const json = storage.exportarDados();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boletos-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('✓ Dados exportados com sucesso!');
    } catch (error) {
      alert('✗ Erro ao exportar dados');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        storage.importarDados(text);
        carregarBoletos();
        alert('✓ Dados importados com sucesso!');
      } catch (error) {
        alert('✗ Erro ao importar: ' + (error instanceof Error ? error.message : 'Arquivo inválido'));
      }
    };
    input.click();
  };

  // Filtragem e ordenação
  const boletosFiltrados = useMemo(() => {
    let filtrados = boletos;

    // Filtro por status
    if (statusFilter !== 'TODOS') {
      filtrados = filtrados.filter(b => b.status === statusFilter);
    }

    // Filtro por busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      filtrados = filtrados.filter(b =>
        b.descricao.toLowerCase().includes(termo) ||
        b.beneficiario?.toLowerCase().includes(termo) ||
        b.codigoBarras.includes(termo)
      );
    }

    // Ordenação
    filtrados.sort((a, b) => {
      if (sortBy === 'vencimento') {
        return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
      } else if (sortBy === 'valor') {
        return b.valor - a.valor;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtrados;
  }, [boletos, statusFilter, searchTerm, sortBy]);

  // Estatísticas
  const stats = useMemo(() => {
    const pendentes = boletos.filter(b => b.status === BoletoStatus.PENDENTE);
    const vencidos = boletos.filter(b => b.status === BoletoStatus.VENCIDO);
    const totalPendente = pendentes.reduce((sum, b) => sum + b.valor, 0);
    
    return {
      total: boletos.length,
      pendentes: pendentes.length,
      vencidos: vencidos.length,
      totalPendente,
    };
  }, [boletos]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        {/* Header */}
        <Box>
          <Heading size="2xl" mb={2}>Meus Boletos</Heading>
          <Text color="gray.600">Gerencie e organize seus boletos</Text>
        </Box>

        {/* Estatísticas */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Box p={4} borderWidth={1} borderRadius="lg" bg="blue.50">
            <Text fontSize="sm" color="gray.600">Total de boletos</Text>
            <Text fontSize="2xl" fontWeight="bold">{stats.total}</Text>
          </Box>
          <Box p={4} borderWidth={1} borderRadius="lg" bg="orange.50">
            <Text fontSize="sm" color="gray.600">Pendentes</Text>
            <Text fontSize="2xl" fontWeight="bold" color="orange.600">{stats.pendentes}</Text>
          </Box>
          <Box p={4} borderWidth={1} borderRadius="lg" bg="red.50">
            <Text fontSize="sm" color="gray.600">Vencidos</Text>
            <Text fontSize="2xl" fontWeight="bold" color="red.600">{stats.vencidos}</Text>
          </Box>
          <Box p={4} borderWidth={1} borderRadius="lg" bg="green.50">
            <Text fontSize="sm" color="gray.600">Total a pagar</Text>
            <Text fontSize="2xl" fontWeight="bold" color="green.600">
              R$ {stats.totalPendente.toFixed(2).replace('.', ',')}
            </Text>
          </Box>
        </Grid>

        {/* Ações e Filtros */}
        <Flex gap={4} flexWrap="wrap" align="center">
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            <FiPlus /> Adicionar Boleto
          </Button>
          
          <Button variant="outline" onClick={handleExport}>
            <FiDownload /> Exportar
          </Button>
          
          <Button variant="outline" onClick={handleImport}>
            <FiUpload /> Importar
          </Button>

          <Box flex={1} minW="200px">
            <Input
              placeholder="Buscar boletos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Box>

          <NativeSelectRoot w="200px">
            <NativeSelectField
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as BoletoStatus | 'TODOS')}
            >
              <option value="TODOS">Todos os status</option>
              <option value={BoletoStatus.PENDENTE}>Pendentes</option>
              <option value={BoletoStatus.PAGO}>Pagos</option>
              <option value={BoletoStatus.VENCIDO}>Vencidos</option>
              <option value={BoletoStatus.CANCELADO}>Cancelados</option>
            </NativeSelectField>
          </NativeSelectRoot>

          <NativeSelectRoot w="200px">
            <NativeSelectField
              value={sortBy}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as any)}
            >
              <option value="vencimento">Ordenar por vencimento</option>
              <option value="valor">Ordenar por valor</option>
              <option value="created">Mais recentes</option>
            </NativeSelectField>
          </NativeSelectRoot>
        </Flex>

        {/* Lista de Boletos */}
        {boletosFiltrados.length === 0 ? (
          <Box textAlign="center" py={12}>
            <Text fontSize="lg" color="gray.500">
              {boletos.length === 0
                ? 'Nenhum boleto cadastrado. Clique em "Adicionar Boleto" para começar.'
                : 'Nenhum boleto encontrado com os filtros aplicados.'}
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" gap={4}>
            {boletosFiltrados.map((boleto) => (
              <BoletoCard
                key={boleto.id}
                boleto={boleto}
                onDelete={handleDelete}
                onMarkAsPaid={handleMarkAsPaid}
              />
            ))}
          </VStack>
        )}
      </VStack>

      {/* Modal de Adicionar */}
      <Dialog.Root 
        open={isModalOpen} 
        onOpenChange={(e: { open: boolean }) => setIsModalOpen(e.open)}
        size="xl"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content p={0}>
            <Dialog.Header p={6}>
              <Dialog.Title fontSize="xl">Adicionar Novo Boleto</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body p={6}>
              <BoletoForm
                onSubmit={handleCreate}
                onCancel={() => setIsModalOpen(false)}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Container>
  );
}
