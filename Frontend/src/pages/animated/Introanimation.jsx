import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./IntroAnimation.css";

const DURATION = 10000; // 10 seconds

/* ═══════════════════════════════════════════════════════════
   COMBINED JOURNEY
   Card Assembly (0–34%) → POS Payment (34–67%) → Transfer (67–100%)
═══════════════════════════════════════════════════════════ */
function CombinedJourney({ progress }) {
  const phase = progress < 34 ? 1 : progress < 67 ? 2 : 3;

  // Card assembly sub-stages (within 0–34%)
  const buildPhase =
  progress < 5  ? 1 :   // base card + logo
  progress < 13 ? 2 :   // chip install
  progress < 22 ? 3 :   // number print (was 19, shifted)
  progress < 29 ? 4 :   // hologram (was 26)
                  5;    // verified stamp (was 6)

  const posApproved = progress >= 56;   // approval at ~5.6s
  const delivered = progress >= 94;   // completion stamp at ~9.4s

  const packets = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    top: 18 + (i * 61) % 64,
    delay: i * 0.22,
    dur: 1.3 + (i % 3) * 0.25,
  }));

  return (
    <div className="variant variant-combined">
      {/* Phase-change flash */}
      <div key={phase} className="vc-flash" />

      {/* ── PHASE 1 · CARD ASSEMBLY ── */}
      {phase === 1 && (
        <div className="vc-scene">
          <div className="v3-assembly-area">
            <div className="v3-card-layer v3-base build">
              {/* Logo appears first */}
              {buildPhase >= 1 && <div className="v3-card-logo">VISA</div>}

              {buildPhase >= 2 && <div className="v3-chip-piece" />}
              {/* Mag stripe removed — was here at buildPhase >= 3 */}
              {buildPhase >= 3 && <div className="v3-card-number">4111 5234 •••• 8901</div>}
              {buildPhase >= 4 && (
                <div className="v3-hologram"><div className="v3-holo-shimmer" /></div>
              )}
            </div>

            {buildPhase === 2 && (
              <div className="v3-chip-installer"><div className="v3-installer-arm" /></div>
            )}

            {buildPhase >= 5 && (
              <div className="v3-qc-scanner">
                <div className="vc-scan-beam" />
                <div className="vc-qc-result">✓ VERIFIED</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PHASE 2 · POS PAYMENT ── */}
      {phase === 2 && (
        <div className="vc-scene variant-pos">
          <div className="v1-pos-terminal">
            <div className="v1-screen">
              <div className="v1-amount">$1,250.00</div>
              <div className="v1-status">{posApproved ? "✓ APPROVED" : "PROCESSING..."}</div>
            </div>
            <div className="v1-card-slot">
              <div className="v1-card-swipe" />
            </div>
            <div className="v1-keypad">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="v1-key" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>

            {posApproved && (
              <div className="vc-approved-overlay">
                <svg className="vc-checkmark" viewBox="0 0 52 52">
                  <circle className="vc-check-circle" cx="26" cy="26" r="24" fill="none" />
                  <path className="vc-check-path" fill="none" d="M14 27l8 8 16-17" />
                </svg>
              </div>
            )}
          </div>

          <div className="v1-credit-card">
            <div className="v1-card-chip" />
            <div className="v1-card-num">4111 5234 •••• 8901</div>
          </div>
        </div>
      )}

      {/* ── PHASE 3 · ISSUER → ACQUIRER ── */}
{phase === 3 && (
  <div className="vc-scene">
    <div className="v5-device v5-source">
      <div className="v5-device-screen"><div className="v5-hologram-emitter" /></div>
      <div className="v5-device-label">ISSUER BANK</div>
    </div>

    <div className="v5-transfer-zone">
      <div className="v5-beam-core" />
      <div className="v5-holo-grid" />
      
      {/* ISO 8583 Message Packets */}
      {[
        { mti: "0100", de39: "--", label: "Auth Request", delay: 0, top: 15 },
        { mti: "0110", de39: "00", label: "Auth Response", delay: 1.8, top: 35 },
        { mti: "0200", de39: "--", label: "Financial Req", delay: 3.6, top: 55 },
        { mti: "0210", de39: "00", label: "Financial Resp", delay: 5.4, top: 75 },
      ].map((msg, i) => (
        <div
          key={i}
          className="v5-iso-packet"
          style={{
            top: `${msg.top}%`,
            animationDelay: `${msg.delay}s`,
          }}
        >
          <div className="v5-iso-header">
            <span className="v5-iso-mti">MTI {msg.mti}</span>
            <span className="v5-iso-de39">DE39: {msg.de39}</span>
          </div>
          <div className="v5-iso-body">
            <div className="v5-iso-line">PAN: •••• •••• •••• 8901</div>
            <div className="v5-iso-line">AMT: $1,250.00</div>
            <div className="v5-iso-line">TRACE: 483921</div>
          </div>
          <div className="v5-iso-label">{msg.label}</div>
        </div>
      ))}
    </div>

    <div className="v5-device v5-destination">
      <div className="v5-device-screen"><div className="v5-hologram-receiver" /></div>
      <div className="v5-device-label">ACQUIRER BANK</div>
    </div>

    <div className="v5-stats">
      <div className="v5-stat">
        <div className="v5-stat-label">PROTOCOL</div>
        <div className="v5-stat-value">ISO 8583</div>
      </div>
      <div className="v5-stat">
        <div className="v5-stat-label">MESSAGES</div>
        <div className="v5-stat-value">4 SENT</div>
      </div>
      <div className="v5-stat">
        <div className="v5-stat-label">LATENCY</div>
        <div className="v5-stat-value">2.4ms</div>
      </div>
    </div>

    {delivered && <div className="vc-delivered">✓ TRANSACTION COMPLETE</div>}
  </div>
)}

      {/* Phase pills — BUILD → PAY → SEND */}
      <div className="vc-phase-pills">
        <span className={`vc-pill ${phase === 1 ? "on" : phase > 1 ? "done" : ""}`}>BUILD</span>
        <span className="vc-pill-sep" />
        <span className={`vc-pill ${phase === 2 ? "on" : phase > 2 ? "done" : ""}`}>PAY</span>
        <span className="vc-pill-sep" />
        <span className={`vc-pill ${phase === 3 ? "on" : ""}`}>SEND</span>
      </div>

      {/* Bottom status */}
      {phase < 3 && (
        <div className="vc-status-text">
          {phase === 1 && "MANUFACTURING SECURE CARD"}
          {phase === 2 && (posApproved ? "PAYMENT APPROVED" : "PROCESSING PAYMENT")}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — Always plays the combined journey
═══════════════════════════════════════════════════════════ */
export default function IntroAnimation() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [progress, setProgress] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef(null);

  const finishIntro = useCallback(() => {
    setRedirecting(true);
    setTimeout(() => navigate(user ? "/dashboard" : "/login", { replace: true }), 600);
  }, [navigate, user]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min((elapsed / DURATION) * 100, 100));
      if (elapsed >= DURATION) { finishIntro(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [finishIntro]);

  return (
    <div className="intro-root">
      <button className="intro-skip" onClick={finishIntro}>SKIP ›</button>
      <div className="intro-progress" style={{ width: `${progress}%` }} />
      <CombinedJourney progress={progress} />
      {redirecting && <div className="redirect-overlay" />}
    </div>
  );
}