import { useEffect, useRef } from "react";

export default function Variant4NetworkPulse({ progress }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create node network
    const nodes = [];
    const nodeCount = 30;
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 100 + Math.random() * 200;
      nodes.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        connections: [],
      });
    }

    // Pulse waves
    const pulses = [];
    const addPulse = () => {
      pulses.push({
        x: centerX,
        y: centerY,
        radius: 0,
        maxRadius: 400,
        alpha: 1,
      });
    };

    let frame = 0;
    const animate = () => {
      ctx.fillStyle = "rgba(2, 8, 16, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add pulse every 30 frames
      if (frame % 30 === 0) addPulse();

      // Draw and update pulses
      pulses.forEach((pulse, index) => {
        pulse.radius += 3;
        pulse.alpha = 1 - pulse.radius / pulse.maxRadius;

        if (pulse.alpha > 0) {
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0, 210, 255, ${pulse.alpha * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Glow
          ctx.strokeStyle = `rgba(0, 87, 255, ${pulse.alpha * 0.3})`;
          ctx.lineWidth = 6;
          ctx.stroke();
        } else {
          pulses.splice(index, 1);
        }
      });

      // Draw nodes
      nodes.forEach((node) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 50 || node.x > canvas.width - 50) node.vx *= -1;
        if (node.y < 50 || node.y > canvas.height - 50) node.vy *= -1;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#00d2ff";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#00d2ff";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw connections
      nodes.forEach((nodeA, i) => {
        nodes.slice(i + 1).forEach((nodeB) => {
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = `rgba(0, 210, 255, ${0.3 * (1 - dist / 200)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      frame++;
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  return (
    <div className="variant variant-network-pulse">
      <canvas ref={canvasRef} className="v4-canvas" />
      <div className="v4-center-hub">
        <div className="v4-hub-core" />
        <div className="v4-hub-ring" />
      </div>
      <div className="v4-status">
        NETWORK SYNCHRONIZATION
        <div className="v4-substatus">{Math.floor(progress)}% COMPLETE</div>
      </div>
    </div>
  );
}