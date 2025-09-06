import { useMemo, useState, useCallback } from "react"
import { useRootView } from "./useRootView"

export interface UserPermissions {
  canDownload: boolean
  userType: "free" | "premium" | "admin"
  updateUserType: (newType: "free" | "premium" | "admin") => Promise<void>
  showUpgradeDialog: () => void
}

// Simple local storage for user type in Signal app (no database integration needed)
const USER_TYPE_KEY = "signal_user_type"

const getUserTypeFromStorage = (): "free" | "premium" | "admin" => {
  const stored = localStorage.getItem(USER_TYPE_KEY)
  const userType = (stored as "free" | "premium" | "admin") || "free"
  console.log(`🔍 Signal useUserPermissions: Reading user type from localStorage['${USER_TYPE_KEY}']:`, stored)
  console.log(`📊 Signal useUserPermissions: Resolved user type:`, userType)
  return userType
}

const setUserTypeInStorage = (userType: "free" | "premium" | "admin") => {
  localStorage.setItem(USER_TYPE_KEY, userType)
}

export const useUserPermissions = (): UserPermissions => {
  const [userType, setUserType] = useState<"free" | "premium" | "admin">(() => {
    const initialUserType = getUserTypeFromStorage()
    console.log(`🚀 Signal useUserPermissions: Hook initialized with user type:`, initialUserType)
    return initialUserType
  })
  const { setOpenUpgradePlanDialog } = useRootView()

  const updateUserType = useCallback(async (newType: "free" | "premium" | "admin") => {
    setUserType(newType)
    setUserTypeInStorage(newType)
    console.log(`✅ Updated user type to: ${newType}`)
  }, [])

  const showUpgradeDialog = useCallback(() => {
    setOpenUpgradePlanDialog(true)
  }, [setOpenUpgradePlanDialog])

  return useMemo(() => {
    const canDownload = userType === "premium" || userType === "admin"
    console.log(`🔐 Signal useUserPermissions: Calculated permissions for user type '${userType}':`)
    console.log(`   - canDownload: ${canDownload}`)
    console.log(`   - ${canDownload ? '✅ Download allowed' : '❌ Download blocked - will show upgrade dialog'}`)
    
    return {
      canDownload,
      userType,
      updateUserType,
      showUpgradeDialog,
    }
  }, [userType, updateUserType, showUpgradeDialog])
}
