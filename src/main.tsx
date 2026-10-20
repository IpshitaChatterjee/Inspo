import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { MotionConfig } from "motion/react"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      {/* Respects the Mac's "Reduce motion" setting. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <App />
          {/* On phones the opened view's Copy buttons sit at the bottom; keep toasts above them (below 768px, set in index.css). */}
          <Toaster
            position="bottom-center"
            offset={{ bottom: "var(--toast-bottom)" }}
            mobileOffset={{ bottom: "var(--toast-bottom)" }}
          />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>
)
