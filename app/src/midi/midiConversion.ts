import { partition } from "lodash"
import groupBy from "lodash/groupBy"
import {
  AnyEvent,
  EndOfTrackEvent,
  MidiFile,
  read,
  StreamSource,
  write as writeMidiFile,
} from "midifile-ts"
import { isNotNull } from "../helpers/array"
import { downloadBlob } from "../helpers/Downloader"
import { addDeltaTime, toRawEvents } from "../helpers/toRawEvents"
import {
  addTick,
  tickedEventsToTrackEvents,
  toTrackEvents,
} from "../helpers/toTrackEvents"
import Song from "../song"
import Track, { AnyEventFeature } from "../track"

const DEFAULT_IMPORT_BPM = 90
const DEFAULT_IMPORT_USEC_PER_BEAT = Math.round(60000000 / DEFAULT_IMPORT_BPM)

const trackFromMidiEvents = (events: AnyEvent[]): Track => {
  const track = new Track()

  const channel = findChannel(events)
  if (channel !== undefined) {
    track.channel = channel
  }
  track.addEvents(toTrackEvents(events))

  return track
}

const tracksFromFormat0Events = (events: AnyEvent[]): Track[] => {
  const tickedEvents = addTick(events)
  const eventsPerChannel = groupBy(tickedEvents, (e) => {
    if ("channel" in e) {
      return e.channel + 1
    }
    return 0 // conductor track
  })
  const tracks: Track[] = []
  for (const channel of Object.keys(eventsPerChannel)) {
    const events = eventsPerChannel[channel]
    const ch = parseInt(channel)

    // Ensure default tempo exists on conductor track (channel index 0)
    if (
      ch === 0 &&
      !events.some(
        (e: any) => "subtype" in e && (e as any).subtype === "setTempo",
      )
    ) {
      events.push({
        type: "meta",
        subtype: "setTempo",
        microsecondsPerBeat: DEFAULT_IMPORT_USEC_PER_BEAT,
        tick: 0,
      } as any)
    }

    while (tracks.length <= ch) {
      const track = new Track()
      track.channel = ch > 0 ? ch - 1 : undefined
      tracks.push(track)
    }
    const track = tracks[ch]
    const trackEvents = tickedEventsToTrackEvents(events)
    track.addEvents(trackEvents)
  }
  return tracks
}

const findChannel = (events: AnyEvent[]) => {
  const chEvent = events.find((e) => {
    return e.type === "channel"
  })
  if (chEvent !== undefined && "channel" in chEvent) {
    return chEvent.channel
  }
  return undefined
}

const isConductorTrack = (track: AnyEvent[]) => findChannel(track) === undefined

const isConductorEvent = (e: AnyEventFeature) =>
  "subtype" in e && (e.subtype === "timeSignature" || e.subtype === "setTempo")

export const createConductorTrackIfNeeded = (
  tracks: AnyEvent[][],
): AnyEvent[][] => {
  // Find conductor track
  const [conductorTracks, normalTracks] = partition(tracks, isConductorTrack)

  // Create a conductor track if there is no conductor track
  if (conductorTracks.length === 0) {
    conductorTracks.push([])
  }

  const [conductorTrack, ...restTracks] = [
    ...conductorTracks,
    ...normalTracks,
  ].map(addTick)

  const newTracks = restTracks.map((track) =>
    track
      .map((e) => {
        // Collect all conductor events
        if (isConductorEvent(e)) {
          conductorTrack.push(e)
          return null
        }
        return e
      })
      .filter(isNotNull),
  )

  // Ensure default tempo exists on conductor track
  if (
    !conductorTrack.some(
      (e: any) => "subtype" in e && (e as any).subtype === "setTempo",
    )
  ) {
    conductorTrack.push({
      type: "meta",
      subtype: "setTempo",
      microsecondsPerBeat: DEFAULT_IMPORT_USEC_PER_BEAT,
      tick: 0,
    } as any)
  }

  return [conductorTrack, ...newTracks].map(addDeltaTime)
}

const getTracks = (midi: MidiFile): Track[] => {
  switch (midi.header.formatType) {
    case 0:
      return tracksFromFormat0Events(midi.tracks[0])
    case 1:
      return createConductorTrackIfNeeded(midi.tracks).map(trackFromMidiEvents)
    default:
      throw new Error(`Unsupported midi format ${midi.header.formatType}`)
  }
}

export function songFromMidi(data: StreamSource) {
  const song = new Song()
  const midi = read(data)

  getTracks(midi).forEach((t) => song.addTrack(t))

  if (midi.header.formatType === 1 && song.tracks.length > 0) {
    // Use the first track name as the song title
    const name = song.tracks[0].name
    if (name !== undefined) {
      song.name = name
    }
  }

  song.timebase = midi.header.ticksPerBeat

  return song
}

const setChannel =
  (channel: number) =>
  (e: AnyEvent): AnyEvent => {
    if (e.type === "channel") {
      return { ...e, channel }
    }
    return e
  }

export function songToMidiEvents(song: Song): AnyEvent[][] {
  const tracks = song.tracks
  return tracks.map((t) => {
    const endOfTrack: EndOfTrackEvent = {
      deltaTime: 0,
      type: "meta",
      subtype: "endOfTrack",
    }
    const rawEvents = [...toRawEvents(t.events), endOfTrack]
    if (t.channel !== undefined) {
      return rawEvents.map(setChannel(t.channel))
    }
    return rawEvents
  })
}

export function songToMidi(song: Song) {
  const rawTracks = songToMidiEvents(song)
  return writeMidiFile(rawTracks, song.timebase)
}

export function downloadSongAsMidi(song: Song) {
  const bytes = songToMidi(song)
  const blob = new Blob([bytes], { type: "application/octet-stream" })
  downloadBlob(blob, song.filepath.length > 0 ? song.filepath : "no name.mid")
}
