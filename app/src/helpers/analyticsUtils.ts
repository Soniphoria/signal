import { Analytics } from "./analytics"

// GA4 Event Names for Signal MIDI Editor
export const SIGNAL_GA4_EVENTS = {
  // MIDI Editor Core Events
  MIDI_FILE_LOAD: "midi_file_load",
  MIDI_FILE_SAVE: "midi_file_save",
  MIDI_FILE_EXPORT: "midi_file_export",
  MIDI_FILE_NEW: "midi_file_new",

  // Editing Events
  NOTE_ADD: "note_add",
  NOTE_DELETE: "note_delete",
  NOTE_EDIT: "note_edit",
  NOTE_SELECT: "note_select",

  // Playback Events
  PLAYBACK_START: "playback_start",
  PLAYBACK_STOP: "playback_stop",
  PLAYBACK_PAUSE: "playback_pause",
  PLAYBACK_SEEK: "playback_seek",

  // Track Management
  TRACK_ADD: "track_add",
  TRACK_DELETE: "track_delete",
  TRACK_MUTE: "track_mute",
  TRACK_SOLO: "track_solo",
  TRACK_INSTRUMENT_CHANGE: "track_instrument_change",

  // View Events
  VIEW_CHANGE: "view_change",
  ZOOM_CHANGE: "zoom_change",
  SCROLL_CHANGE: "scroll_change",

  // Tool Events
  TOOL_SELECT: "tool_select",
  QUANTIZE_APPLY: "quantize_apply",

  // Tempo and Time Signature
  TEMPO_CHANGE: "tempo_change",
  TIME_SIGNATURE_CHANGE: "time_signature_change",

  // Cloud/Collaboration Events
  CLOUD_SAVE: "cloud_save",
  CLOUD_LOAD: "cloud_load",
  PROJECT_SHARE: "project_share",

  // Authentication Events
  USER_SIGN_IN: "user_sign_in",
  USER_SIGN_OUT: "user_sign_out",

  // Settings Events
  SETTINGS_OPEN: "settings_open",
  SOUNDFONT_CHANGE: "soundfont_change",
  MIDI_DEVICE_CONNECT: "midi_device_connect",

  // Error Events
  ERROR_MIDI_LOAD: "error_midi_load",
  ERROR_PLAYBACK: "error_playback",
  ERROR_EXPORT: "error_export",
} as const

export type SignalGA4EventName = keyof typeof SIGNAL_GA4_EVENTS

// Utility class for Signal-specific analytics
export class SignalAnalytics {
  // File Operations
  static trackFileOperation(
    operation: "load" | "save" | "export" | "new",
    fileSize?: number,
    success: boolean = true,
  ) {
    const eventMap = {
      load: SIGNAL_GA4_EVENTS.MIDI_FILE_LOAD,
      save: SIGNAL_GA4_EVENTS.MIDI_FILE_SAVE,
      export: SIGNAL_GA4_EVENTS.MIDI_FILE_EXPORT,
      new: SIGNAL_GA4_EVENTS.MIDI_FILE_NEW,
    }

    Analytics.trackEvent(eventMap[operation], {
      file_size: fileSize,
      success,
      operation_type: operation,
    })
  }

  // Note Editing
  static trackNoteOperation(
    operation: "add" | "delete" | "edit" | "select",
    noteCount?: number,
    trackId?: string,
  ) {
    const eventMap = {
      add: SIGNAL_GA4_EVENTS.NOTE_ADD,
      delete: SIGNAL_GA4_EVENTS.NOTE_DELETE,
      edit: SIGNAL_GA4_EVENTS.NOTE_EDIT,
      select: SIGNAL_GA4_EVENTS.NOTE_SELECT,
    }

    Analytics.trackEvent(eventMap[operation], {
      note_count: noteCount,
      track_id: trackId,
      operation_type: operation,
    })
  }

  // Playback Control
  static trackPlayback(
    action: "start" | "stop" | "pause" | "seek",
    currentTime?: number,
    totalDuration?: number,
  ) {
    const eventMap = {
      start: SIGNAL_GA4_EVENTS.PLAYBACK_START,
      stop: SIGNAL_GA4_EVENTS.PLAYBACK_STOP,
      pause: SIGNAL_GA4_EVENTS.PLAYBACK_PAUSE,
      seek: SIGNAL_GA4_EVENTS.PLAYBACK_SEEK,
    }

    Analytics.trackEvent(eventMap[action], {
      current_time: currentTime,
      total_duration: totalDuration,
      playback_action: action,
    })
  }

