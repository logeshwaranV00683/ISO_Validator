import { NavLink } from "react-router-dom";
import { T } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard", icon: "⬡", label: "Dashboard", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/validator", icon: "◎", label: "Message Validator", roles: ["ADMIN", "ANALYST"] },
  { to: "/builder", icon: "⊞", label: "Message Builder", roles: ["ADMIN", "ANALYST"] },
  { to: "/history", icon: "◷", label: "Validation History", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/profiles", icon: "⇄", label: "Message Profiles", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/formats", icon: "⬢", label: "Message Formats", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/rules", icon: "⚙", label: "Rules Manager", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/field-definitions", icon: "≡", label: "Field Definitions", roles: ["ADMIN"] },
  { to: "/ai", icon: "◈", label: "AI Settings", roles: ["ADMIN"] },
  { to: "/users", icon: "◉", label: "Users", roles: ["ADMIN"] },
  { to: "/audit", icon: "☰", label: "Audit Log", roles: ["ADMIN"] },
  { to: "/config", icon: "⊛", label: "System Config", roles: ["ADMIN"] },
];

export default function Sidebar() {
  const { user, role } = useAuth();
  if (!user) return null;
  const visible = NAV.filter(n => n.roles.includes(user.role));

  return (
    <aside style={{ width: 215, height: "calc(100vh - 60px)", background: T.surface, borderRight: `1px solid ${T.border}`, overflowY: "auto", overflowX: "hidden" }}>
      {/* Scrollable Menu */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
        }}
      >
        {visible.map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} style={({ isActive }) => ({
            display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", textDecoration: "none", cursor: "pointer",
            background: isActive ? T.accent + "12" : "transparent",
            borderLeft: `2px solid ${isActive ? T.accent : "transparent"}`,
            color: isActive ? T.accent : T.muted, fontSize: 11.5, transition: "all 0.12s",
          })}>
            <span style={{ fontSize: 20 }}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </div>

      {/* <div style={{ marginTop: "auto", padding: "12px 20px", borderTop: `1px solid ${T.border}`, flexShrink:0 }}>
        <div style={{ fontSize: 9.5, color: T.faint, marginBottom: 6 }}>Signed in as</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: role.color + "22", border: `1px solid ${role.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: role.color, fontWeight: 700 }}>{role.label[0]}</div>
          <div>
            <div style={{ fontSize: 10, color: T.text }}>{role.label}</div>
            <div style={{ fontSize: 8.5, color: T.faint }}>{role.can?.edit ? "Full Access" : role.can?.validate ? "Read + Validate" : "Read Only"}</div>
          </div>
        </div>
      </div> */}
    </aside>
  );
}