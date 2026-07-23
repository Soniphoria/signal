export type SignalUserType = "free" | "premium" | "admin"

export interface EditorSessionMidiTrack {
  id: string
  project_id: string
  name: string
  file_path: string
  download_url: string
}

export interface EditorSessionResolveResponse {
  project_id: string
  title: string
  artist?: string | null
  midi_tracks: EditorSessionMidiTrack[]
  download_urls: string[]
  user_type: SignalUserType
}

const isUserType = (value: unknown): value is SignalUserType =>
  value === "free" || value === "premium" || value === "admin"

export const resolveEditorSession = async (
  code: string,
): Promise<EditorSessionResolveResponse> => {
  const response = await fetch(
    `/api/editor-sessions/${encodeURIComponent(code)}/resolve`,
    {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  )
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "This editor link is invalid, expired, or has already been used."
        : "The editor session could not be opened.",
    )
  }

  const payload =
    (await response.json()) as Partial<EditorSessionResolveResponse>
  if (
    typeof payload.project_id !== "string" ||
    !Array.isArray(payload.midi_tracks) ||
    !Array.isArray(payload.download_urls) ||
    !isUserType(payload.user_type)
  ) {
    throw new Error("The editor session response was invalid.")
  }
  for (const track of payload.midi_tracks) {
    if (
      !track ||
      typeof track.id !== "string" ||
      typeof track.project_id !== "string" ||
      typeof track.name !== "string" ||
      typeof track.download_url !== "string"
    ) {
      throw new Error(
        "The editor session response contained an invalid MIDI track.",
      )
    }
  }
  return payload as EditorSessionResolveResponse
}
