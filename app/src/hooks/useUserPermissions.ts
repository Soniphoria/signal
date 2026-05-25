import { useMemo, useState, useCallback, useEffect } from "react"
import { useRootView } from "./useRootView"

export interface UserPermissions {
  canDownload: boolean
  userType: "free" | "premium" | "admin"
  updateUserType: (newType: "free" | "premium" | "admin") => Promise<void>
  showUpgradeDialog: () => void
}

// Local storage keys
const USER_TYPE_KEY = "signal_user_type"

const getUserTypeFromStorage = (): "free" | "premium" | "admin" => {
  const stored = localStorage.getItem(USER_TYPE_KEY)
  const userType = (stored as "free" | "premium" | "admin") || "free"
  return userType
}

const setUserTypeInStorage = (userType: "free" | "premium" | "admin") => {
  localStorage.setItem(USER_TYPE_KEY, userType)
}

export const useUserPermissions = (): UserPermissions => {
  const [userType, setUserType] = useState<"free" | "premium" | "admin">(() => {
    const initialUserType = getUserTypeFromStorage()
    return initialUserType
  })
  const { setOpenUpgradePlanDialog } = useRootView()

  // Listen for changes to localStorage user_type from other sources (fallback)
  useEffect(() => {
    const checkStorageUpdate = () => {
      const currentStoredType = getUserTypeFromStorage()
      if (currentStoredType !== userType) {
        setUserType(currentStoredType)
      }
    }

    // Check periodically for localStorage changes (cross-tab updates won't trigger storage event in same tab)
    const intervalId = setInterval(checkStorageUpdate, 500)

    // Also listen for storage events (cross-tab changes)
    window.addEventListener("storage", checkStorageUpdate)

    // Initial check after mount (in case OnInit hasn't run yet)
    setTimeout(checkStorageUpdate, 100)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener("storage", checkStorageUpdate)
    }
  }, [userType])

  const updateUserType = useCallback(
    async (newType: "free" | "premium" | "admin") => {
      setUserType(newType)
      setUserTypeInStorage(newType)
    },
    [],
  )

  const showUpgradeDialog = useCallback(() => {
    setOpenUpgradePlanDialog(true)
  }, [setOpenUpgradePlanDialog])

  return useMemo(() => {
    const canDownload = userType === "premium" || userType === "admin"

    return {
      canDownload,
      userType,
      updateUserType,
      showUpgradeDialog,
    }
  }, [userType, updateUserType, showUpgradeDialog])
}
