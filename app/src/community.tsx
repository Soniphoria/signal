import { app } from "@signal-app/community"
import { Analytics } from "./helpers/analytics"

// Initialize Google Analytics 4
Analytics.init()
  .then(() => {
    Analytics.trackPageView("Signal MIDI Editor - Community")
  })
  .catch((error) => {
    console.error("GA4 initialization failed:", error)
  })

app()
