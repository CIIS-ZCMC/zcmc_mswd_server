import "../css/app.css"
import { createInertiaApp, type ResolvedComponent } from "@inertiajs/react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { ThemeProvider } from "@/providers/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/toast"

const appName = import.meta.env.VITE_APP_NAME || "ZCMC MSWD"

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: ResolvedComponent }>(
      "./pages/**/*.tsx"
    )
    const page = pages[`./pages/${name}.tsx`]
    if (!page) throw new Error(`Page not found: ${name}`)
    return (await page()).default
  },
  setup({ el, App, props }) {
    const root = createRoot(el)
    root.render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="zcmc-mswd-theme">
          <TooltipProvider>
            <App {...props} />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )
  },
})
