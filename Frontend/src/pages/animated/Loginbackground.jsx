import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import "./LoginBackground.css";

/* ── Data streams for Scene A (POS vibe) ── */
const STREAMS = [
  "0200 A0 00 10 AC 08 01 00",
  "DE2: 4111 **** **** 1234",
  "DE4: 000000050000",
  "DE7: 0514143022",
  "DE11: 000001",
  "DE12: 143000",
  "DE22: 051",
  "DE25: 00",
  "DE37: RRN000000001",
  "DE41: TERM0001",
  "DE42: MERCH000001",
  "DE49: 356",
  "MTI: 0200",
  "BITMAP: F220000102C04000",
  "RSP: 00 APPROVED",
  "AUTH: 123456",
  "PAN: 4111****1234",
  "ISO8583 v1987",
  "-",
];

/* ── Network SVG nodes ── */
const CENTER_N = { x: 300, y: 200 };
const NODES = [
  { id: "c",  x: 300, y: 200, r: 20, label: "1", main: true },
  { id: "n1", x: 300, y: 500,  r: 12, label: "2"   },
  { id: "n2", x: 488, y: 132, r: 12, label: "3" },
  { id: "n3", x: 488, y: 268, r: 12, label: "4"  },
  { id: "n4", x: 300, y: 280, r: 12, label: "5"   },
  { id: "n5", x: 112, y: 268, r: 12, label: "6"    },
  { id: "n6", x: 112, y: 132, r: 12, label: "7"  },
];
const EDGES = [
  ["c","n1"],["c","n2"],["c","n3"],["c","n4"],["c","n5"],["c","n6"],
  ["n1","n2"],["n3","n4"],["n5","n6"],
];

const HUD = [
  { label:"TXN/s",   value:"14,823", pos:{ top:40,  left:40  } },
  { label:"LATENCY", value:"2.4ms",  pos:{ top:40,  right:40 } },
  { label:"UPTIME",  value:"99.99%", pos:{ bottom:50, left:40 } },
  { label:"SECURE",  value:"AES-256",pos:{ bottom:50, right:40} },
];

