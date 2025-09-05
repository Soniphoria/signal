import styled from "@emotion/styled"
import DownloadIcon from "mdi-react/DownloadIcon"
import CloudUploadIcon from "mdi-react/CloudUploadIcon"
import Forum from "mdi-react/ForumIcon"
import Help from "mdi-react/HelpCircleIcon"
import Settings from "mdi-react/SettingsIcon"
import { CSSProperties, FC, useCallback, useState } from "react"
import { hasFSAccess } from "../../actions/file"
import { getPlatform, isRunningInElectron } from "../../helpers/platform"
import { useRootView } from "../../hooks/useRootView"
import { useRouter } from "../../hooks/useRouter"
import { useSongFile } from "../../hooks/useSongFile"
import { useSaveAndUpload } from "../../hooks/useSaveAndUpload"
import { useUserPermissions } from "../../hooks/useUserPermissions"
import ArrangeIcon from "../../images/icons/arrange.svg"
import PianoIcon from "../../images/icons/piano.svg"
import TempoIcon from "../../images/icons/tempo.svg"
import { envString } from "../../localize/envString"
import { Localized } from "../../localize/useLocalization"
import { Tooltip } from "../ui/Tooltip"
import { EditMenuButton } from "./EditMenuButton"
import { FileMenuButton } from "./FileMenuButton"
import { UserButton } from "./UserButton"
import { UpgradePlanDialog } from "../UpgradePlanDialog"

const Container = styled.div`
  display: flex;
  flex-direction: row;
  background: var(--color-background-dark);
  height: 3rem;
  flex-shrink: 0;
  -webkit-app-region: drag;
  padding: ${() => {
    if (isRunningInElectron()) {
      const platform = getPlatform()
      switch (platform) {
        case "Windows":
          return "0 0 0 0"
        case "macOS":
          return "0 0 0 76px"
      }
    }
  }};
`

export const Tab = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center; 
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  border-top: solid 0.1rem transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  -webkit-app-region: none;

  &.active {
    color: var(--color-text);
    background: var(--color-background);
    border-top-color: var(--color-theme);
  }

  &:hover {
    background: var(--color-highlight);
  }

  a {
    color: inherit;
    text-decoration: none;
  }
}
`

export const TabTitle = styled.span`
  margin-left: 0.5rem;

  @media (max-width: 850px) {
    display: none;
  }
`

const FlexibleSpacer = styled.div`
  flex-grow: 1;
`

export const IconStyle: CSSProperties = {
  width: "1.3rem",
  height: "1.3rem",
  fill: "currentColor",
}

export const Navigation: FC = () => {
  const { setOpenSettingDialog, setOpenHelpDialog } = useRootView()
  const { path, setPath } = useRouter()
  const { saveSong, downloadSong } = useSongFile()
  const { saveAndUpload, isUploading } = useSaveAndUpload()
  const { canDownload } = useUserPermissions()
  const [upgradePlanOpen, setUpgradePlanOpen] = useState(false)

  // Wrapper function for onClick event that doesn't pass parameters
  const handleSaveAndUpload = () => {
    saveAndUpload() // Call without parameters to start with retryCount = 0
  }

  const onClickPianoRollTab = useCallback(() => {
    setPath("/track")
  }, [setPath])

  const onClickArrangeTab = useCallback(() => {
    setPath("/arrange")
  }, [setPath])

  const onClickTempoTab = useCallback(() => {
    setPath("/tempo")
  }, [setPath])

  const onClickSettings = useCallback(() => {
    setOpenSettingDialog(true)
  }, [setOpenSettingDialog])

  const onClickHelp = useCallback(() => {
    setOpenHelpDialog(true)
  }, [setOpenHelpDialog])

  const onClickSaveOrDownload = useCallback(() => {
    if (!canDownload) {
      setUpgradePlanOpen(true)
      return
    }

    if (hasFSAccess) {
      saveSong()
    } else {
      downloadSong()
    }
  }, [saveSong, downloadSong, canDownload])

  return (
    <Container>
      {!isRunningInElectron() && <FileMenuButton />}
      {!isRunningInElectron() && <EditMenuButton />}

      <Tooltip
        title={
          <>
            <Localized name="switch-tab" /> [{envString.cmdOrCtrl}+1]
          </>
        }
        delayDuration={500}
      >
        <Tab
          className={path === "/track" ? "active" : undefined}
          onMouseDown={onClickPianoRollTab}
        >
          <PianoIcon style={IconStyle} viewBox="0 0 128 128" />
          <TabTitle>
            <Localized name="piano-roll" />
          </TabTitle>
        </Tab>
      </Tooltip>

      <Tooltip
        title={
          <>
            <Localized name="switch-tab" /> [{envString.cmdOrCtrl}+2]
          </>
        }
        delayDuration={500}
      >
        <Tab
          className={path === "/arrange" ? "active" : undefined}
          onMouseDown={onClickArrangeTab}
        >
          <ArrangeIcon style={IconStyle} viewBox="0 0 128 128" />
          <TabTitle>
            <Localized name="arrange" />
          </TabTitle>
        </Tab>
      </Tooltip>

      <Tooltip
        title={
          <>
            <Localized name="switch-tab" /> [{envString.cmdOrCtrl}+3]
          </>
        }
        delayDuration={500}
      >
        <Tab
          className={path === "/tempo" ? "active" : undefined}
          onMouseDown={onClickTempoTab}
        >
          <TempoIcon style={IconStyle} viewBox="0 0 128 128" />
          <TabTitle>
            <Localized name="tempo" />
          </TabTitle>
        </Tab>
      </Tooltip>

      <Tab
        onMouseDown={onClickSaveOrDownload}
        style={{
          backgroundColor: "rgb(157 255 32 / 0.8)",
          color: "black",
        }}
      >
        <DownloadIcon style={IconStyle} />
        <TabTitle>Download</TabTitle>
      </Tab>

      <Tab
        onMouseDown={isUploading ? undefined : handleSaveAndUpload}
        style={{
          backgroundColor: isUploading
            ? "rgb(157 255 32 / 0.5)"
            : "rgb(32 157 255 / 0.8)",
          color: "white",
          cursor: isUploading ? "not-allowed" : "pointer",
          opacity: isUploading ? 0.7 : 1,
        }}
      >
        {isUploading ? (
          <div
            style={{
              width: "1.3rem",
              height: "1.3rem",
              border: "2px solid transparent",
              borderTop: "2px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        ) : (
          <CloudUploadIcon style={IconStyle} />
        )}
        <TabTitle>{isUploading ? "Uploading..." : "Save to Cloud"}</TabTitle>
      </Tab>

      <FlexibleSpacer />

      {!isRunningInElectron() && (
        <>
          <Tab onClick={onClickSettings}>
            <Settings style={IconStyle} />
            <TabTitle>
              <Localized name="settings" />
            </TabTitle>
          </Tab>

          <Tab onClick={onClickHelp}>
            <Help style={IconStyle} />
            <TabTitle>
              <Localized name="help" />
            </TabTitle>
          </Tab>

          <Tab>
            <Forum style={IconStyle} />
            <TabTitle>
              <a
                href="https://discord.gg/XQxzNdDJse"
                target="_blank"
                rel="noreferrer"
              >
                Discord
              </a>
            </TabTitle>
          </Tab>
        </>
      )}

      <UserButton />
      <UpgradePlanDialog
        open={upgradePlanOpen}
        onClose={() => setUpgradePlanOpen(false)}
      />
    </Container>
  )
}
