import { useProgress } from "dialog-hooks"
import { FC, useEffect, useState } from "react"
import { useSetSong } from "../../actions"
import { useLoadSongFromExternalMidiFile } from "../../actions/cloudSong"
import { songFromArrayBuffer } from "../../actions/file"
import { isRunningInElectron } from "../../helpers/platform"
import { useStores } from "../../hooks/useStores"
import { useLocalization } from "../../localize/useLocalization"
import { useRouter } from "../../hooks/useRouter"
import { InitializeErrorDialog } from "./InitializeErrorDialog"

export const OnInit: FC = () => {
  const rootStore = useStores()
  const setSong = useSetSong()
  const loadSongFromExternalMidiFile = useLoadSongFromExternalMidiFile()
  const { setPath } = useRouter()

  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const { show: showProgress } = useProgress()
  const localized = useLocalization()

  const init = async () => {
    const closeProgress = showProgress(localized["initializing"])
    try {
      await rootStore.init()
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
        const url = midi_tracks[0].file_path
        const proxyUrl = "/azure-proxy" + new URL(url).pathname
        console.log("[OnInit] Fetching MIDI from:", proxyUrl)
        
        const response = await fetch(proxyUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch MIDI file: ${response.status} ${response.statusText}`)
        }
        
        console.log("[OnInit] MIDI fetch successful, parsing...")
        const arrayBuffer = await response.arrayBuffer()
        const song = songFromArrayBuffer(arrayBuffer, "downloaded.mid")
        setSong(song)
        localStorage.removeItem("midi_project_data")
        console.log("[OnInit] MIDI song loaded successfully")

        // Check if we're on the /projects/{project_id}/midi_tracks route or /track route
        const pathMatch = window.location.pathname.match(/^\/projects\/[^/]+\/midi_tracks/) || window.location.pathname === '/track'
        if (pathMatch) {
          console.log("[OnInit] On piano roll route, triggering re-render")
          // Force a re-render of the piano roll editor without changing the URL
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
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
    return false // Failed to load song
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
