import { configure } from "mobx"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { Analytics } from "../helpers/analytics"

configure({
  enforceActions: "never",
})

// Initialize Google Analytics 4
Analytics.init()
  .then(() => {
    Analytics.trackPageView("Signal MIDI Editor - Authentication")
  })
  .catch((error) => {
    console.error("GA4 initialization failed:", error)
  })

const root = createRoot(document.querySelector("#root")!)
root.render(<App />)
