declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export class Analytics {
  private static measurementId: string | undefined =
    process.env.REACT_APP_GA4_MEASUREMENT_ID
  private static isInitialized = false

  static async init(): Promise<void> {
    if (!this.measurementId || this.isInitialized) {
      return
    }

    try {
      // Load GA4 script dynamically
      const script = document.createElement("script")
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`

      document.head.appendChild(script)

      return new Promise((resolve, reject) => {
        script.onload = () => {
          // Initialize gtag if not already done
          if (!window.gtag) {
            window.dataLayer = window.dataLayer || []

            function gtag(...args: any[]) {
              window.dataLayer.push(arguments)
            }

            window.gtag = gtag
          }

          window.gtag("js", new Date())
          window.gtag("config", this.measurementId!, {
            send_page_view: true,
            debug_mode: process.env.NODE_ENV === "development",
          })

          this.isInitialized = true
          console.log(
            "GA4 initialized with measurement ID:",
            this.measurementId,
          )
          resolve()
        }

        script.onerror = () => {
          console.error("Failed to load Google Analytics script")
          reject(new Error("Failed to load GA4 script"))
        }
      })
    } catch (error) {
      console.error("Error initializing Google Analytics:", error)
      throw error
    }
  }

  static trackPageView(page_title: string, page_location?: string): void {
    if (window.gtag && this.isInitialized) {
      window.gtag("event", "page_view", {
        page_title,
        page_location: page_location || window.location.href,
      })
    }
  }

  static trackEvent(eventName: string, parameters?: Record<string, any>): void {
    if (window.gtag && this.isInitialized) {
      window.gtag("event", eventName, parameters)
    }
  }

  static get isReady(): boolean {
    return this.isInitialized && !!window.gtag
  }
}
