import { FC } from "react"
import { Dialog } from "./Dialog/Dialog"

interface UpgradePlanDialogProps {
  open: boolean
  onClose: () => void
}

export const UpgradePlanDialog: FC<UpgradePlanDialogProps> = ({
  open,
  onClose,
}) => {
  const plans = [
    {
      name: "Free Account",
      price: "$0",
      period: "forever",
      features: [
        "✓ Unlimited MIDI editing",
        "✓ Basic sequencer features",
        "✗ Download MIDI files",
        "✗ Advanced export options",
        "✗ Priority support",
      ],
      current: true,
    },
    {
      name: "Premium Account",
      price: "$9.99",
      period: "month",
      popular: true,
      features: [
        "✓ Unlimited MIDI editing",
        "✓ Advanced sequencer features",
        "✓ Download MIDI files",
        "✓ All export formats",
        "✓ Priority support",
      ],
      current: false,
    },
  ]

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
          Upgrade to Premium
        </h2>
        <p
          style={{
            color: "var(--color-text-secondary)",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          Unlock full MIDI download capabilities and advanced features
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                padding: "1.5rem",
                border: plan.current
                  ? "2px solid var(--color-theme)"
                  : "1px solid var(--color-border)",
                borderRadius: "8px",
                background: "var(--color-background)",
                position: "relative",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: "-10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--color-theme)",
                    color: "black",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  Most Popular
                </div>
              )}

              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <h3
                  style={{
                    color: "var(--color-text)",
                    fontSize: "1.25rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {plan.name}
                </h3>
                <div
                  style={{
                    color: "var(--color-text)",
                    fontSize: "2rem",
                    fontWeight: "bold",
                    marginBottom: "0.25rem",
                  }}
                >
                  {plan.price}
                  <span
                    style={{
                      fontSize: "1rem",
                      fontWeight: "normal",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    /{plan.period}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                {plan.features.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      color: feature.startsWith("✓")
                        ? "var(--color-text)"
                        : "var(--color-text-secondary)",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    {feature}
                  </div>
                ))}
              </div>

              <button
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  border: "none",
                  background: plan.current
                    ? "var(--color-background-secondary)"
                    : "var(--color-theme)",
                  color: plan.current ? "var(--color-text-secondary)" : "black",
                  fontWeight: "bold",
                  cursor: plan.current ? "not-allowed" : "pointer",
                }}
                disabled={plan.current}
                onClick={() => {
                  if (!plan.current) {
                    // For now, just close the dialog
                    // Later this will handle payment processing
                    onClose()
                  }
                }}
              >
                {plan.current ? "Current Plan" : "Upgrade Now"}
              </button>
            </div>
          ))}
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
