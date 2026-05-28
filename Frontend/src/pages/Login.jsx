import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { T, ROLES } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { Tag } from "../components/shared";

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setError(""); setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err?.response?.status === 423) {
        const until = err?.response?.data?.data?.lockedUntil;
        setError(`Account locked${until ? ` until ${new Date(until).toLocaleTimeString()}` : ""}. Contact admin.`);
      } else {
        setError(err?.response?.data?.error?.message || "Invalid credentials.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono','Fira Code',monospace", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.border}33 1px,transparent 1px),linear-gradient(90deg,${T.border}33 1px,transparent 1px)`, backgroundSize:"40px 40px", opacity:0.4 }} />
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translate(-50%,-50%)", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,${T.accent2}15,transparent 70%)`, pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:1, width:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg,${T.accent2},${T.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 12px" }}>⬡</div>
          <div style={{ fontSize:20, fontWeight:700, color:T.text }}>ISO<span style={{ color:T.accent }}>8583</span> Validator</div>
          <div style={{ fontSize:11, color:T.faint, marginTop:4 }}>Enterprise Payment Message Platform</div>
        </div>

        {/* Form */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:28 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:20 }}>Sign In</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Username</div>
              <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} placeholder="Enter username"
                style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${error?T.red:T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
            </div>
            <div>
              <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Password</div>
              <div style={{ position:"relative" }}>
                <input type={showPass?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} placeholder="Enter password"
                  style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${error?T.red:T.border}`, color:T.text, padding:"10px 36px 10px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
                <button onClick={() => setShowPass(x=>!x)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:T.faint, cursor:"pointer", fontSize:12, padding:0 }}>
                  {showPass?"🙈":"👁"}
                </button>
              </div>
            </div>

            {error && <div style={{ background:T.red+"15", border:`1px solid ${T.red}44`, borderRadius:5, padding:"8px 12px", fontSize:11, color:T.red }}>✕ {error}</div>}

            <button onClick={handleLogin} disabled={loading||!username||!password}
              style={{ background:`linear-gradient(135deg,${T.accent2},${T.accent})`, border:"none", color:"#fff", padding:"11px 0", borderRadius:7, fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:loading||!username||!password?"not-allowed":"pointer", opacity:loading||!username||!password?0.6:1 }}>
              {loading?"Authenticating…":"▶ SIGN IN"}
            </button>
          </div>
        </div>

        {/* Role reference card */}
        <div style={{ marginTop:14, background:T.surface+"88", border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px" }}>
          <div style={{ fontSize:10, color:T.faint, marginBottom:8 }}>Role Permissions</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {Object.entries(ROLES).map(([key, r]) => (
              <div key={key} style={{ background:T.bg, border:`1px solid ${r.color}33`, borderRadius:5, padding:"6px 8px" }}>
                <div style={{ color:r.color, fontWeight:700, fontSize:10, marginBottom:4 }}>{r.label}</div>
                {Object.entries(r.can).map(([action, allowed]) => (
                  <div key={action} style={{ color:allowed?T.green:T.faint, fontSize:9 }}>{allowed?"✓":"✗"} {action}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}