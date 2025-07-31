import { read, MidiFile } from "midifile-ts";
import Song from "../song/Song";
import Track from "../track";
import { SongStore } from "../stores/SongStore";
import { NoteEvent, TrackEvent } from "../track/TrackEvent";

const songFromMidi = (midi: MidiFile): Song => {
  const song = new Song();
  song.timebase = midi.header.ticksPerBeat;

  midi.tracks.forEach((midiTrack: any, i: number) => {
    const track = new Track();
    track.channel = i;

    const notes: { [key: number]: NoteEvent & { tick: number } } = {};

    for (const event of midiTrack) {
      if (event.type === "channel") {
        switch (event.subtype) {
          case "noteOn":
            const noteOnEvent: NoteEvent & { tick: number } = {
              type: "channel",
              subtype: "note",
              id: 0, // This should be properly managed
              tick: event.tick,
              duration: 0, // Will be set by noteOff
              noteNumber: event.noteNumber,
              velocity: event.velocity,
            };
            notes[event.noteNumber] = noteOnEvent;
            track.addEvent(noteOnEvent);
            break;
          case "noteOff":
            const note = notes[event.noteNumber];
            if (note) {
              note.duration = event.tick - note.tick;
              delete notes[event.noteNumber];
            }
            break;
          case "programChange":
            const programChangeEvent: TrackEvent = {
              type: "channel",
              subtype: "programChange",
              id: 0, // Manage ID
              tick: event.tick,
              value: event.programNumber,
            } as TrackEvent;
            track.addEvent(programChangeEvent);
            break;
        }
      }
    }
    song.addTrack(track);
  });

  return song;
};

export const loadMidi = async (url: string, store: SongStore) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch MIDI file from ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const midi = read(arrayBuffer);
    const song = songFromMidi(midi);
    store.song = song;
  } catch (error) {
    console.error("Error loading MIDI file:", error);
  }
}; 