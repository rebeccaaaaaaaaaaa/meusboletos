import { useState, useEffect, useCallback } from 'react';
import { loadBoletos, createBoleto, updateBoleto as updateBoletoStorage, deleteBoleto as deleteBoletoStorage } from '../services';
import { Boleto, CreateBoletoInput, BoletoStatus } from '../types';

/**
 * Hook customizado para gerenciar o estado e operações de boletos
 * Centraliza toda a lógica de CRUD e persistência
 */
export function useBoletos() {
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar boletos do localStorage na montagem
  useEffect(() => {
    try {
      const loaded = loadBoletos();
      setBoletos(loaded);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar boletos:', err);
      setError('Erro ao carregar boletos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Adicionar novo boleto
  const addBoleto = useCallback((input: CreateBoletoInput) => {
    try {
      const novoBoleto = createBoleto(input);
      setBoletos(prev => [...prev, novoBoleto]);
      setError(null);
      return novoBoleto;
    } catch (err) {
      console.error('Erro ao adicionar boleto:', err);
      const errorMsg = 'Erro ao adicionar boleto';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Atualizar boleto existente
  const updateBoleto = useCallback((id: string, updates: Partial<Boleto>) => {
    try {
      const atualizado = updateBoletoStorage(id, updates);
      setBoletos(prev => prev.map(b => b.id === id ? atualizado : b));
      setError(null);
      return atualizado;
    } catch (err) {
      console.error('Erro ao atualizar boleto:', err);
      const errorMsg = 'Erro ao atualizar boleto';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Deletar boleto
  const deleteBoleto = useCallback((id: string) => {
    try {
      deleteBoletoStorage(id);
      setBoletos(prev => prev.filter(b => b.id !== id));
      setError(null);
    } catch (err) {
      console.error('Erro ao deletar boleto:', err);
      const errorMsg = 'Erro ao deletar boleto';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  // Marcar boleto como pago
  const markAsPaid = useCallback((id: string) => {
    return updateBoleto(id, { 
      status: BoletoStatus.PAGO,
      dataPagamento: new Date().toISOString()
    });
  }, [updateBoleto]);

  // Marcar boleto como pendente
  const markAsPending = useCallback((id: string) => {
    return updateBoleto(id, { status: BoletoStatus.PENDENTE });
  }, [updateBoleto]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    boletos,
    isLoading,
    error,
    addBoleto,
    updateBoleto,
    deleteBoleto,
    markAsPaid,
    markAsPending,
    clearError,
  };
}
