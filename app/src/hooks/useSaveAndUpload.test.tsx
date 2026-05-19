/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react"
import { useSaveAndUpload } from "./useSaveAndUpload"
import {
  ensureSignalEditorSessionActive,
  readSignalEditorSession,
  SignalSessionExpiredError,
  updateSignalEditorMidiTracks,
} from "../lib/dawify"

const toast = {
  error: jest.fn(),
  success: jest.fn(),
}
const setSaved = jest.fn()

jest.mock("dialog-hooks", () => ({
  useToast: () => toast,
}))

jest.mock("./useSong", () => ({
  useSong: () => ({
    getSong: () => ({
      conductorTrack: null,
      timebase: 480,
      tracks: [
        {
          name: "Piano",
          events: [],
          isConductorTrack: false,
          channel: 0,
        },
      ],
    }),
    setSaved,
  }),
}))

jest.mock("../helpers/toRawEvents", () => ({
  toRawEvents: () => [],
}))

jest.mock("midifile-ts", () => ({
  write: () => new Uint8Array([0, 1, 2, 3]),
}))

jest.mock("../lib/dawify", () => {
  const actual = jest.requireActual("../lib/dawify")
  return {
    ...actual,
    ensureSignalEditorSessionActive: jest.fn(),
    readSignalEditorSession: jest.fn(),
    updateSignalEditorMidiTracks: jest.fn(),
    writeSignalEditorSession: jest.fn(),
  }
})

describe("useSaveAndUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(readSignalEditorSession as jest.Mock).mockReturnValue({
      project_id: "project-1",
      project: { id: "project-1", title: "Song" },
      midi_tracks: [],
      editor_access_token: "scoped-token",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    ;(updateSignalEditorMidiTracks as jest.Mock).mockResolvedValue({
      midi_tracks: [],
    })
  })

  it("rechecks session expiry after MIDI export and before save-back", async () => {
    ;(ensureSignalEditorSessionActive as jest.Mock)
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new SignalSessionExpiredError()
      })

    const { result } = renderHook(() => useSaveAndUpload())

    await act(async () => {
      await result.current.saveAndUpload()
    })

    expect(ensureSignalEditorSessionActive).toHaveBeenCalledTimes(2)
    expect(updateSignalEditorMidiTracks).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      "Signal editor session expired. Return to Audio Melody Weaver and reopen the editor.",
    )
  })
})
