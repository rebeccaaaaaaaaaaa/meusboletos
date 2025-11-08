import { Dialog as ChakraDialog } from "@chakra-ui/react"

// Wrappers para evitar conflitos de tipo com Chakra UI v3
export const Dialog = {
  Root: ChakraDialog.Root,
  Backdrop: ChakraDialog.Backdrop,
  Positioner: (props: any) => <ChakraDialog.Positioner {...props} />,
  Content: (props: any) => <ChakraDialog.Content {...props} />,
  Header: (props: any) => <ChakraDialog.Header {...props} />,
  Title: (props: any) => <ChakraDialog.Title {...props} />,
  Body: (props: any) => <ChakraDialog.Body {...props} />,
  CloseTrigger: ChakraDialog.CloseTrigger,
}
