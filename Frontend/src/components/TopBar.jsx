import { T } from "../constants/theme";
import { Tag, Dot } from "./shared";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function TopBar() {
  const { user, role, logout } = useAuth();
  const { isDark, toggle } = useTheme();

  return (
    <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:30, height:30, borderRadius:7, background:`linear-gradient(135deg,${T.accent2},${T.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⬡</div>
        <span style={{ fontSize:16, fontWeight:700, color:T.text }}>Veri<span style={{ color:T.accent }}>Q</span>Forge<span style={{ color:T.accent }}> AI</span></span>
        <Tag color={T.red}>v1.0.0</Tag>
      </div>

      <div style={{ display:"flex", gap:16, fontSize:11, color:T.muted, alignItems:"center" }}>
        {/* <span style={{ display:"flex", alignItems:"center", gap:5 }}><Dot color={T.green} /> API Gateway · localhost:8080</span> */}
        <span style={{ color:T.faint }}>|</span>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: `1px solid ${T.border}`,
            borderRadius: 20, padding: "3px 10px 3px 6px",
            cursor: "pointer", fontFamily: "inherit", fontSize: 10,
            color: T.muted, transition: "all 0.15s",
          }}
        >
          {/* Track */}
          <div style={{
            width: 30, height: 16, borderRadius: 8,
            background: isDark ? T.faint : T.accent,
            border: `1px solid ${isDark ? T.border : T.accent}`,
            display: "flex", alignItems: "center",
            padding: "0 2px", transition: "background 0.2s",
            position: "relative", flexShrink: 0,
          }}>
            {/* Thumb */}
            <div style={{
              width: 12, height: 12, borderRadius: "50%",
              background: "#fff",
              marginLeft: isDark ? 0 : 14,
              transition: "margin 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <span style={{ fontSize: 13 }}>{isDark ? "Light" : "Dark"}</span>
        </button>

        <span style={{ color:T.faint }}>|</span>

        {user && (
          <div style={{ display:"flex", alignItems:"center", gap:8, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:6, padding:"4px 10px" }}>
            <div style={{ width:22, height:22, borderRadius:5, background:role.color+"22", border:`1px solid ${role.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8.5, fontWeight:700, color:role.color }}>
              {user.avatarInitials || user.username?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize:10.5, color:T.text, lineHeight:1 }}>{user.fullName || user.username}</div>
              <div style={{ fontSize:9, color:role.color, marginTop:1 }}>{user.role}</div>
            </div>
            <button onClick={logout} style={{ background:"none", border:`1px solid ${T.border}`, color:T.faint, padding:"2px 8px", borderRadius:4, fontSize:9, fontFamily:"inherit", cursor:"pointer", marginLeft:4 }}>⎋ Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}