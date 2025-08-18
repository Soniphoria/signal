import { useTheme } from "@emotion/react"
import { FC, useRef, useState } from "react"
import { isRunningInElectron } from "../../helpers/platform"
import { useAuth } from "../../hooks/useAuth"
import { useRootView } from "../../hooks/useRootView"
import { Localized } from "../../localize/useLocalization"
import { Dialog, DialogActions, DialogContent } from "../Dialog/Dialog"
import { Menu, MenuItem } from "../ui/Menu"
import { IconStyle, Tab, TabTitle } from "./Navigation"

const LogoDialog: FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <img
          src="/powerBySignal.png"
          alt="Powered by Signal"
          style={{ width: "100%", height: "auto" }}
        />
      </DialogContent>
      <DialogActions>
        <button onClick={() => onOpenChange(false)}>
          <Localized name="close" />
        </button>
      </DialogActions>
    </Dialog>
  )
}

export const UserButton: FC = () => {
  const { authUser: user, signOut } = useAuth()
  const { setOpenSignInDialog, setOpenUserSettingsDialog } = useRootView()
  const [open, setOpen] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)

  const onClickSignIn = () => {
    if (isRunningInElectron()) {
      window.electronAPI.openAuthWindow()
    } else {
      setOpenSignInDialog(true)
    }
    setOpen(false)
  }

  const onClickSignOut = async () => {
    await signOut()
    setOpen(false)
  }

  const onClickProfile = () => {
    if (user !== null) {
      window.open(`https://signal.vercel.app/users/${user.uid}`)
    }
    setOpen(false)
  }

  const onClickUserSettings = () => {
    setOpenUserSettingsDialog(true)
  }

  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)

  if (user === null) {
    return (
      <>
        <Tab
          onClick={() => setLogoOpen(true)}
          style={{
            width: "150px",
            padding: "0",
            cursor: "pointer",
          }}
        >
          <img
            src="/powerBySignal.png"
            alt="Powered by Signal"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        </Tab>
        <LogoDialog open={logoOpen} onOpenChange={setLogoOpen} />
      </>
    )
  }

  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Tab ref={ref}>
          <img
            style={{
              ...IconStyle,
              borderRadius: "0.65rem",
              border: `1px solid ${theme.dividerColor}`,
            }}
            src={user.photoURL ?? undefined}
          />
          <TabTitle>{user.displayName}</TabTitle>
        </Tab>
      }
    >
      <MenuItem onClick={onClickProfile}>
        <Localized name="profile" />
      </MenuItem>

      <MenuItem onClick={onClickUserSettings}>
        <Localized name="user-settings" />
      </MenuItem>

      <MenuItem onClick={onClickSignOut}>
        <Localized name="sign-out" />
      </MenuItem>
    </Menu>
  )
}
