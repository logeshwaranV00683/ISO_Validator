import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./IntroAnimation.css";

/* ─── Timing (ms) ─────────────────────────────────────── */
const T_S1_END   = 2500;   // Scene 1: POS           → 0 to 2.5s
const T_S1_ZOOM  = T_S1_END - 650; // dive-into-screen starts 650ms before scene1 ends
const T_S2_END   = 4200;   // Scene 2: Portal        → 2.5s to 4.2s
const T_S3_END   = 7500;   // Scene 3: Network switch → 4.2s to 7.5s
const T_S4_END   = 10000;  // Scene 4: Speed tunnel  → 7.5s to 10s
const TOTAL      = 10000;  // Total = 10s (redirect happens here)

/* ─── Network switch SVG data ──────────────────────────── */
const CENTER = { x: 300, y: 200 };
const NODES = [
  { id: "c",  x: 300, y: 200, r: 22, label: "SWITCH", main: true },
  { id: "n1", x: 300, y: 68,  r: 13, label: "VISA"   },
  { id: "n2", x: 490, y: 130, r: 13, label: "MASTER" },
  { id: "n3", x: 490, y: 270, r: 13, label: "RUPAY"  },
  { id: "n4", x: 300, y: 332, r: 13, label: "AMEX"   },
  { id: "n5", x: 110, y: 270, r: 13, label: "UPI"    },
  { id: "n6", x: 110, y: 130, r: 13, label: "SWIFT"  },
];
const EDGES = [
  ["c","n1"],["c","n2"],["c","n3"],["c","n4"],["c","n5"],["c","n6"],
  ["n1","n2"],["n3","n4"],["n5","n6"],
];

