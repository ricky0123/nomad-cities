import { extendTheme } from "@chakra-ui/react"

const theme = extendTheme({
  initialColorMode: "dark",
  useSystemColorMode: false,
  semanticTokens: {
    colors: {
      "chakra-body-text": "whiteAlpha.900",
      "chakra-body-bg": "gray.800",
      "chakra-border-color": "whiteAlpha.300",
      "chakra-placeholder-color": "whiteAlpha.400",
    },
  },
  components: {
    Button: {
      baseStyle: {
        rounded: "none",
        _hover: {
          bg: "white",
          color: "#d600ff",
        },
        _focus: { boxShadow: "none" },
      },
      defaultProps: {
        variant: "outline",
        colorScheme: "white",
        _hover: {
          bg: "white",
          color: "#d600ff",
        },
      },
    },
    Input: {
      sizes: {
        lg: {
          field: {
            borderRadius: "none",
          },
        },
        md: {
          field: {
            borderRadius: "none",
          },
        },
        sm: {
          field: {
            borderRadius: "none",
          },
        },
        xs: {
          field: {
            borderRadius: "none",
          },
        },
      },
    },
  },
})

export default theme
