import { useEffect, useState } from "react";

export default function Variant3CardBuild({ progress }) {
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    if (progress < 15) setPhase(1);
    else if (progress < 30) setPhase(2);
    else if (progress < 45) setPhase(3);
    else if (progress < 60) setPhase(4);
    else if (progress < 75) setPhase(5);
    else setPhase(6);
  }, [progress]);

  return (
    <div className="variant variant-card-build">
      <div className="v3-assembly-area">
        {/* Base card layer */}
        <div className={`v3-card-layer v3-base ${phase >= 1 ? "build" : ""}`} />

        {/* Chip installation */}
        {phase >= 2 && (
          <div className="v3-chip-installer">
            <div className="v3-chip-piece" />
            <div className="v3-installer-arm" />
          </div>
        )}

        {/* Magnetic stripe */}
        {phase >= 3 && <div className="v3-mag-stripe" />}

        {/* Card number printing */}
        {phase >= 4 && (
          <div className="v3-number-printer">
            <div className="v3-card-number">4111 **** **** 1234</div>
            <div className="v3-print-head" />
          </div>
        )}

        {/* Hologram application */}
        {phase >= 5 && (
          <div className="v3-hologram">
            <div className="v3-holo-shimmer" />
          </div>
        )}

        {/* Final quality check */}
        {phase >= 6 && (
          <div className="v3-qc-scanner">
            <div className="v3-scan-beam" />
            <div className="v3-qc-result">✓ VERIFIED</div>
          </div>
        )}
      </div>

      {/* Assembly progress text */}
      <div className="v3-progress-text">
        {phase === 1 && "PRINTING BASE LAYER"}
        {phase === 2 && "INSTALLING CHIP"}
        {phase === 3 && "APPLYING MAG STRIPE"}
        {phase === 4 && "ENCODING CARD NUMBER"}
        {phase === 5 && "ADDING SECURITY HOLOGRAM"}
        {phase === 6 && "QUALITY CHECK COMPLETE"}
      </div>

      {/* Technical specs sidebar */}
      <div className="v3-specs">
        <div className="v3-spec-item">
          <span>MATERIAL:</span> PVC-PETG
        </div>
        <div className="v3-spec-item">
          <span>CHIP:</span> EMV COMPLIANT
        </div>
        <div className="v3-spec-item">
          <span>SECURITY:</span> AES-256
        </div>
      </div>
    </div>
  );
}