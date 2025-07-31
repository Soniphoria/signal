import styled from "@emotion/styled"
import { FC, useEffect } from "react"
import { useRouter } from "../../hooks/useRouter"
import { useStores } from "../../hooks/useStores"
import { songFromArrayBuffer } from "../../actions/file"
import { useSetSong } from "../../actions/song"
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
  const setSong = useSetSong()

  useEffect(() => {
    if (path === "/edit") {
      const data = localStorage.getItem("midi_project_data")
      if (data) {
        try {
          const { midi_tracks } = JSON.parse(data)
          if (midi_tracks && midi_tracks.length > 0) {
            const url = midi_tracks[0].file_path

            // Use a proxy to fetch the MIDI file to avoid CORS issues
            const proxyUrl = "/azure-proxy" + new URL(url).pathname

            const load = async () => {
              const response = await fetch(proxyUrl)
              const arrayBuffer = await response.arrayBuffer()
              const song = songFromArrayBuffer(
                arrayBuffer,
                "downloaded.mid"
              )
              setSong(song)
            }

            load()
            localStorage.removeItem("midi_project_data")
          }
        } catch (e) {
          console.error("Failed to parse midi_project_data", e)
        }
      }
    }
  }, [path, songStore, setSong])

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
