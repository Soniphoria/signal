import { useMemo, useState, useCallback, useEffect } from "react"
import { useRootView } from "./useRootView"
import type { SignalUserType } from "../services/editorSessionApi"
import {
  EDITOR_SESSION_CONTEXT_CHANGED,
  getEditorSessionContext,
} from "../services/editorSessionState"

export interface UserPermissions {
  canDownload: boolean
  userType: "free" | "premium" | "admin"
  showUpgradeDialog: () => void
}

export const useUserPermissions = (): UserPermissions => {
  const [userType, setUserType] = useState<SignalUserType>(
    () => getEditorSessionContext()?.userType ?? "free",
  )
  const { setOpenUpgradePlanDialog } = useRootView()

  useEffect(() => {
    const handleContextChange = (event: Event) => {
      const context = (
        event as CustomEvent<{ userType: SignalUserType } | null>
      ).detail
      setUserType(context?.userType ?? "free")
    }
    window.addEventListener(EDITOR_SESSION_CONTEXT_CHANGED, handleContextChange)

    return () => {
      window.removeEventListener(
        EDITOR_SESSION_CONTEXT_CHANGED,
        handleContextChange,
      )
    }
  }, [])

  const showUpgradeDialog = useCallback(() => {
    setOpenUpgradePlanDialog(true)
  }, [setOpenUpgradePlanDialog])

  return useMemo(() => {
    const canDownload = userType === "premium" || userType === "admin"

    return {
      canDownload,
      userType,
      showUpgradeDialog,
    }
  }, [userType, showUpgradeDialog])
}