function NetworkSVG() {
  return (
    <svg className="network-svg" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0057ff" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Animated packet markers */}
        {EDGES.map(([a, b], i) => {
          const na = NODES.find(n => n.id === a);
          const nb = NODES.find(n => n.id === b);
          return (
            <marker key={`mk${i}`} id={`pkt${i}`} markerWidth="6" markerHeight="6" refX="3" refY="3">
              <circle cx="3" cy="3" r="2.5" fill="#00d2ff" filter="url(#glow)" />
            </marker>
          );
        })}
      </defs>

      {/* Ambient core glow */}
      <circle cx={CENTER.x} cy={CENTER.y} r="90" fill="url(#coreGrad)">
        <animate attributeName="r" values="80;100;80" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" />
      </circle>

      {/* Edges */}
      {EDGES.map(([a, b], i) => {
        const na = NODES.find(n => n.id === a);
        const nb = NODES.find(n => n.id === b);
        const delay = (i * 0.18).toFixed(2);
        return (
          <g key={`edge${i}`}>
            {/* Base line */}
            <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke="rgba(0,210,255,0.15)" strokeWidth="1" />
            {/* Animated glow line */}
            <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke="rgba(0,210,255,0.5)" strokeWidth="1.5"
              strokeDasharray="6 8"
              filter="url(#glow)">
              <animate attributeName="stroke-dashoffset"
                values="0;-28" dur={`${1.2 + i * 0.1}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;1;0.3"
                dur={`${1.4 + i * 0.07}s`} repeatCount="indefinite" begin={`${delay}s`} />
            </line>
            {/* Data packet dot travelling */}
            <circle r="3" fill="#00d2ff" filter="url(#glow)" opacity="0.9">
              <animateMotion
                dur={`${1.6 + i * 0.15}s`} repeatCount="indefinite" begin={`${delay}s`}>
                <mpath href={`#path${i}`} />
              </animateMotion>
            </circle>
            <path id={`path${i}`} d={`M ${na.x} ${na.y} L ${nb.x} ${nb.y}`}
              fill="none" stroke="none" />
          </g>
        );
      })}

      {/* Nodes */}
      {NODES.map((n, i) => (
        <g key={n.id}>
          {/* Outer pulse ring */}
          <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none"
            stroke={n.main ? "rgba(0,210,255,0.5)" : "rgba(0,87,255,0.3)"}
            strokeWidth="1">
            <animate attributeName="r" values={`${n.r+4};${n.r+14};${n.r+4}`}
              dur={`${2 + i*0.2}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8"
              dur={`${2 + i*0.2}s`} repeatCount="indefinite" />
          </circle>
          {/* Node body */}
          <circle cx={n.x} cy={n.y} r={n.r}
            fill={n.main ? "rgba(0,87,255,0.6)" : "rgba(0,30,60,0.9)"}
            stroke={n.main ? "#00d2ff" : "rgba(0,210,255,0.5)"}
            strokeWidth={n.main ? 2 : 1.5}
            filter={n.main ? "url(#glow2)" : "url(#glow)"} />
          {/* Label */}
          <text x={n.x} y={n.y + (n.main ? 4 : 3.5)}
            textAnchor="middle"
            fill={n.main ? "#00d2ff" : "#e6edf3"}
            fontSize={n.main ? 10 : 9}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
            letterSpacing="0.08em">
            {n.label}
          </text>
        </g>
      ))}

      {/* Corner data readouts */}
      {[
        { x:20,  y:20,  label:"TXN/s",  val:"14,823" },
        { x:460, y:20,  label:"LATENCY", val:"2.4ms" },
        { x:20,  y:380, label:"UPTIME",  val:"99.99%" },
        { x:430, y:380, label:"SECURE",  val:"AES-256" },
      ].map((d,i) => (
        <g key={i}>
          <text x={d.x} y={d.y - 1} fill="rgba(0,210,255,0.5)"
            fontSize="9" fontFamily="JetBrains Mono, monospace" letterSpacing="0.1em">
            {d.label}
          </text>
          <text x={d.x} y={d.y + 14} fill="#00d2ff"
            fontSize="13" fontFamily="JetBrains Mono, monospace" fontWeight="700">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"
              begin={`${i*0.4}s`} />
            {d.val}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Speed tunnel lines ────────────────────────────────── */
function SpeedLines() {
  const lines = Array.from({ length: 40 }, (_, i) => {
    const angle  = (i / 40) * 360;
    const dist   = 20 + Math.random() * 30;
    const len    = 15 + Math.random() * 35;
    const dur    = 0.3 + Math.random() * 0.5;
    const delay  = Math.random() * 1.2;
    const rad    = angle * Math.PI / 180;
    const cx = 50 + Math.cos(rad) * dist;
    const cy = 50 + Math.sin(rad) * dist;
    return { i, cx, cy, len, dur, delay, angle };
  });
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden" }}>
      {lines.map(l => (
        <div key={l.i} className="speed-line" style={{
          width: `${l.len}%`,
          left: `${l.cx}%`,
          top: `${l.cy}%`,
          transform: `rotate(${l.angle}deg)`,
          transformOrigin: "0 50%",
          opacity: 0.6 + Math.random() * 0.4,
          animationDuration: `${l.dur}s`,
          animationDelay: `${l.delay}s`,
          animationIterationCount: "infinite",
        }} />
      ))}
      {/* Center vanishing glow */}
      <div style={{
        position:"absolute", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        width:300, height:300, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(0,210,255,0.3) 0%, rgba(0,87,255,0.15) 40%, transparent 70%)",
        animation:"orbPulse 0.8s ease-in-out infinite alternate",
      }} />
    </div>
  );
}

/* ─── Particle canvas (scenes 2, 3 bg) ─────────────────── */
function ParticleCanvas({ active }) {
  const ref = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 3 + 1,
      a: Math.random(),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,210,255,${p.a * 0.8})`;
        ctx.fill();
      });
      pts.forEach((p, i) => {
        pts.slice(i + 1).forEach(q => {
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,87,255,${0.2 * (1 - d/100)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });
      });
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [active]);

  return <canvas ref={ref} className="intro-canvas" style={{ opacity: active ? 1 : 0, transition:"opacity 0.5s" }} />;
}

/* ─── Main component ────────────────────────────────────── */
export default function IntroAnimation() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [scene, setScene]       = useState(1);
  const [progress, setProgress] = useState(0);
  const [zoomIn, setZoomIn]     = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const startRef  = useRef(Date.now());
  const rafRef    = useRef(null);

  const finishIntro = useCallback(() => {
    setRedirecting(true);
    setTimeout(() => navigate(user ? "/dashboard" : "/login", { replace: true }), 600);
  }, [navigate, user]);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / TOTAL) * 100, 100);
      setProgress(pct);
      setZoomIn(elapsed >= T_S1_ZOOM && elapsed < T_S1_END);

      if      (elapsed < T_S1_END)  setScene(1);
      else if (elapsed < T_S2_END)  setScene(2);
      else if (elapsed < T_S3_END)  setScene(3);
      else if (elapsed < T_S4_END)  setScene(4);
      else { finishIntro(); return; }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [finishIntro]);

  return (
    <div className="intro-root">
      {/* Particle bg for scenes 2-4 */}
      <ParticleCanvas active={scene >= 2 && scene <= 4} />

      {/* Skip button */}
      <button className="intro-skip" onClick={finishIntro}>SKIP ›</button>

      {/* Progress */}
      <div className="intro-progress" style={{ width: `${progress}%` }} />

      {/* ── Scene 1: POS ── */}
      <div className={`scene pos-scene ${scene === 1 ? "active" : "exit"} ${zoomIn ? "zoom-in" : ""}`}>
        {/* Floating data strings */}
        {["0200 A0 00 10 AC", "DE2: 4111****1234", "DE4: 000000050000", "MTI: 0200", "DE37: RRN0001"].map((s, i) => (
          <div key={i} className="data-stream" style={{
            left: `${10 + i * 18}%`, bottom: `${20 + (i % 3) * 12}%`,
            animationDelay: `${i * 0.3}s`, animationDuration: `${1.6 + i * 0.2}s`,
          }}>{s}</div>
        ))}
        <div style={{ position:"relative" }}>
          <div className="card-wrapper">
            <div className="credit-card">
              <div className="card-logo">VISA</div>
              <div className="card-num">4111 •••• •••• 1234</div>
            </div>
          </div>
          <div className="pos-terminal">
            <div className="pos-screen">
              <div className="pos-screen-glow" />
              <div className="pos-screen-text">
                <div className="pos-amount">PAYMENT</div>
                <div className="pos-status">✓ APPROVED</div>
              </div>
            </div>
            <div className="pos-chip-row">
              <div className="pos-chip" />
              <div className="pos-swipe-slot">
                <div className="pos-swipe-line" />
              </div>
            </div>
            <div className="pos-keypad">
              {Array.from({length:12}).map((_,i) => <div key={i} className="pos-key" />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scene 2: Portal ── */}
      <div className={`scene ${scene === 2 ? "active" : "exit"}`}>
        <div className="portal-ring" />
        <div style={{ color:"rgba(0,210,255,0.8)", fontSize:12, letterSpacing:"0.2em", zIndex:2, textAlign:"center" }}>
          <div style={{ marginBottom:8, opacity:0.8, fontSize:25 }}>ENTERING FINANCIAL NETWORK</div>
          <div style={{ fontSize:22, fontWeight:700, textShadow:"0 0 20px #00d2ff" }}>⬡</div>
        </div>
      </div>

      {/* ── Scene 3: Network Switch ── */}
      <div className={`scene network-scene ${scene === 3 ? "active" : "exit"}`}>
        <div style={{ position:"absolute", top:20, left:"50%", transform:"translateX(-50%)", fontSize:13, color:"rgba(0,210,255,0.7)", letterSpacing:"0.25em", fontWeight:600 }}>
          BANKING SWITCH ARCHITECTURE
        </div>
        <NetworkSVG />
      </div>

      {/* ── Scene 4: Speed tunnel ── */}
      <div className={`scene ${scene === 4 ? "active" : "exit"}`}>
        <SpeedLines />
        <div style={{ zIndex:2, textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(0,210,255,0.5)", letterSpacing:"0.25em", marginBottom:8 }}>ROUTING TRANSACTION</div>
          <div style={{ fontSize:36, color:"#00d2ff", fontWeight:700, textShadow:"0 0 30px #00d2ff, 0 0 60px #0057ff", letterSpacing:"0.05em" }}>
            2.4<span style={{ fontSize:14, color:"rgba(0,210,255,0.6)" }}>ms</span>
          </div>
        </div>
      </div>

      {/* Redirect fade overlay */}
      {redirecting && <div className="redirect-overlay" />}
    </div>
  );
}