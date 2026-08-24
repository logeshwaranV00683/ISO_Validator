import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { T } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Repeat, Braces, ListChecks, Table2,
  FileUp, Sparkles, LayoutGrid, ShieldCheck, Users,
  History, FileText, Settings,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/profiles", icon: Repeat, label: "Message Profiles", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/formats", icon: Braces, label: "Message Formats", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/rules", icon: ListChecks, label: "Rules Manager", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/field-definitions", icon: Table2, label: "Field Definitions", roles: ["ADMIN"] },
  { to: "/brd-import", icon: FileUp, label: "BRD Import", roles: ["ADMIN"] },
  { to: "/ai", icon: Sparkles, label: "AI Settings", roles: ["ADMIN"] },
  { to: "/builder", icon: LayoutGrid, label: "Message Builder", roles: ["ADMIN", "ANALYST"] },
  { to: "/validator", icon: ShieldCheck, label: "Message Validator", roles: ["ADMIN", "ANALYST"] },
  { to: "/users", icon: Users, label: "Users", roles: ["ADMIN"] },
  { to: "/history", icon: History, label: "Validation History", roles: ["ADMIN", "ANALYST", "VIEWER"] },
  { to: "/audit", icon: FileText, label: "Audit Log", roles: ["ADMIN"] },
  { to: "/config", icon: Settings, label: "System Config", roles: ["ADMIN"] },
];

export default function Sidebar() {
  const { user, role } = useAuth();
  if (!user) return null;
  const visible = NAV.filter(n => n.roles.includes(user.role));
  const navigate = useNavigate();
  const location = useLocation();
  return (

    <aside style={{ width: 215, height: "calc(100vh - 60px)", background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Scrollable Menu */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "12px 0",
        }}
      >
        {visible.map(n => {
          const isActive = location.pathname === n.to;
          const Icon = n.icon;

          return (
           <div
  key={n.to}
  onClick={() => navigate(n.to)}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 18px",
    cursor: "pointer",
    background: isActive ? T.accent + "12" : "transparent",
    borderLeft: `2px solid ${isActive ? T.accent : "transparent"}`,
    color: isActive ? T.accent : T.muted,
    fontSize: 11.5,
    transition: "all 0.12s",
  }}
>
  <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0 }} />
  {n.label}
</div>
          );
        })}
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