import { makeObservable, observable, action } from "mobx"
import { createContext, useCallback, useContext, useMemo } from "react"
import { useMobxSelector } from "./useMobxSelector"

export type RoutePath = string

class Router {
  path: RoutePath = "/track"

  constructor() {
    makeObservable(this, {
      path: observable,
      setPath: action,
    })

    const path = window.location.pathname
    // Normally, you would have more complex routing logic here
    // For now, we just take the whole path
    // Don't call setPath() in constructor to preserve query parameters on initial load
    this.path = path
  }

  setPath(path: RoutePath) {
    this.path = path
    // Also update the browser's URL bar
    // Preserve query parameters when updating the path
    const search = window.location.search
    window.history.pushState({}, "", path + search)
  }
}

const RouterContext = createContext(new Router())

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const router = useMemo(() => new Router(), [])

  // Listen for browser back/forward button clicks
  window.onpopstate = () => {
    router.setPath(window.location.pathname)
  }

  return (
    <RouterContext.Provider value={router}>{children}</RouterContext.Provider>
  )
}

export function useRouter() {
  const router = useContext(RouterContext)

  return {
    get path() {
      return useMobxSelector(() => router.path, [router])
    },
    setPath: useCallback(
      (path: RoutePath) => {
        router.setPath(path)
      },
      [router],
    ),
  }
}