  // Track Management
  static trackTrackOperation(
    operation: "add" | "delete" | "mute" | "solo" | "instrument_change",
    trackId?: string,
    instrumentName?: string,
  ) {
    const eventMap = {
      add: SIGNAL_GA4_EVENTS.TRACK_ADD,
      delete: SIGNAL_GA4_EVENTS.TRACK_DELETE,
      mute: SIGNAL_GA4_EVENTS.TRACK_MUTE,
      solo: SIGNAL_GA4_EVENTS.TRACK_SOLO,
      instrument_change: SIGNAL_GA4_EVENTS.TRACK_INSTRUMENT_CHANGE,
    }

    Analytics.trackEvent(eventMap[operation], {
      track_id: trackId,
      instrument_name: instrumentName,
      operation_type: operation,
    })
  }

  // UI Interactions
  static trackUIInteraction(
    interaction:
      | "view_change"
      | "zoom_change"
      | "scroll_change"
      | "tool_select",
    value?: string | number,
  ) {
    const eventMap = {
      view_change: SIGNAL_GA4_EVENTS.VIEW_CHANGE,
      zoom_change: SIGNAL_GA4_EVENTS.ZOOM_CHANGE,
      scroll_change: SIGNAL_GA4_EVENTS.SCROLL_CHANGE,
      tool_select: SIGNAL_GA4_EVENTS.TOOL_SELECT,
    }

    Analytics.trackEvent(eventMap[interaction], {
      interaction_value: value,
      interaction_type: interaction,
    })
  }

  // Musical Operations
  static trackMusicalOperation(
    operation: "tempo_change" | "time_signature_change" | "quantize_apply",
    value?: number,
    details?: string,
  ) {
    const eventMap = {
      tempo_change: SIGNAL_GA4_EVENTS.TEMPO_CHANGE,
      time_signature_change: SIGNAL_GA4_EVENTS.TIME_SIGNATURE_CHANGE,
      quantize_apply: SIGNAL_GA4_EVENTS.QUANTIZE_APPLY,
    }

    Analytics.trackEvent(eventMap[operation], {
      value,
      details,
      operation_type: operation,
    })
  }

  // Cloud Operations
  static trackCloudOperation(
    operation: "save" | "load" | "share",
    success: boolean = true,
    projectId?: string,
  ) {
    const eventMap = {
      save: SIGNAL_GA4_EVENTS.CLOUD_SAVE,
      load: SIGNAL_GA4_EVENTS.CLOUD_LOAD,
      share: SIGNAL_GA4_EVENTS.PROJECT_SHARE,
    }

    Analytics.trackEvent(eventMap[operation], {
      success,
      project_id: projectId,
      cloud_operation: operation,
    })
  }

  // Error Tracking
  static trackError(
    errorType: "midi_load" | "playback" | "export",
    errorMessage?: string,
    context?: string,
  ) {
    const eventMap = {
      midi_load: SIGNAL_GA4_EVENTS.ERROR_MIDI_LOAD,
      playback: SIGNAL_GA4_EVENTS.ERROR_PLAYBACK,
      export: SIGNAL_GA4_EVENTS.ERROR_EXPORT,
    }

    Analytics.trackEvent(eventMap[errorType], {
      error_message: errorMessage,
      error_context: context,
      error_type: errorType,
    })
  }

  // Settings and Configuration
  static trackSettings(
    setting: "soundfont_change" | "midi_device_connect",
    value?: string,
  ) {
    const eventMap = {
      soundfont_change: SIGNAL_GA4_EVENTS.SOUNDFONT_CHANGE,
      midi_device_connect: SIGNAL_GA4_EVENTS.MIDI_DEVICE_CONNECT,
    }

    Analytics.trackEvent(eventMap[setting], {
      setting_value: value,
      setting_type: setting,
    })
  }

  // Authentication
  static trackAuth(action: "sign_in" | "sign_out", method?: string) {
    const eventMap = {
      sign_in: SIGNAL_GA4_EVENTS.USER_SIGN_IN,
      sign_out: SIGNAL_GA4_EVENTS.USER_SIGN_OUT,
    }

    Analytics.trackEvent(eventMap[action], {
      method: method || "unknown",
      auth_action: action,
    })
  }
}
