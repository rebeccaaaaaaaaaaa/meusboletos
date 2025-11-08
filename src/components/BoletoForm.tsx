import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Input,
  Textarea,
  VStack,
  HStack,
  Text,
  Stack,
  Separator,
} from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';
import { Field } from '../components/ui/field';
import { parseBoleto, formatarLinhaDigitavel, extrairDadosDoBoleto, validarArquivoPDF } from '../services';
import { CreateBoletoInput } from '../types';

interface BoletoFormProps {
  onSubmit: (boleto: CreateBoletoInput) => void;
  onCancel?: () => void;
}

export function BoletoForm({ onSubmit, onCancel }: BoletoFormProps) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseBoleto> | null>(null);
  const [isUploadingPDF, setIsUploadingPDF] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCodigoChange = (value: string) => {
    setCodigo(value);
    setParseError('');
    setParseResult(null);
  };

  const handleProcessar = () => {
    if (!codigo.trim()) {
      setParseError('Digite o código do boleto');
      return;
    }

    setIsProcessing(true);
    const result = parseBoleto(codigo);
    
    if (!result.isValid) {
      setParseError(result.error || 'Código inválido');
      setParseResult(null);
    } else {
      setParseError('');
      setParseResult(result);
    }
    
    setIsProcessing(false);
  };

  const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const validacao = validarArquivoPDF(file);
    if (!validacao.valido) {
      setParseError(validacao.erro || 'Arquivo inválido');
      return;
    }

    setIsUploadingPDF(true);
    setParseError('');
    setParseResult(null);

    try {
      // Extrair dados do PDF
      const dadosExtraidos = await extrairDadosDoBoleto(file);

      // Se encontrou código de barras ou linha digitável, processar
      const codigoParaProcessar = dadosExtraidos.codigoBarras || dadosExtraidos.linhaDigitavel;
      
      if (codigoParaProcessar) {
        setCodigo(codigoParaProcessar);
        const result = parseBoleto(codigoParaProcessar);
        
        if (result.isValid) {
          setParseResult(result);
          
          // Preencher campos automaticamente se encontrados
          if (dadosExtraidos.beneficiario) {
            setBeneficiario(dadosExtraidos.beneficiario);
          }
          
          if (dadosExtraidos.numeroDocumento && !descricao) {
            setDescricao(`Boleto ${dadosExtraidos.numeroDocumento}`);
          }
          
          alert('✓ PDF processado com sucesso! Verifique os dados extraídos.');
        } else {
          // Código inválido, mas vamos preencher os campos do PDF mesmo assim
          setParseError(`Código extraído do PDF com problemas de validação: ${result.error || 'Dígitos verificadores incorretos'}. Preencha manualmente ou tente processar clicando em "Processar Código".`);
          
          // Preencher campos do PDF mesmo com código inválido
          if (dadosExtraidos.beneficiario) {
            setBeneficiario(dadosExtraidos.beneficiario);
          }
          
          if (dadosExtraidos.numeroDocumento && !descricao) {
            setDescricao(`Boleto ${dadosExtraidos.numeroDocumento}`);
          }
        }
      } else {
        setParseError('Não foi possível encontrar o código de barras no PDF');
      }
      
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Erro ao processar PDF');
    } finally {
      setIsUploadingPDF(false);
      // Limpar input file para permitir upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!modoManual && !parseResult?.isValid) {
      setParseError('Processe o código do boleto primeiro ou ative o modo manual');
      return;
    }

    if (!descricao.trim()) {
      setParseError('Digite uma descrição para o boleto');
      return;
    }

    // Modo manual: usar os dados do formulário diretamente
    if (modoManual) {
      const boletoInput: CreateBoletoInput = {
        codigoBarras: codigo.trim() || '0'.repeat(44),
        linhaDigitavel: codigo.trim() || '0'.repeat(47),
        descricao: descricao.trim(),
        valor: 0, // Usuário precisa adicionar manualmente depois
        vencimento: new Date().toISOString(),
        banco: 'Não identificado',
        beneficiario: beneficiario.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      };
      onSubmit(boletoInput);
      return;
    }

    // Modo normal: usar dados validados
    const boletoInput: CreateBoletoInput = {
      codigoBarras: parseResult!.codigoBarras,
      linhaDigitavel: parseResult!.linhaDigitavel,
      descricao: descricao.trim(),
      valor: parseResult!.valor || 0,
      vencimento: parseResult!.vencimento?.toISOString() || new Date().toISOString(),
      banco: parseResult!.banco,
      beneficiario: beneficiario.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    };

    onSubmit(boletoInput);
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {/* Upload de PDF */}
        <Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleUploadPDF}
            style={{ display: 'none' }}
          />
          <Button
            type="button"
            onClick={handleClickUpload}
            colorScheme="purple"
            width="full"
            loading={isUploadingPDF}
          >
            <HStack>
              <FiUpload />
              <Text>{isUploadingPDF ? 'Processando PDF...' : 'Upload de Boleto PDF'}</Text>
            </HStack>
          </Button>
        </Box>

        <HStack>
          <Separator flex={1} />
          <Text fontSize="sm" color="gray.500">OU</Text>
          <Separator flex={1} />
        </HStack>

        {/* Input manual de código */}
        <Field label="Código do Boleto" required>
          <Input
            placeholder="Digite ou cole o código de barras ou linha digitável"
            value={codigo}
            onChange={(e) => handleCodigoChange(e.target.value)}
            fontFamily="mono"
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            44 dígitos (código de barras) ou 47 dígitos (linha digitável)
          </Text>
        </Field>

        <Button
          type="button"
          onClick={handleProcessar}
          colorScheme="blue"
          width="full"
          loading={isProcessing}
          disabled={!codigo.trim()}
        >
          Processar Código
        </Button>

        {parseError && (
          <Box p={3} bg="red.50" borderRadius="md" borderWidth={1} borderColor="red.200">
            <VStack align="stretch" gap={2}>
              <Text color="red.700" fontSize="sm">{parseError}</Text>
              {!modoManual && !parseResult?.isValid && codigo.trim() && (
                <Button
                  size="sm"
                  colorScheme="orange"
                  variant="outline"
                  onClick={() => {
                    setModoManual(true);
                    setParseError('');
                    alert('⚠️ Modo manual ativado! Preencha os campos manualmente. Você poderá editar o valor e vencimento depois de salvar.');
                  }}
                >
                  Continuar em Modo Manual
                </Button>
              )}
            </VStack>
          </Box>
        )}

        {parseResult?.isValid && (
          <Box p={4} bg="green.50" borderRadius="md" borderWidth={1} borderColor="green.200">
            <VStack align="stretch" gap={2}>
              <Text fontWeight="bold" color="green.700">✓ Código válido!</Text>
              
              {parseResult.banco && (
                <HStack>
                  <Text fontWeight="semibold">Banco:</Text>
                  <Text>{parseResult.banco}</Text>
                </HStack>
              )}
              
              {parseResult.valor && (
                <HStack>
                  <Text fontWeight="semibold">Valor:</Text>
                  <Text>R$ {parseResult.valor.toFixed(2).replace('.', ',')}</Text>
                </HStack>
              )}
              
              {parseResult.vencimento && (
                <HStack>
                  <Text fontWeight="semibold">Vencimento:</Text>
                  <Text>{new Date(parseResult.vencimento).toLocaleDateString('pt-BR')}</Text>
                </HStack>
              )}
              
              <Box>
                <Text fontWeight="semibold">Linha Digitável:</Text>
                <Text fontSize="sm" fontFamily="mono">
                  {formatarLinhaDigitavel(parseResult.linhaDigitavel)}
                </Text>
              </Box>
            </VStack>
          </Box>
        )}

        <Field label="Descrição" required>
          <Input
            placeholder="Ex: Conta de luz, Aluguel, etc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            borderColor={!descricao.trim() ? 'orange.300' : undefined}
          />
          {!descricao.trim() && (
            <Text fontSize="xs" color="orange.600" mt={1}>
              ⚠️ Campo obrigatório - Digite uma descrição para identificar o boleto
            </Text>
          )}
        </Field>

        <Field label="Beneficiário">
          <Input
            placeholder="Nome da empresa ou pessoa (opcional)"
            value={beneficiario}
            onChange={(e) => setBeneficiario(e.target.value)}
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Opcional - Pode ser preenchido automaticamente do PDF
          </Text>
        </Field>

        <Field label="Observações">
          <Textarea
            placeholder="Observações adicionais (opcional)"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
          />
        </Field>

        {modoManual && (
          <Box p={3} bg="orange.50" borderRadius="md" borderWidth={1} borderColor="orange.200">
            <Text color="orange.700" fontSize="sm" fontWeight="semibold">
              ⚠️ Modo Manual Ativo
            </Text>
            <Text color="orange.600" fontSize="xs" mt={1}>
              O boleto será salvo sem validação. Você poderá editar valor e vencimento depois.
            </Text>
          </Box>
        )}

        <HStack justify="flex-end" gap={3}>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            type="submit"
            colorScheme="green"
            disabled={(!modoManual && !parseResult?.isValid) || !descricao.trim()}
          >
            Salvar Boleto
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
