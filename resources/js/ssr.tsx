import { createInertiaApp } from "@inertiajs/react"
import createServer from "@inertiajs/react/server"
import ReactDOMServer from "react-dom/server"
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/providers/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

const appName = import.meta.env.VITE_APP_NAME || "ZCMC MSWD"

createServer((page) =>
  createInertiaApp({
    page,
    render: ReactDOMServer.renderToString,
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
      resolvePageComponent(
        `./pages/${name}.tsx`,
        import.meta.glob("./pages/**/*.tsx")
      ),
    setup: ({ App, props }) => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
        },
      })

      return (
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="zcmc-mswd-theme">
            <TooltipProvider>
              <App {...props} />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      )
    },
  })
)