/* ── Particle canvas ── */
function ParticleCanvas({ isDark, active }) {
  const ref = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    const count = 80;
    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 0.8,
      a: 0.3 + Math.random() * 0.5,
    }));

    const accentR = isDark ? "0,210,255" : "0,87,204";
    const linkR   = isDark ? "0,87,255"  : "0,100,220";

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width)  p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accentR},${p.a * (isDark ? 0.7 : 0.4)})`;
        ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${linkR},${0.18 * (1 - d / 110) * (isDark ? 1 : 0.5)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isDark]);

  return (
    <canvas ref={ref} className="lb-canvas"
      style={{ opacity: active ? 1 : 0.3 }} />
  );
}

/* ── Scene A: POS data stream background ── */
function SceneA({ isDark, visible }) {
  const color = isDark ? "rgba(0,210,255,VAR)" : "rgba(0,87,204,VAR)";
  const streams = STREAMS.map((text, i) => {
    const size   = 10 + Math.floor(Math.random() * 8);
    const left   = 2 + (i * 17) % 94;
    const bottom = 5 + (i * 11) % 70;
    const dur    = 6 + (i % 5) * 2;
    const delay  = (i * 0.8) % 8;
    const opacity = isDark ? (0.25 + (i % 4) * 0.08) : (0.15 + (i % 4) * 0.05);
    return { text, size, left, bottom, dur, delay, opacity };
  });

  return (
    <div className={`lb-scene ${visible ? "lb-visible" : ""}`}>
      <div className="lb-grid" />
      <div className="lb-orb lb-orb-a" />
      <div className="lb-orb lb-orb-b" />
      {streams.map((s, i) => (
        <div key={i} className="lb-data-stream" style={{
          left: `${s.left}%`,
          bottom: `${s.bottom}%`,
          fontSize: `${s.size}px`,
          color: color.replace("VAR", s.opacity),
          animationDuration: `${s.dur}s`,
          animationDelay: `${s.delay}s`,
          letterSpacing: "0.06em",
        }}>{s.text}</div>
      ))}
    </div>
  );
}

/* ── Scene B: Network switch SVG background ── */
function SceneB({ isDark, visible }) {
  return (
    <div className={`lb-scene ${visible ? "lb-visible" : ""}`}>
      <div className="lb-orb lb-orb-a" />

      <svg className="lb-network-svg" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="lbCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDark ? "#00d2ff" : "#0057cc"} stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0057ff" stopOpacity="0" />
          </radialGradient>
          <filter id="lbGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="lbGlow2">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Core glow */}
        <circle cx={CENTER_N.x} cy={CENTER_N.y} r="85" fill="url(#lbCore)">
          <animate attributeName="r" values="75;95;75" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const na = NODES.find(n => n.id === a);
          const nb = NODES.find(n => n.id === b);
          return (
            <g key={i}>
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={isDark ? "rgba(0,210,255,0.12)" : "rgba(0,87,204,0.1)"} strokeWidth="1" />
              <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={isDark ? "rgba(0,210,255,0.45)" : "rgba(0,87,204,0.35)"}
                strokeWidth="1.5" strokeDasharray="5 8" filter="url(#lbGlow)">
                <animate attributeName="stroke-dashoffset"
                  values="0;-26" dur={`${1.3 + i * 0.12}s`} repeatCount="indefinite" />
              </line>
              {/* Travelling packet */}
              <circle r="3" fill={isDark ? "#00d2ff" : "#0057cc"} filter="url(#lbGlow)" opacity="0.8">
                <animateMotion dur={`${1.8 + i * 0.18}s`} repeatCount="indefinite"
                  begin={`${(i * 0.22).toFixed(2)}s`}>
                  <mpath href={`#lbPath${i}`} />
                </animateMotion>
              </circle>
              <path id={`lbPath${i}`} d={`M ${na.x} ${na.y} L ${nb.x} ${nb.y}`} fill="none" stroke="none" />
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((n, i) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.r + 7} fill="none"
              stroke={n.main
                ? (isDark ? "rgba(0,210,255,0.45)" : "rgba(0,87,204,0.35)")
                : (isDark ? "rgba(0,87,255,0.25)"  : "rgba(0,87,204,0.2)")
              } strokeWidth="1">
              <animate attributeName="r" values={`${n.r+4};${n.r+13};${n.r+4}`}
                dur={`${2.2 + i * 0.22}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8"
                dur={`${2.2 + i * 0.22}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={n.main
                ? (isDark ? "rgba(0,87,255,0.55)" : "rgba(0,87,204,0.4)")
                : (isDark ? "rgba(0,20,50,0.85)"  : "rgba(220,235,255,0.7)")
              }
              stroke={n.main
                ? (isDark ? "#00d2ff" : "#0057cc")
                : (isDark ? "rgba(0,210,255,0.45)" : "rgba(0,87,204,0.4)")
              }
              strokeWidth={n.main ? 2 : 1.5}
              filter={n.main ? "url(#lbGlow2)" : "url(#lbGlow)"} />
            <text x={n.x} y={n.y + (n.main ? 4 : 3.5)}
              textAnchor="middle"
              fill={n.main
                ? (isDark ? "#00d2ff" : "#0057cc")
                : (isDark ? "#e6edf3" : "#0d1117")
              }
              fontSize={n.main ? 9.5 : 8.5}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700" letterSpacing="0.08em">
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {/* HUD corner readouts */}
      {HUD.map((h, i) => (
        <div key={i} className="lb-hud" style={{ ...h.pos, animationDelay: `${i * 0.5}s` }}>
          <div className="lb-hud-label">{h.label}</div>
          <div className="lb-hud-value">{h.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Main export ── */
export default function LoginBackground() {
  const { isDark } = useTheme();
  const [scene, setScene] = useState(0); // 0 = POS streams, 1 = Network

  useEffect(() => {
    const id = setInterval(() => {
      setScene(s => (s + 1) % 2);
    }, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`lb-root ${isDark ? "" : "lb-light"}`}
      style={{ background: isDark ? "#020810" : "#f0f4f8" }}>

      {/* Always-on particle canvas */}
      <ParticleCanvas isDark={isDark} active={true} />

      {/* Scene A — POS data streams */}
      <SceneA isDark={isDark} visible={scene === 0} />

      {/* Scene B — Network switch */}
      <SceneB isDark={isDark} visible={scene === 1} />

      {/* Scene indicator dots */}
      <div className="lb-dots">
        {[0, 1].map(i => (
          <div key={i} className={`lb-dot ${scene === i ? "lb-dot-active" : ""}`} />
        ))}
      </div>
    </div>
  );
}