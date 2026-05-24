import React, { useState, useEffect } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function RemloWalletModal({ isOpen, onClose }: Props) {
  const { connect, connectors, error } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [loadingConnectorId, setLoadingConnectorId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) setLoadingConnectorId(null);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="rainbowkit-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "grid", placeItems: "center" }}
    >
      <div className="rainbowkit-modal" style={{ width: 560, maxWidth: "92%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden" }} aria-hidden>
                {/* inline SVG logo used in CSS too */}
                <svg width="36" height="36" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                  <rect rx="10" width="64" height="64" fill="#6366f1" />
                  <text x="50%" y="55%" fontSize="34" fill="white" fontFamily="Arial,Helvetica,sans-serif" textAnchor="middle" dominantBaseline="middle">R</text>
                </svg>
              </div>
              <div>
                <div style={{ color: "#fff", fontWeight: 800 }}>Connect a wallet</div>
                <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 13 }}>Securely connect your wallet to continue</div>
              </div>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ border: "none", background: "transparent" }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, display: "grid", placeItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M6 18L18 6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        </div>

        <div style={{ padding: "8px 20px 20px" }}>
          {isConnected && (
            <div style={{ marginBottom: 12, color: "rgba(255,255,255,0.85)" }}>
              Connected: {address}
              <button onClick={() => disconnect()} style={{ marginLeft: 12, color: "#9aa2ff" }}>
                Disconnect
              </button>
            </div>
          )}

          <div>
            {connectors.map((c) => {
              const isBusy = loadingConnectorId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={async () => {
                    setLoadingConnectorId(c.id);
                    try {
                      await connect({ connector: c });
                    } finally {
                      setLoadingConnectorId(null);
                    }
                  }}
                  disabled={!c.ready}
                  className="connect-modal__wallet"
                  style={{ width: "100%", textAlign: "left", marginBottom: 10 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="wallet-icon" aria-hidden>
                      {/* prefer connector.iconType if present, fall back to initials */}
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.04)", display: "grid", placeItems: "center", color: "white", fontWeight: 700 }}>
                        {c.name?.charAt(0) ?? "W"}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="wallet-name">{c.name}</div>
                      <div className="wallet-desc">{c.ready ? "Connect with" : "Unavailable"}</div>
                    </div>
                    <div style={{ marginLeft: 8 }}>
                      {isBusy ? (
                        <div style={{ color: "#9aa2ff" }}>Connecting…</div>
                      ) : (
                        <div style={{ color: c.ready ? "#9aa2ff" : "rgba(255,255,255,0.35)" }}>{c.ready ? "Connect" : "Soon"}</div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {error && <div style={{ color: "#ff7b7b", marginTop: 8 }}>{(error as any).message}</div>}

          <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>Powered by Arc Network</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>v1</div>
          </div>
        </div>
      </div>
    </div>
  );
}
