import { makeObservable, observable, action } from "mobx"
import { createContext, useCallback, useContext, useMemo } from "react"
import { useMobxSelector } from "./useMobxSelector"

export type RoutePath = string;

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
    this.setPath(path)
  }

  setPath(path: RoutePath) {
    this.path = path
    // Also update the browser's URL bar
    window.history.pushState({}, "", path)
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
