const SIGNAL_EDITOR_SESSION_KEY = "signal_editor_session"
const DEFAULT_DAWIFY_API_BASE_URL = "/api"

export interface Project {
  id: string
  user_id?: string
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

export class DawifyHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = "DawifyHttpError"
  }
}

export class SignalSessionExpiredError extends Error {
  constructor() {
    super(
      "Your Signal editor session expired. Return to Audio Melody Weaver and reopen the editor.",
    )
    this.name = "SignalSessionExpiredError"
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const isFutureTimestamp = (value: unknown): value is string => {
  if (!isNonEmptyString(value)) {
    return false
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > Date.now()
}

const isProject = (value: unknown): value is Project =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.title)

const isMidiTrack = (value: unknown): value is MidiTrack =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.project_id) &&
  isNonEmptyString(value.name) &&
  isNonEmptyString(value.file_path)

export const isSignalEditorSession = (
  value: unknown,
): value is SignalEditorSessionExchangeResponse =>
  isRecord(value) &&
  isNonEmptyString(value.project_id) &&
  isProject(value.project) &&
  Array.isArray(value.midi_tracks) &&
  value.midi_tracks.every(isMidiTrack) &&
  isNonEmptyString(value.editor_access_token) &&
  isFutureTimestamp(value.expires_at)

export const getDawifyApiBaseUrl = () => {
  const hasConfiguredValue = Object.prototype.hasOwnProperty.call(
    process.env,
    "REACT_APP_DAWIFY_API_BASE_URL",
  )
  const rawConfigured = process.env.REACT_APP_DAWIFY_API_BASE_URL

  if (hasConfiguredValue) {
    const configured = rawConfigured?.trim()
    if (!configured) {
      throw new Error(
        "REACT_APP_DAWIFY_API_BASE_URL is set but blank. Remove it to use /api, or set an absolute http(s) URL.",
      )
    }

    if (configured.startsWith("/")) {
      return configured.replace(/\/+$/, "") || "/"
    }

    try {
      const url = new URL(configured)
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("unsupported protocol")
      }
    } catch {
      throw new Error(
        "REACT_APP_DAWIFY_API_BASE_URL must be an absolute http(s) URL or a root-relative path.",
      )
    }

    return configured.replace(/\/+$/, "")
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "REACT_APP_DAWIFY_API_BASE_URL is not set; using /api rewrite for Dawify requests.",
    )
  }

  return DEFAULT_DAWIFY_API_BASE_URL
}

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    throw new DawifyHttpError(
      `Dawify returned ${response.status} ${response.statusText || "without JSON"}. Please return to Audio Melody Weaver and reopen the editor.`,
      response.status,
    )
  }
}

const readErrorMessage = async (response: Response) => {
  try {
    const data = await response.json()
    if (isRecord(data) && isNonEmptyString(data.detail)) {
      return data.detail
    }
    if (isRecord(data) && isNonEmptyString(data.message)) {
      return data.message
    }
  } catch {
    try {
      const text = await response.text()
      if (text.trim()) {
        return text.trim()
      }
    } catch {
      // Fall through to the generic message below.
    }
  }

  return response.statusText || "Dawify request failed"
}

const isTransientError = (error: unknown) =>
  error instanceof TypeError ||
  (error instanceof DawifyHttpError && error.status >= 500)

export const isAuthError = (error: unknown) =>
  error instanceof DawifyHttpError &&
  (error.status === 401 || error.status === 403)

export const writeSignalEditorSession = (
  session: SignalEditorSessionExchangeResponse,
) => {
  if (!isSignalEditorSession(session)) {
    throw new Error("Dawify returned an invalid Signal editor session.")
  }

  sessionStorage.setItem(SIGNAL_EDITOR_SESSION_KEY, JSON.stringify(session))
}

export const readSignalEditorSession =
  (): SignalEditorSessionExchangeResponse | null => {
    const stored = sessionStorage.getItem(SIGNAL_EDITOR_SESSION_KEY)
    if (!stored) {
      return null
    }

    try {
      const parsed = JSON.parse(stored)
      if (!isSignalEditorSession(parsed)) {
        sessionStorage.removeItem(SIGNAL_EDITOR_SESSION_KEY)
        return null
      }
      return parsed
    } catch {
      sessionStorage.removeItem(SIGNAL_EDITOR_SESSION_KEY)
      return null
    }
  }

export const ensureSignalEditorSessionActive = (
  session: SignalEditorSessionExchangeResponse,
) => {
  if (!isFutureTimestamp(session.expires_at)) {
    sessionStorage.removeItem(SIGNAL_EDITOR_SESSION_KEY)
    throw new SignalSessionExpiredError()
  }
}

export const exchangeSignalEditorSession = async (
  projectId: string,
  code: string,
  attempts = 3,
): Promise<SignalEditorSessionExchangeResponse> => {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
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
        const message = await readErrorMessage(response)
        throw new DawifyHttpError(
          `Signal session exchange failed: ${message}`,
          response.status,
        )
      }

      const data = await readJson(response)
      if (!isSignalEditorSession(data)) {
        throw new Error("Dawify returned an invalid Signal editor session.")
      }

      return data
    } catch (error) {
      lastError = error

      if (attempt >= attempts - 1 || !isTransientError(error)) {
        break
      }

      await delay(400 * (attempt + 1))
    }
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error("Signal session exchange failed.")
}

export const updateSignalEditorMidiTracks = async (
  projectId: string,
  editorAccessToken: string,
  formData: FormData,
): Promise<{ midi_tracks?: MidiTrack[] }> => {
  const response = await fetch(
    `${getDawifyApiBaseUrl()}/signal/editor-sessions/${encodeURIComponent(projectId)}/midi_tracks`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${editorAccessToken}`,
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new DawifyHttpError(`Upload failed: ${message}`, response.status)
  }

  const data = await readJson(response)
  return isRecord(data) ? (data as { midi_tracks?: MidiTrack[] }) : {}
}
