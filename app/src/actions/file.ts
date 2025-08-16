import { flatMap } from "lodash"
import { isNotUndefined } from "../helpers/array"
import { basename } from "../helpers/path"
import { songFromMidi, songToMidi } from "../midi/midiConversion"
import { writeFile } from "../services/fs-helper"
import Song, { emptySong } from "../song"
import Track from "../track"
import { useSetSong } from "./song"

// URL parameter for automation purposes used in scripts/perf/index.js
// /edit?disableFileSystem=true
export const disableFileSystem =
  new URL(window.location.href).searchParams.get("disableFileSystem") === "true"

export const hasFSAccess =
  ("chooseFileSystemEntries" in window || "showOpenFilePicker" in window) &&
  !disableFileSystem

export const useOpenFile = () => {
  const setSong = useSetSong()

  return async () => {
    let fileHandles: FileSystemFileHandle[]
    try {
      fileHandles = await window.showOpenFilePicker({
        types: [
          {
            description: "MIDI file",
            accept: { "audio/midi": [".mid"] },
          },
        ],
        multiple: true,
      })
    } catch (ex) {
      if ((ex as Error).name === "AbortError") {
        return
      }
      const msg = "An error occured trying to open the file."
      console.error(msg, ex)
      alert(msg)
      return
    }

    if (fileHandles.length === 1) {
      const file = await fileHandles[0].getFile()
      const song = await songFromFile(file)
      song.fileHandle = fileHandles[0]
      setSong(song)
    } else {
      const files = await Promise.all(fileHandles.map((h) => h.getFile()))
      const song = await songsFromFiles(files)
      song.fileHandle = null // File handle is not available for multiple files
      setSong(song)
    }
  }
}

export const songsFromFiles = async (files: File[]): Promise<Song> => {
  const songs = await Promise.all(files.map(songFromFile))
  const tracks = flatMap(songs, (s) => s.tracks).filter(isNotUndefined)
  const newTracks = tracks.map((t, i) => {
    const track = new Track()
    track.addEvents([...t.events])
    track.channel = i
    return track
  })
  const song = emptySong()
  newTracks.forEach((t) => song.addTrack(t))
  song.name = "imported midi files"
  return song
}

export const songFromFile = async (file: File) =>
  songFromArrayBuffer(
    await file.arrayBuffer(),
    "path" in file ? (file.path as string) : undefined,
    file.name,
  )

// Use the file name without extension as the song title
const getNameFromPathOrName = (pathOrName: string) => {
  return basename(pathOrName)?.replace(/\.[^/.]+$/, "") ?? ""
}

export const songFromArrayBuffer = (
  content: ArrayBuffer,
  filePath?: string,
  name?: string,
) => {
  const song = songFromMidi(new Uint8Array(content))
  const pathOrName = filePath ?? name
  if (song.name.length === 0 && pathOrName) {
    // Use the file name without extension as the song title
    song.name = getNameFromPathOrName(pathOrName)
  }
  if (filePath) {
    song.filepath = filePath
  }
  song.isSaved = true
  return song
}

export const saveFile = async (song: Song) => {
  const fileHandle = song.fileHandle
  if (fileHandle === null) {
    await saveFileAs(song)
    return
  }

  const data = songToMidi(song).buffer
  try {
    await writeFile(fileHandle, data)
    song.isSaved = true
  } catch (e) {
    console.error(e)
    alert("unable to save file")
  }
}

export const saveFileAs = async (song: Song) => {
  let fileHandle
  try {
    fileHandle = await window.showSaveFilePicker({
      types: [
        {
          description: "MIDI file",
          accept: { "audio/midi": [".mid"] },
        },
      ],
    })
  } catch (ex) {
    if ((ex as Error).name === "AbortError") {
      return
    }
    const msg = "An error occured trying to open the file."
    console.error(msg, ex)
    alert(msg)
    return
  }
  try {
    const data = songToMidi(song).buffer
    await writeFile(fileHandle, data)
    song.fileHandle = fileHandle
    song.name = getNameFromPathOrName(fileHandle.name)
    song.isSaved = true
  } catch (ex) {
    const msg = "Unable to save file."
    console.error(msg, ex)
    alert(msg)
    return
  }
}
