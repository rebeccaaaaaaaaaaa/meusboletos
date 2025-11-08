import { NativeSelectRoot, NativeSelectField } from "@chakra-ui/react"

export interface SelectProps {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
  placeholder?: string
  w?: string
  width?: string
}

export const Select = (props: SelectProps) => {
  const { value, onChange, children, placeholder, w, width, ...rest } = props
  
  return (
    <NativeSelectRoot w={w || width} {...rest}>
      <NativeSelectField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      >
        {children}
      </NativeSelectField>
    </NativeSelectRoot>
  )
}
