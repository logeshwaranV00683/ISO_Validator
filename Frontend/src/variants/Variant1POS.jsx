import { useEffect, useState } from "react";

export default function Variant1POS({ progress }) {
  const [scene, setScene] = useState(1);

  useEffect(() => {
    if (progress < 25) setScene(1);
    else if (progress < 50) setScene(2);
    else if (progress < 75) setScene(3);
    else setScene(4);
  }, [progress]);

  return (
    <div className="variant variant-pos">
      {/* Scene 1: Card swipe */}
      <div className={`v1-scene ${scene === 1 ? "active" : ""}`}>
        <div className="v1-pos-terminal">
          <div className="v1-screen">
            <div className="v1-amount">$125.00</div>
            <div className="v1-status">PROCESSING...</div>
          </div>
          <div className="v1-card-slot">
            <div className="v1-card-swipe" />
          </div>
        </div>
        <div className="v1-credit-card" />
      </div>

      {/* Scene 2: Network routing */}
      <div className={`v1-scene ${scene === 2 ? "active" : ""}`}>
        <div className="v1-network-grid">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="v1-node" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="v1-node-pulse" />
            </div>
          ))}
        </div>
        <div className="v1-route-line" />
      </div>

      {/* Scene 3: Authorization */}
      <div className={`v1-scene ${scene === 3 ? "active" : ""}`}>
        <div className="v1-auth-circle">
          <svg className="v1-checkmark" viewBox="0 0 52 52">
            <circle className="v1-checkmark-circle" cx="26" cy="26" r="25" fill="none" />
            <path className="v1-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <div className="v1-auth-text">APPROVED</div>
      </div>

      {/* Scene 4: Receipt print */}
      <div className={`v1-scene ${scene === 4 ? "active" : ""}`}>
        <div className="v1-receipt">
          <div className="v1-receipt-line">TRANSACTION APPROVED</div>
          <div className="v1-receipt-line">AMOUNT: $125.00</div>
          <div className="v1-receipt-line">AUTH: 567890</div>
          <div className="v1-receipt-line">****************</div>
        </div>
      </div>
    </div>
  );
}