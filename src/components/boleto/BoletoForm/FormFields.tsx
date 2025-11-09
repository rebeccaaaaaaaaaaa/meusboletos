import { Input, Textarea } from '@chakra-ui/react';
import { Field } from '../../ui/field';
import { CreateBoletoInput } from '../../../types';

interface FormFieldsProps {
  formData: Partial<CreateBoletoInput>;
  setField: <K extends keyof CreateBoletoInput>(field: K, value: CreateBoletoInput[K]) => void;
}

/**
 * Componente com os campos principais do formulário
 */
export function FormFields({ formData, setField }: FormFieldsProps) {
  return (
    <>
      <Field label="Descrição" required>
        <Input
          placeholder="Ex: Conta de luz, Aluguel, etc"
          value={formData.descricao || ''}
          onChange={(e) => setField('descricao', e.target.value)}
        />
      </Field>

      <Field label="Beneficiário">
        <Input
          placeholder="Nome da empresa ou pessoa"
          value={formData.beneficiario || ''}
          onChange={(e) => setField('beneficiario', e.target.value)}
        />
      </Field>

      <Field label="Observações">
        <Textarea
          placeholder="Observações adicionais"
          value={formData.observacoes || ''}
          onChange={(e) => setField('observacoes', e.target.value)}
          rows={3}
        />
      </Field>
    </>
  );
}
