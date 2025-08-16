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
      const loaded = await loadMidiFromLocalStorageIfNeeded()
      if (!loaded) {
        await rootStore.init()
      }
    } catch (e) {
      setIsErrorDialogOpen(true)
      setErrorMessage((e as Error).message)
    } finally {
      closeProgress()
    }
  }

  const loadMidiFromLocalStorageIfNeeded = async (): Promise<boolean> => {
    const data = localStorage.getItem("midi_project_data")
    if (!data) {
      console.log("[OnInit] No midi_project_data found in localStorage")
      return false
    }

    console.log("[OnInit] Found midi_project_data, starting to load...")
    const closeProgress = showProgress(localized["loading-external-midi"])
    try {
      const { midi_tracks } = JSON.parse(data)
      console.log("[OnInit] Parsed midi_tracks:", midi_tracks)

      if (midi_tracks && midi_tracks.length > 0) {
        console.log(`[OnInit] Loading ${midi_tracks.length} MIDI files...`)

        // Fetch all MIDI files
        const fetchPromises = midi_tracks.map(async (track: any) => {
          const url = track.file_path
          const proxyUrl = "/azure-proxy" + new URL(url).pathname
          console.log("[OnInit] Fetching MIDI from:", proxyUrl)

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

          const mainConductorTrack = firstTempoTrack
            ? firstTempoTrack.clone()
            : conductorTrack()

          // Add conductor track
          song.addTrack(mainConductorTrack)

          // Add all imported tracks
          newTracks.forEach((track) => song.addTrack(track))

          song.name = "imported midi files"
          song.isSaved = false
          setSong(song)
        }

        localStorage.removeItem("midi_project_data")
        console.log("[OnInit] MIDI song(s) loaded successfully")

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
