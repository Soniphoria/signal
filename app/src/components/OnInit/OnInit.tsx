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
import {
  exchangeSignalEditorSession,
  writeSignalEditorSession,
} from "../../lib/dawify"

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

  const loadMidiFromSupabase = async (): Promise<boolean> => {
    // Extract project_id from URL: /projects/{project_id}/midi_tracks
    const urlMatch = window.location.pathname.match(/\/projects\/([^/]+)/)

    if (!urlMatch) {
      console.log("[OnInit] ❌ No project_id found in URL")
      console.log("[OnInit] Current URL:", window.location.pathname)
      return false
    }

    const projectId = urlMatch[1]

    const params = new URLSearchParams(window.location.search)
    const sessionCode = params.get("code")

    if (!sessionCode) {
      console.error("[OnInit] ❌ No Signal editor session code found in URL")
      console.error("[OnInit] URL search params:", window.location.search)
      return false
    }

    try {
      const editorSession = await exchangeSignalEditorSession(
        projectId,
        sessionCode,
      )
      const midiTracks = editorSession.midi_tracks

      if (!midiTracks || midiTracks.length === 0) {
        console.warn("[OnInit] ⚠️ No MIDI tracks found for project:", projectId)
        return false
      }

      writeSignalEditorSession(editorSession)

      // Now load the MIDI files
      const closeProgress = showProgress(localized["loading-external-midi"])

      try {
        // Fetch all MIDI files
        const fetchPromises = midiTracks.map(async (track: any) => {
          const url = track.file_path

          // Extract blob path from Azure URL: https://account.blob.core.windows.net/container/blob_path
          const urlObj = new URL(url)
          const pathParts = urlObj.pathname
            .split("/")
            .filter((part) => part !== "")

          // Find the container name and extract everything after it as the blob path
          const containerIndex = pathParts.findIndex(
            (part) => part === "dawify-output",
          )
          let blobPath = ""

          if (containerIndex !== -1 && containerIndex < pathParts.length - 1) {
            // Get everything after the container name
            blobPath = pathParts.slice(containerIndex + 1).join("/")
          } else {
            // Fallback to old logic for backward compatibility
            blobPath = pathParts[pathParts.length - 1]
          }

          // Use /azure-proxy for Vercel deployment (matches vercel.json rewrite rule)
          const proxyUrl = `/azure-proxy/${blobPath}`

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
            const tempoEvents =
              song.conductorTrack.events.filter(isSetTempoEvent)
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

          console.log(
            "[OnInit] Using conductor track:",
            firstTempoTrack ? "from MIDI file" : "default",
          )

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

        // Clean up URL parameters for security. The code is one-time and already consumed.
        if (window.history.replaceState) {
          const cleanUrl = window.location.pathname
          window.history.replaceState({}, "", cleanUrl)
          console.log("[OnInit] 🧹 Cleaned Signal session code from URL")
        }

        // Check if we're on the /projects/{project_id}/midi_tracks route or /track route
        const pathMatch =
          window.location.pathname.match(/^\/projects\/[^/]+\/midi_tracks/) ||
          window.location.pathname === "/track"
        if (pathMatch) {
          // Force a re-render of the piano roll editor without changing the URL
          setTimeout(() => {
            window.dispatchEvent(new Event("resize"))
          }, 100)
        }

        closeProgress()
        return true // Song loaded successfully
      } catch (midiError) {
        console.error("[OnInit] ❌ Error loading MIDI files:", midiError)
        closeProgress()
        throw midiError // Re-throw to be caught by outer catch
      }
    } catch (e) {
      console.error("[OnInit] ❌ Error loading MIDI from Supabase:", e)
      setIsErrorDialogOpen(true)
      setErrorMessage(
        `${(e as Error).message} Return to Audio Melody Weaver and reopen the editor.`,
      )
      return false
    }
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

      // Try to load from Supabase first
      const loadedFromSupabase = await loadMidiFromSupabase()

      // Only try to load external MIDI if we haven't loaded from Supabase
      if (!loadedFromSupabase) {
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
