import * as Sentry from "@sentry/browser"
import { configure } from "mobx"
import { createRoot } from "react-dom/client"
import { App } from "./components/App/App"
import { Analytics } from "./helpers/analytics"

// Log deployment version info
const BUILD_TIME = process.env.BUILD_TIME || "unknown"
const VERCEL_GIT_COMMIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA || "unknown"
const APP_VERSION = "0.0.1"

console.log("=== Signal App Deployment Info ===")
console.log(`Version: ${APP_VERSION}`)
console.log(`Build Time: ${BUILD_TIME}`)
console.log(`Git Commit: ${VERCEL_GIT_COMMIT_SHA}`)
console.log(`Environment: ${process.env.VERCEL_ENV || "development"}`)
console.log("==================================")

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
})

configure({
  enforceActions: "never",
})

// Initialize Google Analytics 4
Analytics.init()
  .then(() => {
    Analytics.trackPageView("Signal MIDI Editor - Main App")
  })
  .catch((error) => {
    console.error("GA4 initialization failed:", error)
  })

const root = createRoot(document.querySelector("#root")!)
root.render(<App />)

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/edit" })
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}
