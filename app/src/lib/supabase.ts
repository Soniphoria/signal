import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found in environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definition for user profile from Supabase
export interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  user_type: 'free' | 'premium' | 'admin'
  created_at: string
}

/**
 * Fetch user profile from Supabase by JWT token
 * @param token - JWT token from Audio Melody Weaver
 * @returns User profile with user_type
 */
export async function getUserProfile(token: string): Promise<UserProfile | null> {
  try {
    // Set the auth token for this request
    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token, // In practice, you should have a separate refresh token
    })

    if (authError || !user) {
      console.error('❌ Failed to authenticate with Supabase:', authError)
      return null
    }

    console.log('✅ Supabase authentication successful, user ID:', user.id)

    // Fetch user profile from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, user_type, created_at')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('❌ Failed to fetch user profile from Supabase:', error)
      return null
    }

    if (!data) {
      console.warn('⚠️ User profile not found in Supabase')
      return null
    }

    console.log('✅ User profile fetched from Supabase:', data)
    return data as UserProfile
  } catch (error) {
    console.error('❌ Error fetching user profile from Supabase:', error)
    return null
  }
}

/**
 * Get user profile without authentication (using anon key)
 * This is useful if you just need to check user type based on user ID
 */
export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, user_type, created_at')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ Failed to fetch user profile by ID:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('❌ Error fetching user profile by ID:', error)
    return null
  }
}
