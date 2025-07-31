import styled from "@emotion/styled"
import { FC, useEffect } from "react"
import { useRouter } from "../../hooks/useRouter"
import { useStores } from "../../hooks/useStores"
import { ArrangeEditor } from "../ArrangeView/ArrangeEditor"
import { BuildInfo } from "../BuildInfo"
import { CloudFileDialog } from "../CloudFileDialog/CloudFileDialog"
import { ControlSettingDialog } from "../ControlSettingDialog/ControlSettingDialog"
import { ExportProgressDialog } from "../ExportDialog/ExportProgressDialog"
import { Head } from "../Head/Head"
import { HelpDialog } from "../Help/HelpDialog"
import { Navigation } from "../Navigation/Navigation"
import { OnBeforeUnload } from "../OnBeforeUnload/OnBeforeUnload"
import { OnInit } from "../OnInit/OnInit"
import { PianoRollEditor } from "../PianoRoll/PianoRollEditor"
import { PublishDialog } from "../PublishDialog/PublishDialog"
import { SettingDialog } from "../SettingDialog/SettingDialog"
import { SignInDialog } from "../SignInDialog/SignInDialog"
import { TempoEditor } from "../TempoGraph/TempoEditor"
import { TransportPanel } from "../TransportPanel/TransportPanel"
import { DeleteAccountDialog } from "../UserSettingsDialog/DeleteAccountDialog"
import { UserSettingsDialog } from "../UserSettingsDialog/UserSettingsDialog"
import { DropZone } from "./DropZone"
import { loadMidi } from "../../midi/midiLoader"

const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
`

const Column = styled.div`
  height: 100%;
  display: flex;
  flex-grow: 1;
  flex-direction: column;
`

const Routes: FC = () => {
  const { path } = useRouter()
  const { songStore } = useStores()

  useEffect(() => {
    // When the editor is loaded, try to load MIDI data from localStorage
    if (path === "/edit") {
      const data = localStorage.getItem("midi_project_data")
      if (data) {
        try {
          const { midi_tracks } = JSON.parse(data)
          if (midi_tracks && midi_tracks.length > 0) {
            loadMidi(midi_tracks[0].url, songStore)
            // It's a good practice to clean up the data after loading it
            // to avoid reloading it on subsequent visits to /edit.
            localStorage.removeItem("midi_project_data")
          }
        } catch (e) {
          console.error("Failed to parse midi_project_data", e)
        }
      }
    }
  }, [path, songStore])

  return (
    <>
      {path === "/edit" && <PianoRollEditor />}
      {path === "/track" && <PianoRollEditor />}
      {path === "/tempo" && <TempoEditor />}
      {path === "/arrange" && <ArrangeEditor />}
    </>
  )
}

export const RootView: FC = () => (
  <>
    <DropZone>
      <Column>
        <Navigation />
        <Container>
          <Routes />
          <TransportPanel />
          <BuildInfo />
        </Container>
      </Column>
    </DropZone>
    <HelpDialog />
    <ExportProgressDialog />
    <Head />
    <SignInDialog />
    <CloudFileDialog />
    <SettingDialog />
    <ControlSettingDialog />
    <OnInit />
    <OnBeforeUnload />
    <PublishDialog />
    <UserSettingsDialog />
    <DeleteAccountDialog />
  </>
)
