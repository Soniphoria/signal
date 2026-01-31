import { FC } from "react"
import { Dialog } from "./Dialog/Dialog"
import { useUserPermissions } from "../hooks/useUserPermissions"

interface UpgradePlanDialogProps {
  open: boolean
  onClose: () => void
}

export const UpgradePlanDialog: FC<UpgradePlanDialogProps> = ({
  open,
  onClose,
}) => {
  const { userType } = useUserPermissions()

  const handleGoToAudioMelodyWeaver = () => {
    // Open Audio Melody Weaver in a new tab
    window.open("http://localhost:8081", "_blank")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div
        style={{
          background: "var(--color-background-dark)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "2rem",
          maxWidth: "600px",
          width: "90vw",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <h2
          style={{
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: "1rem",
            fontSize: "1.5rem",
          }}
        >
          🚀 Upgrade to Premium
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            textAlign: "center",
            marginBottom: "1.5rem",
            fontSize: "1rem",
          }}
        >
          To access download features and upgrade your account, please follow these steps:
        </p>

        <div
          style={{
            background: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3
            style={{
              color: "var(--color-text)",
              fontSize: "1.1rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            📋 How to Upgrade:
          </h3>
          
          <div
            style={{
              color: "var(--color-text-secondary)",
              lineHeight: "1.6",
            }}
          >
            <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "flex-start" }}>
              <span style={{ color: "var(--color-theme)", fontWeight: "bold", marginRight: "8px" }}>1.</span>
              <span>Go to the <strong style={{ color: "var(--color-text)" }}>Audio Tracks Dashboard</strong></span>
            </div>
            
            <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "flex-start" }}>
              <span style={{ color: "var(--color-theme)", fontWeight: "bold", marginRight: "8px" }}>2.</span>
              <span>Click on <strong style={{ color: "var(--color-text)" }}>User Profile</strong> in the top right corner</span>
            </div>
            
            <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "flex-start" }}>
              <span style={{ color: "var(--color-theme)", fontWeight: "bold", marginRight: "8px" }}>3.</span>
              <span>Select <strong style={{ color: "var(--color-text)" }}>Upgrade Plan</strong> to enable premium features</span>
            </div>
            <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "flex-start" }}>
              <span style={{ color: "var(--color-theme)", fontWeight: "bold", marginRight: "8px" }}>3.</span>
              <span>Reload <strong style={{ color: "var(--color-text)" }}>this page</strong> to access premium features</span>
            </div>
          </div>

          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "var(--color-background-secondary)",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
            }}
          >
            <h4 style={{ color: "var(--color-text)", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
              💎 Premium Features:
            </h4>
            <ul style={{ 
              color: "var(--color-text-secondary)", 
              fontSize: "0.85rem", 
              paddingLeft: "1rem",
              margin: 0,
              lineHeight: "1.4"
            }}>
              <li>Download MIDI files</li>
              <li>Download audio tracks</li>
              <li>Export as Mix (coming soon)</li>
              <li>Up to 100 projects</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <button
            onClick={handleGoToAudioMelodyWeaver}
            style={{
              padding: "0.75rem 2rem",
              background: "var(--color-theme)",
              color: "black",
              border: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            🎵 Go to Audio Tracks Dashboard
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  )
}
