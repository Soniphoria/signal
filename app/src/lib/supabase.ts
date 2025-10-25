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

    // Extract user profile from JWT token user_metadata (already contains all info)
    // This avoids RLS permission issues and is more efficient
    const userMetadata = user.user_metadata || {}

    const profile: UserProfile = {
      id: user.id,
      email: userMetadata.email || user.email || '',
      first_name: userMetadata.first_name || '',
      last_name: userMetadata.last_name || '',
      user_type: userMetadata.user_type || 'free', // Default to 'free' if not specified
      created_at: user.created_at || new Date().toISOString(),
    }

    console.log('✅ User profile extracted from JWT token:', profile)
    return profile
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

// Type definitions for project and MIDI data
export interface Project {
  id: string
  user_id: string
  title: string
  artist: string
  created_at: string
  updated_at: string
}

export interface MidiTrack {
  id: string
  project_id: string
  name: string
  file_path: string
  notes_data?: any
  color?: string
  created_at: string
  updated_at: string
}

/**
 * Fetch project information from Supabase
 * @param token - JWT token for authentication
 * @param projectId - Project ID to fetch
 * @returns Project information
 */
export async function getProjectInfo(token: string, projectId: string): Promise<Project | null> {
  try {
    // Set the auth token for this request
    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    })

    if (authError || !user) {
      console.error('❌ Failed to authenticate with Supabase:', authError)
      return null
    }

    console.log('✅ Supabase authentication successful for project fetch, user ID:', user.id)

    // Fetch project from projects table
    const { data, error } = await supabase
      .from('projects')
      .select('id, user_id, title, artist, created_at, updated_at')
      .eq('id', projectId)
      .single()

    if (error) {
      console.error('❌ Failed to fetch project from Supabase:', error)
      return null
    }

    if (!data) {
      console.warn('⚠️ Project not found in Supabase')
      return null
    }

    console.log('✅ Project fetched from Supabase:', data)
    return data as Project
  } catch (error) {
    console.error('❌ Error fetching project from Supabase:', error)
    return null
  }
}

/**
 * Fetch MIDI tracks for a project from Supabase
 * @param token - JWT token for authentication
 * @param projectId - Project ID to fetch tracks for
 * @returns Array of MIDI tracks with Azure Blob Storage URLs
 */
export async function getProjectMidiTracks(token: string, projectId: string): Promise<MidiTrack[]> {
  try {
    // Set the auth token for this request
    const { data: { user }, error: authError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    })

    if (authError || !user) {
      console.error('❌ Failed to authenticate with Supabase:', authError)
      return []
    }

    console.log('✅ Supabase authentication successful for MIDI tracks fetch, user ID:', user.id)

    // Fetch MIDI tracks from midi_tracks table
    const { data, error } = await supabase
      .from('midi_tracks')
      .select('id, project_id, name, file_path, notes_data, color, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Failed to fetch MIDI tracks from Supabase:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No MIDI tracks found for project:', projectId)
      return []
    }

    console.log(`✅ Fetched ${data.length} MIDI track(s) from Supabase for project:`, projectId)
    return data as MidiTrack[]
  } catch (error) {
    console.error('❌ Error fetching MIDI tracks from Supabase:', error)
    return []
  }
}
