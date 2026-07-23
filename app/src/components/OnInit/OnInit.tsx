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
import { resolveEditorSession } from "../../services/editorSessionApi"
import {
  clearEditorSessionContext,
  setEditorSessionContext,
} from "../../services/editorSessionState"

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

  const loadMidiFromEditorSession = async (): Promise<boolean> => {
    // Extract project_id from URL: /projects/{project_id}/midi_tracks
    const urlMatch = window.location.pathname.match(/\/projects\/([^/]+)/)

    if (!urlMatch) {
      console.log("[OnInit] ❌ No project_id found in URL")
      console.log("[OnInit] Current URL:", window.location.pathname)
      return false
    }

    const projectId = decodeURIComponent(urlMatch[1])

    const params = new URLSearchParams(window.location.search)
    const sessionCode = params.get("code")

    if (params.has("token")) {
      console.error("[OnInit] ❌ Refusing legacy JWT token URL handoff")
      if (window.history.replaceState) {
        window.history.replaceState({}, "", window.location.pathname)
      }
      return false
    }

    if (!sessionCode) {
      return false
    }

    if (window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname)
    }

    try {
      const midiProjectData = await resolveEditorSession(sessionCode)

      if (midiProjectData.project_id !== projectId) {
        throw new Error(
          "This editor link does not match the requested project.",
        )
      }

      const midiTracks = midiProjectData.midi_tracks

      if (!midiTracks || midiTracks.length === 0) {
        throw new Error("This project does not have any MIDI tracks to edit.")
      }

      setEditorSessionContext({
        projectId,
        userType: midiProjectData.user_type,
      })

      // Now load the MIDI files
      const closeProgress = showProgress(localized["loading-external-midi"])

      try {
        // Fetch all MIDI files
        const fetchPromises = midiTracks.map(async (track) => {
          const response = await fetch(track.download_url, {
            credentials: "omit",
          })
          if (!response.ok) {
            throw new Error(
              `Failed to fetch MIDI file: ${response.status} ${response.statusText}`,
            )
          }

          const arrayBuffer = await response.arrayBuffer()
          return {
            arrayBuffer,
            name: track.name || `Track ${track.id}`,
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
      clearEditorSessionContext()
      console.error("[OnInit] ❌ Error loading MIDI from editor session:", e)
      setIsErrorDialogOpen(true)
      setErrorMessage((e as Error).message)
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
      const loadedFromSupabase = await loadMidiFromEditorSession()

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
