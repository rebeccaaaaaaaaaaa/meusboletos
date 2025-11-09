import { useState, useCallback } from 'react';
import { parseBoleto } from '../services';

interface BoletoParseResult {
  codigoBarras: string;
  linhaDigitavel: string;
  banco?: string;
  valor?: number;
  vencimento?: Date;
  isValid: boolean;
  error?: string;
}

interface UseBoletoValidationResult {
  isValidating: boolean;
  result: BoletoParseResult | null;
  error: string | null;
  validate: (codigo: string) => BoletoParseResult;
  reset: () => void;
}

/**
 * Hook customizado para validar códigos de boletos
 * Isola a lógica de validação e parsing
 */
export function useBoletoValidation(): UseBoletoValidationResult {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<BoletoParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((codigo: string): BoletoParseResult => {
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
      } else {
        setError(null);
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
