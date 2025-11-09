import { useState, useCallback } from 'react';
import { CreateBoletoInput } from '../types';
import { usePDFUpload } from './usePDFUpload';
import { useBoletoValidation } from './useBoletoValidation';

interface UseBoletoFormResult {
  // Estado do formulário
  formData: Partial<CreateBoletoInput>;
  modoManual: boolean;
  
  // Hooks integrados
  pdfUpload: ReturnType<typeof usePDFUpload>;
  validation: ReturnType<typeof useBoletoValidation>;
  
  // Ações
  setField: <K extends keyof CreateBoletoInput>(field: K, value: CreateBoletoInput[K]) => void;
  setModoManual: (value: boolean) => void;
  handlePDFUpload: (file: File) => Promise<void>;
  handleCodeValidation: () => void;
  reset: () => void;
  canSubmit: () => boolean;
  getSubmitData: () => CreateBoletoInput;
}

/**
 * Hook principal do formulário de boleto
 * Orquestra todos os outros hooks e gerencia o estado do formulário
 */
export function useBoletoForm(): UseBoletoFormResult {
  const [formData, setFormData] = useState<Partial<CreateBoletoInput>>({});
  const [modoManual, setModoManual] = useState(false);
  
  const pdfUpload = usePDFUpload();
  const validation = useBoletoValidation();

  // Atualizar campo individual
  const setField = useCallback(<K extends keyof CreateBoletoInput>(
    field: K, 
    value: CreateBoletoInput[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Processar upload de PDF
  const handlePDFUpload = useCallback(async (file: File) => {
    try {
      const dados = await pdfUpload.handleUpload(file);
      
      // Se encontrou código de barras ou linha digitável, processar
      const codigoParaProcessar = dados.codigoBarras || dados.linhaDigitavel;
      
      if (codigoParaProcessar) {
        // Validar código
        const result = validation.validate(codigoParaProcessar);
        
        if (result.isValid) {
          // Criar data de vencimento corretamente (sem problemas de fuso horário)
          let vencimentoFinal = result.vencimento;
          if (dados.vencimento) {
            const [ano, mes, dia] = dados.vencimento.split('-').map(Number);
            vencimentoFinal = new Date(ano, mes - 1, dia);
          }
          
          // Mesclar dados do PDF com resultado da validação
          // Priorizar dados extraídos do PDF
          setFormData({
            codigoBarras: result.codigoBarras,
            linhaDigitavel: result.linhaDigitavel,
            valor: dados.valor ?? result.valor ?? 0,
            vencimento: vencimentoFinal?.toISOString() || new Date().toISOString(),
            banco: result.banco || 'Não identificado',
            beneficiario: dados.beneficiario,
            numeroDocumento: dados.numeroDocumento,
          });
          
          // Auto-preencher descrição se tiver número do documento
          if (dados.numeroDocumento) {
            setField('descricao', `Boleto ${dados.numeroDocumento}`);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao processar PDF:', err);
      throw err;
    }
  }, [pdfUpload, validation, setField]);

  // Validar código manualmente
  const handleCodeValidation = useCallback(() => {
    if (!formData.codigoBarras) {
      throw new Error('Código não informado');
    }
    
    const result = validation.validate(formData.codigoBarras);
    
    if (result.isValid) {
      // Atualizar formulário com dados validados
      setFormData(prev => ({
        ...prev,
        codigoBarras: result.codigoBarras,
        linhaDigitavel: result.linhaDigitavel,
        valor: prev.valor || result.valor || 0,
        vencimento: prev.vencimento || result.vencimento?.toISOString() || new Date().toISOString(),
        banco: prev.banco || result.banco || 'Não identificado',
      }));
    }
  }, [formData.codigoBarras, validation]);

  // Resetar formulário
  const reset = useCallback(() => {
    setFormData({});
    setModoManual(false);
    pdfUpload.reset();
    validation.reset();
  }, [pdfUpload, validation]);

  // Verificar se pode submeter
  const canSubmit = useCallback((): boolean => {
    // Sempre precisa de descrição
    if (!formData.descricao?.trim()) {
      return false;
    }
    
    // Modo manual: só precisa de descrição
    if (modoManual) {
      return true;
    }
    
    // Modo normal: precisa de validação bem-sucedida
    return validation.result?.isValid === true;
  }, [modoManual, formData.descricao, validation.result]);

  // Obter dados para submissão
  const getSubmitData = useCallback((): CreateBoletoInput => {
    if (!canSubmit()) {
      throw new Error('Formulário inválido');
    }

    // Modo manual
    if (modoManual) {
      return {
        codigoBarras: formData.codigoBarras?.trim() || '0'.repeat(44),
        linhaDigitavel: formData.linhaDigitavel?.trim() || '0'.repeat(47),
        descricao: formData.descricao!.trim(),
        valor: formData.valor || 0,
        vencimento: formData.vencimento || new Date().toISOString(),
        banco: formData.banco || 'Não identificado',
        beneficiario: formData.beneficiario?.trim(),
        numeroDocumento: formData.numeroDocumento?.trim(),
        observacoes: formData.observacoes?.trim(),
      };
    }

    // Modo normal (validado)
    return {
      codigoBarras: validation.result!.codigoBarras,
      linhaDigitavel: validation.result!.linhaDigitavel,
      descricao: formData.descricao!.trim(),
      valor: formData.valor || validation.result!.valor || 0,
      vencimento: formData.vencimento || validation.result!.vencimento?.toISOString() || new Date().toISOString(),
      banco: formData.banco || validation.result!.banco || 'Não identificado',
      beneficiario: formData.beneficiario?.trim(),
      numeroDocumento: formData.numeroDocumento?.trim(),
      observacoes: formData.observacoes?.trim(),
    };
  }, [canSubmit, modoManual, formData, validation.result]);

  return {
    formData,
    modoManual,
    pdfUpload,
    validation,
    setField,
    setModoManual,
    handlePDFUpload,
    handleCodeValidation,
    reset,
    canSubmit,
    getSubmitData,
  };
}
