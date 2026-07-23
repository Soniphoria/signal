import type { SignalUserType } from "./editorSessionApi"

export interface EditorSessionContext {
  projectId: string
  userType: SignalUserType
}

export const EDITOR_SESSION_CONTEXT_CHANGED = "signal:editor-session-context"

let currentContext: EditorSessionContext | null = null

export const getEditorSessionContext = (): EditorSessionContext | null =>
  currentContext

export const setEditorSessionContext = (
  context: EditorSessionContext,
): void => {
  currentContext = context
  window.dispatchEvent(
    new CustomEvent<EditorSessionContext>(EDITOR_SESSION_CONTEXT_CHANGED, {
      detail: context,
    }),
  )
}

export const clearEditorSessionContext = (): void => {
  currentContext = null
  window.dispatchEvent(
    new CustomEvent<null>(EDITOR_SESSION_CONTEXT_CHANGED, { detail: null }),
  )
}
