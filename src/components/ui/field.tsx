import { Box, Text } from "@chakra-ui/react"
import { forwardRef } from "react"

export interface FieldProps {
  label?: React.ReactNode
  required?: boolean
  children: React.ReactNode
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(
  function Field(props, ref) {
    const { label, required, children } = props
    return (
      <Box ref={ref}>
        {label && (
          <Text as="label" fontWeight="medium" mb={1.5} display="block">
            {label}
            {required && <Text as="span" color="red.500" ml={1}>*</Text>}
          </Text>
        )}
        {children}
      </Box>
    )
  },
)
