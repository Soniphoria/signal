import { useMemo, useState, useCallback, useEffect } from "react"
import { useRootView } from "./useRootView"
import { getUserProfile } from "../lib/supabase"

export interface UserPermissions {
  canDownload: boolean
  userType: "free" | "premium" | "admin"
  updateUserType: (newType: "free" | "premium" | "admin") => Promise<void>
  showUpgradeDialog: () => void
}

// Local storage keys
const USER_TYPE_KEY = "signal_user_type"
const JWT_TOKEN_KEY = "jwt_token_for_signal"

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
    console.log(`🔧 useUserPermissions: Initializing at domain: ${window.location.hostname}`)
    console.log(`🔧 useUserPermissions: Raw localStorage value: "${localStorage.getItem(USER_TYPE_KEY)}"`)
    const initialUserType = getUserTypeFromStorage()
    console.log(`🔧 useUserPermissions: Parsed userType: ${initialUserType}`)
    return initialUserType
  })
  const { setOpenUpgradePlanDialog } = useRootView()

  // Fetch user type from Supabase on component mount
  useEffect(() => {
    const fetchUserTypeFromSupabase = async () => {
      const jwtToken = localStorage.getItem(JWT_TOKEN_KEY)

      if (!jwtToken) {
        console.log('⚠️ useUserPermissions: No JWT token found, using default user type (free)')
        return
      }

      console.log('🔄 useUserPermissions: Fetching user profile from Supabase...')

      try {
        const profile = await getUserProfile(jwtToken)

        if (profile && profile.user_type) {
          console.log(`✅ useUserPermissions: Fetched user_type from Supabase: ${profile.user_type}`)

          // Update both state and localStorage
          setUserType(profile.user_type)
          setUserTypeInStorage(profile.user_type)

          console.log(`💾 useUserPermissions: Saved user_type to localStorage: ${profile.user_type}`)
        } else {
          console.warn('⚠️ useUserPermissions: No user_type found in Supabase profile')
        }
      } catch (error) {
        console.error('❌ useUserPermissions: Error fetching from Supabase:', error)
      }
    }

    // Fetch on mount
    fetchUserTypeFromSupabase()
  }, [])

  // Listen for changes to localStorage from OnInit or other sources (fallback)
  useEffect(() => {
    const checkStorageUpdate = () => {
      const currentStoredType = getUserTypeFromStorage()
      if (currentStoredType !== userType) {
        console.log(`🔄 useUserPermissions: Detected localStorage change: ${userType} -> ${currentStoredType}`)
        setUserType(currentStoredType)
      }
    }

    // Check periodically for localStorage changes (cross-tab updates won't trigger storage event in same tab)
    const intervalId = setInterval(checkStorageUpdate, 500)

    // Also listen for storage events (cross-tab changes)
    window.addEventListener('storage', checkStorageUpdate)

    // Initial check after mount (in case OnInit hasn't run yet)
    setTimeout(checkStorageUpdate, 100)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('storage', checkStorageUpdate)
    }
  }, [userType])

  const updateUserType = useCallback(async (newType: "free" | "premium" | "admin") => {
    setUserType(newType)
    setUserTypeInStorage(newType)
  }, [])

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
