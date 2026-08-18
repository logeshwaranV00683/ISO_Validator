import { useEffect, useState } from "react";

export default function Variant5HoloTransfer({ progress }) {
  const [packets, setPackets] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPackets((prev) => [
        ...prev.slice(-20), // Keep last 20
        {
          id: Date.now(),
          startX: Math.random() * 100,
          delay: Math.random() * 0.5,
        },
      ]);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="variant variant-holo-transfer">
      {/* Source device */}
      <div className="v5-device v5-source">
        <div className="v5-device-screen">
          <div className="v5-hologram-emitter" />
        </div>
        <div className="v5-device-label">SENDER</div>
      </div>

      {/* Transfer beam */}
      <div className="v5-transfer-zone">
        <div className="v5-beam-core" />
        
        {/* Data packets */}
        {packets.map((packet) => (
          <div
            key={packet.id}
            className="v5-data-packet"
            style={{
              top: `${packet.startX}%`,
              animationDelay: `${packet.delay}s`,
            }}
          >
            <div className="v5-packet-glow" />
          </div>
        ))}

        {/* Holographic grid */}
        <div className="v5-holo-grid" />
      </div>

      {/* Destination device */}
      <div className="v5-device v5-destination">
        <div className="v5-device-screen">
          <div className="v5-hologram-receiver" />
        </div>
        <div className="v5-device-label">RECEIVER</div>
      </div>

      {/* Transfer stats */}
      <div className="v5-stats">
        <div className="v5-stat">
          <div className="v5-stat-label">SPEED</div>
          <div className="v5-stat-value">1.2 GB/s</div>
        </div>
        <div className="v5-stat">
          <div className="v5-stat-label">ENCRYPTED</div>
          <div className="v5-stat-value">AES-256</div>
        </div>
        <div className="v5-stat">
          <div className="v5-stat-label">PROGRESS</div>
          <div className="v5-stat-value">{Math.floor(progress)}%</div>
        </div>
      </div>
    </div>
  );
}