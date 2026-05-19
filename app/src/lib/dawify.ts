const getDawifyApiBaseUrl = () =>
  (process.env.REACT_APP_DAWIFY_API_BASE_URL || "/api").replace(/\/+$/, "")

export interface Project {
  id: string
  user_id: string
  title: string
  artist?: string
  created_at?: string
  updated_at?: string
}

export interface MidiTrack {
  id: string
  project_id: string
  name: string
  file_path: string
  notes_data?: any
  color?: string
  created_at?: string
  updated_at?: string
}

export interface SignalEditorSessionExchangeResponse {
  project_id: string
  project: Project
  midi_tracks: MidiTrack[]
  editor_access_token: string
  expires_at: string
}

export const exchangeSignalEditorSession = async (
  projectId: string,
  code: string,
): Promise<SignalEditorSessionExchangeResponse> => {
  const response = await fetch(
    `${getDawifyApiBaseUrl()}/signal/editor-sessions/exchange`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
        code,
      }),
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      `Signal session exchange failed: ${response.status} ${message}`,
    )
  }

  return response.json()
}

export const updateSignalEditorMidiTracks = async (
  projectId: string,
  editorAccessToken: string,
  formData: FormData,
) => {
  const response = await fetch(
    `${getDawifyApiBaseUrl()}/signal/editor-sessions/${projectId}/midi_tracks`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${editorAccessToken}`,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Upload failed: ${response.status} - ${message}`)
  }

  return response.json()
}
