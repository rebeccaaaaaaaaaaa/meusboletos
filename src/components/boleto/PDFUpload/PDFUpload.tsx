import { useRef } from 'react';
import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { FiUpload } from 'react-icons/fi';

interface PDFUploadProps {
  onUpload: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

/**
 * Componente de upload de PDF
 * Responsável apenas pela UI de seleção de arquivo
 */
export function PDFUpload({ onUpload, isLoading, disabled }: PDFUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      // Limpar input para permitir upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled || isLoading}
      />
      <Button
        variant="outline"
        type="button"
        onClick={handleClick}
        colorScheme="purple"
        width="full"
        loading={isLoading}
        disabled={disabled || isLoading}
      >
        <HStack>
          <FiUpload />
          <Text>{isLoading ? 'Processando PDF...' : 'Upload de Boleto PDF'}</Text>
        </HStack>
      </Button>
    </Box>
  );
}
