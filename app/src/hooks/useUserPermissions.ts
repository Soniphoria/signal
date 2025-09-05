import { useMemo, useState, useCallback } from "react"

export interface UserPermissions {
  canDownload: boolean
  userType: "free" | "premium" | "admin"
  updateUserType: (newType: "free" | "premium" | "admin") => Promise<void>
}

// Simple local storage for user type in Signal app (no database integration needed)
const USER_TYPE_KEY = "signal_user_type"

const getUserTypeFromStorage = (): "free" | "premium" | "admin" => {
  const stored = localStorage.getItem(USER_TYPE_KEY)
  return (stored as "free" | "premium" | "admin") || "free"
}

const setUserTypeInStorage = (userType: "free" | "premium" | "admin") => {
  localStorage.setItem(USER_TYPE_KEY, userType)
}

export const useUserPermissions = (): UserPermissions => {
  const [userType, setUserType] = useState<"free" | "premium" | "admin">(getUserTypeFromStorage)

  const updateUserType = useCallback(async (newType: "free" | "premium" | "admin") => {
    setUserType(newType)
    setUserTypeInStorage(newType)
    console.log(`✅ Updated user type to: ${newType}`)
  }, [])

  return useMemo(() => {
    return {
      canDownload: userType === "premium" || userType === "admin",
      userType,
      updateUserType,
    }
  }, [userType, updateUserType])
}
