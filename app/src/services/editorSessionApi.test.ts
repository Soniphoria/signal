import { resolveEditorSession } from "./editorSessionApi"

describe("resolveEditorSession", () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it("redeems the code through the same-origin API proxy with cookies", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          project_id: "project-1",
          title: "Song",
          midi_tracks: [
            {
              id: "track-1",
              project_id: "project-1",
              name: "Piano",
              file_path: "users/user-1/projects/project-1/midi/piano.mid",
              download_url: "https://r2.example.test/piano.mid?signed=true",
            },
          ],
          download_urls: ["https://r2.example.test/piano.mid?signed=true"],
          user_type: "premium",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    )

    const result = await resolveEditorSession("code/value")

    expect(result.user_type).toBe("premium")
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/editor-sessions/code%2Fvalue/resolve",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    )
  })

  it("rejects invalid or replayed session codes without exposing server details", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 404 }))

    await expect(resolveEditorSession("x".repeat(32))).rejects.toThrow(
      /invalid, expired, or has already been used/i,
    )
  })
})
