import { useProgress } from "dialog-hooks"
import { FC, useEffect, useState } from "react"
import { useSetSong } from "../../actions"
import { useLoadSongFromExternalMidiFile } from "../../actions/cloudSong"
import { songFromArrayBuffer } from "../../actions/file"
import { isRunningInElectron } from "../../helpers/platform"
import { useStores } from "../../hooks/useStores"
import { useLocalization } from "../../localize/useLocalization"

import { InitializeErrorDialog } from "./InitializeErrorDialog"

import { flatMap } from "lodash"
import { isNotUndefined } from "../../helpers/array"
import Song from "../../song"
import { isSetTempoEvent } from "../../track"
import { conductorTrack } from "../../track/TrackFactory"

export const OnInit: FC = () => {
  const rootStore = useStores()
  const setSong = useSetSong()
  const loadSongFromExternalMidiFile = useLoadSongFromExternalMidiFile()

  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { show: showProgress } = useProgress()
  const localized = useLocalization()

  const init = async () => {
    const closeProgress = showProgress(localized["initializing"])
    try {
      // Always initialize the root store (including SoundFont)
      await rootStore.init()
    } catch (e) {
      setIsErrorDialogOpen(true)
      setErrorMessage((e as Error).message)
    } finally {
      closeProgress()
    }
  }

  const loadMidiFromLocalStorageIfNeeded = async (): Promise<boolean> => {
    // First, check if data is passed via query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const dataParam = urlParams.get('data')

    if (dataParam) {
      console.log("[OnInit] Found data in query parameter, extracting...")
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam))
        console.log("[OnInit] Decoded data from URL:", decodedData)

        // Store in localStorage for future use
        if (decodedData.midi_project_data) {
          localStorage.setItem('midi_project_data', JSON.stringify(decodedData.midi_project_data))
          console.log("[OnInit] Saved midi_project_data to localStorage")
        }
        if (decodedData.jwt_token) {
          localStorage.setItem('jwt_token_for_signal', decodedData.jwt_token)
          console.log("[OnInit] Saved JWT token to localStorage")
        }
        if (decodedData.user_type) {
          localStorage.setItem('signal_user_type', decodedData.user_type)
          console.log("[OnInit] Saved user type to localStorage:", decodedData.user_type)
        }

        // Clean up URL (remove query parameter)
        window.history.replaceState(null, '', window.location.pathname)
      } catch (e) {
        console.error("[OnInit] Failed to parse URL query parameter data:", e)
      }
    }

    // Now try to load from localStorage
    const data = localStorage.getItem("midi_project_data")
    if (!data) {
      console.log("[OnInit] No midi_project_data found in localStorage")
      console.log("[OnInit] Available localStorage keys:", Object.keys(localStorage))
      return false
    }

    console.log("[OnInit] Found midi_project_data, starting to load...")
    console.log("[OnInit] Raw midi_project_data:", data)
    const closeProgress = showProgress(localized["loading-external-midi"])
    try {
      const parsedData = JSON.parse(data)
      console.log("[OnInit] Parsed data:", parsedData)
      const { midi_tracks, project_id } = parsedData
      console.log("[OnInit] Parsed midi_tracks:", midi_tracks)
      console.log("[OnInit] Parsed project_id:", project_id)
      console.log("[OnInit] Current URL:", window.location.href)

      if (midi_tracks && midi_tracks.length > 0) {
        console.log(`[OnInit] Loading ${midi_tracks.length} MIDI files...`)

        // Fetch all MIDI files
        const fetchPromises = midi_tracks.map(async (track: any) => {
          const url = track.file_path
          console.log("[OnInit] Processing track:", track.name, "with URL:", url)

          // Extract blob path from Azure URL: https://account.blob.core.windows.net/container/blob_path
          const urlObj = new URL(url)
          const pathParts = urlObj.pathname.split("/").filter(part => part !== "")

          // Find the container name and extract everything after it as the blob path
          const containerIndex = pathParts.findIndex(part => part === "dawify-output")
          let blobPath = ""

          if (containerIndex !== -1 && containerIndex < pathParts.length - 1) {
            // Get everything after the container name
            blobPath = pathParts.slice(containerIndex + 1).join("/")
          } else {
            // Fallback to old logic for backward compatibility
            blobPath = pathParts[pathParts.length - 1]
          }

          // Use /api/azure-proxy for Vercel deployment
          const proxyUrl = `/api/azure-proxy?path=${encodeURIComponent(blobPath)}`
          console.log("[OnInit] Original URL:", url)
          console.log("[OnInit] Extracted blob path:", blobPath)
          console.log("[OnInit] Fetching MIDI from proxy:", proxyUrl)

          const response = await fetch(proxyUrl)
          if (!response.ok) {
            throw new Error(
              `Failed to fetch MIDI file: ${response.status} ${response.statusText}`,
            )
          }

          const arrayBuffer = await response.arrayBuffer()
          return {
            arrayBuffer,
            name: track.name || `Track ${track.id}` || "downloaded.mid",
          }
        })

        // Wait for all files to be fetched
        const midiFiles = await Promise.all(fetchPromises)
        console.log("[OnInit] All MIDI files fetched successfully")

        if (midiFiles.length === 1) {
          // Single file - use existing logic
          console.log("[OnInit] Single MIDI file detected, loading...")
          const song = songFromArrayBuffer(
            midiFiles[0].arrayBuffer,
            midiFiles[0].name,
          )
          console.log("[OnInit] Song loaded, checking tempo...")
          if (song.conductorTrack) {
            const tempoEvents = song.conductorTrack.events.filter(isSetTempoEvent)
            console.log("[OnInit] Single file - Tempo events:", tempoEvents)
          }
          setSong(song)
        } else {
          // Multiple files - combine them like songsFromFiles
          const songs = midiFiles.map((file) =>
            songFromArrayBuffer(file.arrayBuffer, file.name),
          )

          // Collect all non-conductor tracks
          const allTracks = flatMap(songs, (s) => s.tracks)
            .filter(isNotUndefined)
            .filter((track) => !track.isConductorTrack)

          // Track used channels to avoid conflicts
          const usedChannels = new Set<number>()

          const newTracks = allTracks.map((originalTrack) => {
            const track = originalTrack.clone()

            // Handle channel conflicts
            if (
              track.channel !== undefined &&
              usedChannels.has(track.channel)
            ) {
              let nextChannel = 0
              while (usedChannels.has(nextChannel) && nextChannel < 16) {
                nextChannel++
              }
              track.channel = nextChannel
            }

            if (track.channel !== undefined) {
              usedChannels.add(track.channel)
            }

            return track
          })

          // Create new Song instance
          const song = new Song()

          // Find first conductor track with tempo info
          console.log("[OnInit] Looking for conductor track with tempo info...")
          console.log("[OnInit] Number of songs:", songs.length)

          const firstTempoTrack = songs
            .flatMap((s) => s.tracks)
            .find(
              (track) =>
                track.isConductorTrack && track.events.some(isSetTempoEvent),
            )

          console.log("[OnInit] Found tempo track:", !!firstTempoTrack)
          if (firstTempoTrack) {
            const tempoEvents = firstTempoTrack.events.filter(isSetTempoEvent)
            console.log("[OnInit] Tempo events found:", tempoEvents)
            console.log("[OnInit] Number of tempo events:", tempoEvents.length)
          }

          const mainConductorTrack = firstTempoTrack
            ? firstTempoTrack.clone()
            : conductorTrack()

          console.log("[OnInit] Using conductor track:", firstTempoTrack ? "from MIDI file" : "default")

          // Add conductor track
          song.addTrack(mainConductorTrack)

          // Add all imported tracks
          newTracks.forEach((track) => song.addTrack(track))

          song.name = "imported midi files"
          song.isSaved = true // Mark as saved since it was loaded from cloud storage
          setSong(song)

          // Note: In a real implementation, you might want to set up a periodic check
          // or listen to song changes to automatically mark as unsaved when edited
        }

        // Don't remove midi_project_data - we need it for the "Save to Cloud" functionality
        // localStorage.removeItem("midi_project_data")
        console.log(
          "[OnInit] MIDI song(s) loaded successfully, keeping project data for save functionality",
        )

        // Check if we're on the /projects/{project_id}/midi_tracks route or /track route
        const pathMatch =
          window.location.pathname.match(/^\/projects\/[^/]+\/midi_tracks/) ||
          window.location.pathname === "/track"
        if (pathMatch) {
          console.log("[OnInit] On piano roll route, triggering re-render")
          // Force a re-render of the piano roll editor without changing the URL
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"))
          }, 100)
        }

        return true // Song loaded successfully
      } else {
        console.log("[OnInit] No valid midi_tracks found")
      }
    } catch (e) {
      console.error("[OnInit] Error loading MIDI:", e)
      setIsErrorDialogOpen(true)
      setErrorMessage((e as Error).message)
    } finally {
      console.log("[OnInit] Closing progress dialog")
      closeProgress()
    }

    return false
  }

  const loadExternalMidiIfNeeded = async () => {
    const params = new URLSearchParams(window.location.search)
    const openParam = params.get("open")

    if (openParam) {
      const closeProgress = showProgress(localized["loading-external-midi"])
      try {
        const song = await loadSongFromExternalMidiFile(openParam)
        setSong(song)
      } catch (e) {
        setIsErrorDialogOpen(true)
        setErrorMessage((e as Error).message)
      } finally {
        closeProgress()
      }
    }
  }

  const loadArgumentFileIfNeeded = async () => {
    if (!isRunningInElectron()) {
      return
    }
    const closeProgress = showProgress(localized["loading-file"])
    try {
      const filePath = await window.electronAPI.getArgument()
      if (filePath) {
        const data = await window.electronAPI.readFile(filePath)
        const song = songFromArrayBuffer(data, filePath)
        setSong(song)
      }
    } catch (e) {
      setIsErrorDialogOpen(true)
      setErrorMessage((e as Error).message)
    } finally {
      closeProgress()
    }
  }

  useEffect(() => {
    ;(async () => {
      // Always initialize the core first
      await init()

      // Try to load from localStorage first
      const loadedFromStorage = await loadMidiFromLocalStorageIfNeeded()

      // Only try to load external MIDI if we haven't loaded from storage
      if (!loadedFromStorage) {
        await loadExternalMidiIfNeeded()
        await loadArgumentFileIfNeeded()
      }
    })()
  }, [])

  return (
    <>
      <InitializeErrorDialog
        open={isErrorDialogOpen}
        message={errorMessage}
        onClose={() => setIsErrorDialogOpen(false)}
      />
    </>
  )
}
