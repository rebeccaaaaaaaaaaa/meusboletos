import { useState, useCallback } from 'react';
import { extrairDadosDoBoleto, validarArquivoPDF } from '../services';
import { BoletoExtraido } from '../services/pdfExtractor';

interface UsePDFUploadResult {
  isUploading: boolean;
  error: string | null;
  uploadedData: BoletoExtraido | null;
  handleUpload: (file: File) => Promise<BoletoExtraido>;
  reset: () => void;
}

/**
 * Hook customizado para gerenciar upload e extração de dados de PDFs
 * Isola toda a lógica de processamento de PDF
 */
export function usePDFUpload(): UsePDFUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<BoletoExtraido | null>(null);

  const handleUpload = useCallback(async (file: File): Promise<BoletoExtraido> => {
    // Validar arquivo
    const validacao = validarArquivoPDF(file);
    if (!validacao.valido) {
      const errorMsg = validacao.erro || 'Arquivo inválido';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsUploading(true);
    setError(null);

    try {
      // Extrair dados do PDF
      const dados = await extrairDadosDoBoleto(file);
      setUploadedData(dados);
      return dados;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar PDF';
      setError(errorMsg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setError(null);
    setUploadedData(null);
  }, []);

  return {
    isUploading,
    error,
    uploadedData,
    handleUpload,
    reset,
  };
}
