import styled from "@emotion/styled"
import { FC } from "react"
import { useRouter } from "../../hooks/useRouter"
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
