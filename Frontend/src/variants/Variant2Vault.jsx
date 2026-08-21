import { useEffect, useState } from "react";

export default function Variant2Vault({ progress }) {
  const [stage, setStage] = useState(1);

  useEffect(() => {
    if (progress < 20) setStage(1);
    else if (progress < 40) setStage(2);
    else if (progress < 60) setStage(3);
    else if (progress < 80) setStage(4);
    else setStage(5);
  }, [progress]);

  return (
    <div className="variant variant-vault">
      {/* Vault door */}
      <div className={`v2-vault-door ${stage >= 3 ? "opening" : ""}`}>
        <div className="v2-door-left">
          <div className="v2-vault-handle" />
          {/* Locking bolts */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`v2-bolt v2-bolt-${i + 1} ${stage >= 2 ? "retract" : ""}`}
            />
          ))}
        </div>
        <div className="v2-door-right">
          <div className="v2-combination-lock">
            <div className={`v2-dial ${stage >= 1 ? "spin" : ""}`}>
              {[...Array(10)].map((_, i) => (
                <div key={i} className="v2-dial-mark" style={{ transform: `rotate(${i * 36}deg)` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Light beam revealing contents */}
      {stage >= 4 && (
        <div className="v2-light-reveal">
          <div className="v2-light-beam" />
        </div>
      )}

      {/* Floating data assets */}
      {stage >= 5 && (
        <div className="v2-vault-contents">
          {["💳", "🔒", "💰", "📊"].map((icon, i) => (
            <div
              key={i}
              className="v2-floating-asset"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {icon}
            </div>
          ))}
        </div>
      )}

      {/* Status text */}
      <div className="v2-status-text">
        {stage === 1 && "AUTHENTICATING..."}
        {stage === 2 && "UNLOCKING BOLTS"}
        {stage === 3 && "VAULT OPENING"}
        {stage === 4 && "ACCESSING SECURE DATA"}
        {stage === 5 && "ACCESS GRANTED"}
      </div>
    </div>
  );
}