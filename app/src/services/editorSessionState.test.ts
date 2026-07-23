import {
  clearEditorSessionContext,
  getEditorSessionContext,
  setEditorSessionContext,
} from "./editorSessionState"

describe("editor session state", () => {
  beforeAll(() => {
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        dispatchEvent: jest.fn(),
      },
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
      },
    })
    if (typeof globalThis.CustomEvent === "undefined") {
      Object.defineProperty(globalThis, "CustomEvent", {
        configurable: true,
        value: class<T> extends Event {
          detail: T

          constructor(type: string, init: CustomEventInit<T>) {
            super(type)
            this.detail = init.detail as T
          }
        },
      })
    }
  })

  afterEach(() => clearEditorSessionContext())

  it("keeps only non-secret project and entitlement context in memory", () => {
    setEditorSessionContext({ projectId: "project-1", userType: "admin" })

    expect(getEditorSessionContext()).toEqual({
      projectId: "project-1",
      userType: "admin",
    })
    expect(localStorage.getItem("jwt_token_for_signal")).toBeNull()
    expect(localStorage.getItem("midi_project_data")).toBeNull()
    expect(localStorage.getItem("signal_user_type")).toBeNull()
  })
})
