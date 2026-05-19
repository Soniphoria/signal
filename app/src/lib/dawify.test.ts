import {
  exchangeSignalEditorSession,
  ensureSignalEditorSessionActive,
  readSignalEditorSession,
  SignalSessionExpiredError,
  writeSignalEditorSession,
} from "./dawify"

const validSession = {
  project_id: "project-1",
  project: {
    id: "project-1",
    user_id: "user-1",
    title: "Song",
  },
  midi_tracks: [
    {
      id: "midi-1",
      project_id: "project-1",
      name: "Piano",
      file_path: "https://example.test/piano.mid",
    },
  ],
  editor_access_token: "scoped-token",
  expires_at: new Date(Date.now() + 60_000).toISOString(),
}

describe("Dawify Signal session client", () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    ;(global as any).sessionStorage = {
      clear: jest.fn(() => values.clear()),
      getItem: jest.fn((key: string) => values.get(key) ?? null),
      removeItem: jest.fn((key: string) => values.delete(key)),
      setItem: jest.fn((key: string, value: string) => {
        values.set(key, value)
      }),
    }
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-05-18T20:00:00Z"))
    process.env.REACT_APP_DAWIFY_API_BASE_URL = "https://dawify.example.test"
    sessionStorage.clear()
    ;(global.fetch as jest.Mock | undefined) = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    delete process.env.REACT_APP_DAWIFY_API_BASE_URL
  })

  it("validates exchange responses before storing them", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ ...validSession, editor_access_token: "" }),
    })

    await expect(
      exchangeSignalEditorSession("project-1", "code", 1),
    ).rejects.toThrow("invalid Signal editor session")
  })

  it("retries transient exchange failures", async () => {
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validSession,
      })

    const promise = exchangeSignalEditorSession("project-1", "code")
    await jest.advanceTimersByTimeAsync(400)

    await expect(promise).resolves.toEqual(validSession)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it("stores one validated sessionStorage object", () => {
    writeSignalEditorSession(validSession)

    expect(sessionStorage.getItem("signal_editor_session")).toBeTruthy()
    expect(sessionStorage.getItem("signal_editor_access_token")).toBeNull()
    expect(readSignalEditorSession()).toEqual(validSession)
  })

  it("drops expired stored sessions", () => {
    sessionStorage.setItem(
      "signal_editor_session",
      JSON.stringify({
        ...validSession,
        expires_at: "2026-05-18T19:00:00Z",
      }),
    )

    expect(readSignalEditorSession()).toBeNull()
  })

  it("rejects expired sessions before save", () => {
    expect(() =>
      ensureSignalEditorSessionActive({
        ...validSession,
        expires_at: "2026-05-18T19:00:00Z",
      }),
    ).toThrow(SignalSessionExpiredError)
  })
})
