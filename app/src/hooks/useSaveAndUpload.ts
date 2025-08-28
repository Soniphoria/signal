import { useCallback, useState } from "react"
import { useToast } from "dialog-hooks"
import { useSong } from "./useSong"
import { write as writeMidiFile, EndOfTrackEvent } from "midifile-ts"
import { toRawEvents } from "../helpers/toRawEvents"

export const useSaveAndUpload = () => {
  const { getSong, setSaved } = useSong()
  const toast = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [showRetryDialog, setShowRetryDialog] = useState(false)

  // Function to export current song to MIDI buffers (similar to downloadSongAsSeparateMidis)
  const exportCurrentSongToMidiBuffers = useCallback(() => {
    const song = getSong()
    const conductor = song.conductorTrack
    const endOfTrack: EndOfTrackEvent = {
      deltaTime: 0,
      type: "meta",
      subtype: "endOfTrack",
    }

    // Build raw conductor track
    const conductorRaw = conductor
      ? [...toRawEvents(conductor.events), endOfTrack]
      : [
          {
            type: "meta",
            subtype: "setTempo",
            microsecondsPerBeat: 500000, // DEFAULT_IMPORT_USEC_PER_BEAT
            deltaTime: 0,
          } as any,
          endOfTrack,
        ]

    const midiBuffers: { buffer: ArrayBuffer; name: string }[] = []

    song.tracks.forEach((track, index) => {
      if (track.isConductorTrack) {
        return
      }

      const rawEvents = [...toRawEvents(track.events), endOfTrack]
      const trackRaw =
        track.channel !== undefined 
          ? rawEvents.map((event: any) => ({
              ...event,
              channel: track.channel,
            }))
          : rawEvents

      const bytes = writeMidiFile([conductorRaw, trackRaw], song.timebase)
      const trackLabel = track.name && track.name.length > 0 ? track.name : `track-${index}`
      
      midiBuffers.push({
        buffer: bytes.buffer,
        name: `${trackLabel}.mid`
      })
    })

    return midiBuffers
  }, [getSong])

  // Helper function to check if error is network-related
  const isNetworkError = (error: any): boolean => {
    return (
      error.message?.includes("fetch") ||
      error.message?.includes("network") ||
      error.message?.includes("NetworkError") ||
      error.message?.includes("Failed to fetch") ||
      error.name === "TypeError" && error.message.includes("fetch")
    )
  }

  // Helper function to check if error is JWT-related
  const isAuthError = (status: number): boolean => {
    return status === 401 || status === 403
  }

  const saveAndUpload = useCallback(async (retryCount: number = 0) => {
    if (isUploading) return

    setIsUploading(true)

    try {
      // 1. Check if we have midi_project_data in localStorage
      const midiProjectDataStr = localStorage.getItem("midi_project_data")
      if (!midiProjectDataStr) {
        throw new Error("No project data found. This feature is only available for projects opened from Audio Melody Weaver.")
      }

      const midiProjectData = JSON.parse(midiProjectDataStr)
      const projectId = midiProjectData.project_id
      if (!projectId) {
        throw new Error("No project ID found in project data.")
      }

      // 2. Get JWT token
      const jwt = localStorage.getItem("jwt_token_for_signal")
      if (!jwt) {
        throw new Error("Authentication token not found. Please return to Audio Melody Weaver and try again.")
      }

      // 3. Export current song to MIDI buffers
      const midiBuffers = exportCurrentSongToMidiBuffers()
      if (midiBuffers.length === 0) {
        throw new Error("No MIDI tracks to upload.")
      }

      // 4. Prepare FormData
      const formData = new FormData()
      midiBuffers.forEach((midiBuffer, index) => {
        const blob = new Blob([midiBuffer.buffer], { type: "audio/midi" })
        // FastAPI expects multiple files with the same name "files" for List[UploadFile]
        formData.append("files", blob, midiBuffer.name)
      })

      // 5. Call backend API
      const response = await fetch(`/api/projects/${projectId}/midi_tracks`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: formData,
      })

      if (!response.ok) {
        // Check for JWT expiration/authentication errors
        if (isAuthError(response.status)) {
          toast.error("Authentication expired. Please return to Audio Melody Weaver and sign in again.")
          // Clear invalid JWT
          localStorage.removeItem("jwt_token_for_signal")
          // Redirect to Audio Melody Weaver for re-authentication
          const audioMelodyWeaverUrl = `http://localhost:8081/login`
          window.open(audioMelodyWeaverUrl, '_blank')
          return
        }
        
        const errorText = await response.text()
        throw new Error(`Upload failed: ${response.status} - ${errorText}`)
      }

      // 6. Update localStorage with new project data
      const updatedProjectData = await response.json()
      localStorage.setItem("midi_project_data", JSON.stringify(updatedProjectData))

      // 7. Mark song as saved to prevent warning when closing tab
      setSaved(true)

      toast.success("🎉 Successfully saved to cloud!")
      
    } catch (error) {
      console.error("Save and upload error:", error)
      
      // Check if it's a network error and offer retry
      if (isNetworkError(error) && retryCount < 2) {
        setIsUploading(false)
        
        // Show retry dialog
        const shouldRetry = window.confirm(
          `Network error occurred. Would you like to retry? (Attempt ${retryCount + 1}/3)\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`
        )
        
        if (shouldRetry) {
          // Retry after 1 second delay
          setTimeout(() => {
            saveAndUpload(retryCount + 1)
          }, 1000)
          return
        }
      }
      
      toast.error(`Failed to save: ${(error as Error).message}`)
    } finally {
      setIsUploading(false)
    }
  }, [isUploading, exportCurrentSongToMidiBuffers, toast, setSaved, isNetworkError, isAuthError])

  return {
    saveAndUpload,
    isUploading,
  }
} 