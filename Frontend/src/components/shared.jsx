import { T, selectStyle } from "../constants/theme";

export const Label   = ({ children }) => <div style={{ fontSize:11, color:T.muted, marginBottom:5, fontWeight:600 }}>{children}</div>;
export const Required = () => <span style={{ color:T.red }}>*</span>;
export const Row     = ({ children, style:s }) => <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, ...s }}>{children}</div>;
export const Dot     = ({ color }) => <span style={{ width:6, height:6, borderRadius:"50%", background:color, display:"inline-block" }} />;
export const Th      = ({ children }) => <th style={{ textAlign:"left", padding:"8px 8px", color:T.muted, fontWeight:700, fontSize:10.5, whiteSpace:"nowrap", letterSpacing:"0.03em", textTransform:"uppercase" }}>{children}</th>;

export function Tag({ color, small, children, style:s }) {
  return <span style={{ fontSize:small?9:10, padding:small?"2px 6px":"3px 8px", borderRadius:4, background:color+"22", color, border:`1px solid ${color}44`, whiteSpace:"nowrap", ...s }}>{children}</span>;
}

export function Btn({ children, primary, danger, onClick, disabled, style:s }) {
  let bg=T.surface2, border=`1px solid ${T.border}`, color=T.muted;
  if (primary) { bg=`linear-gradient(135deg,${T.accent2},${T.accent})`; border="none"; color="#fff"; }
  if (danger)  { bg=T.red+"18"; border=`1px solid ${T.red}44`; color=T.red; }
  return <button onClick={onClick} disabled={disabled} style={{ background:bg, border, color, padding:"8px 14px", borderRadius:6, fontFamily:"inherit", fontSize:11, fontWeight:600, cursor:disabled?"not-allowed":"pointer", whiteSpace:"nowrap", opacity:disabled?0.5:1, ...s }}>{children}</button>;
}

// export function SmBtn({ children, danger, onClick, style:s }) {
//   return <button onClick={onClick} style={{ background:"none", border:`1px solid ${danger?T.red+"44":T.border}`, color:danger?T.red:T.muted, padding:"3px 9px", borderRadius:4, fontFamily:"inherit", fontSize:9.5, cursor:"pointer", whiteSpace:"nowrap", ...s }}>{children}</button>;
// }
export function SmBtn({ children, danger, onClick, disabled,title, style: s }) {
  return (
    <button className={`sm-btn ${danger ? "sm-btn-danger" : ""}`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
  
        border: `1px solid ${danger ? T.red : T.accent}`,
        color: danger ? T.red : T.text,
        padding: "3px 9px",
        borderRadius: 4,
        fontFamily: "inherit",
        fontSize: 10.5,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.4 : 1,
        ...s
      }}
    >
      {children}
    </button>
  );
}       

export function Toggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid ${active?T.accent+"55":T.border}`, borderRadius:4, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", color:active?T.accent:"#2BC4CD", fontSize:10 }}>
      <div style={{ width:20, height:11, borderRadius:6, background:active?T.accent+"33":T.surface2, border:`1px solid ${active?T.accent:T.red}`, display:"flex", alignItems:"center", padding:"0 1px" }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:active?T.accent:T.red, marginLeft:active?8:0, transition:"margin 0.15s" }} />
      </div>
      <span style={{color:active?T.accent:T.red}}>
          {label}

      </span>
    
    </button>
  );
}

export function Card({ title, badge, extra, children, style:s }) {
  const isFlex = s?.flex !== undefined;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", ...(isFlex ? { display:"flex", flexDirection:"column" } : {}), ...s }}>
      {(title||badge||extra) && (
        <div style={{ padding:"9px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {title && <span style={{ fontSize:13, fontWeight:700, color:T.text, flex:1 }}>{title}</span>}
          {badge && <span style={{ fontSize:11, color:T.muted }}>{badge}</span>}
          {extra}
        </div>
      )}
      <div style={{ padding:14, ...(isFlex ? { flex:1, overflowY:"auto" } : {}) }}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, sub }) {
  return (
    <div style={{ borderBottom:`1px solid ${T.border}`, paddingBottom:14 }}>
      <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:T.text }}>{title}</h1>
      {sub && <p style={{ margin:"5px 0 0", fontSize:12.5, color:T.muted }}>{sub}</p>}
    </div>
  );
}

export function RoleBanner({ roleNeeded, action }) {
  return (
    <div style={{ background:T.yellow+"10", border:`1px solid ${T.yellow}33`, borderRadius:6, padding:"8px 14px", fontSize:11, color:T.yellow }}>
      ⚠ You have <strong>read-only</strong> access. Only <strong>{roleNeeded}</strong> can {action}.
    </div>
  );
}

export function LoadingBar({ text="Loading…" }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"14px 20px", display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:14, height:14, border:`2px solid ${T.accent}44`, borderTop:`2px solid ${T.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13, color:T.muted }}>{text}</span>
    </div>
  );
}

      
export function ProgressBar({ percent = 0, text }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"14px 20px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:14, height:14, border:"2px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderTop:`2px solid ${T.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          <span style={{ fontSize:13, color:T.muted }}>{text}</span>
        </div>
        <span style={{ fontSize:13, color:T.text, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ height:8, borderRadius:6, background:T.surface2, border:`1px solid ${T.border}`, overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`, borderRadius:6,
          backgroundImage:"linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, transparent) 50%, var(--accent) 100%)",
          backgroundSize:"200% 100%",
          animation:"progressStripes 1.4s linear infinite",
          transition:"width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ background:T.red+"12", border:`1px solid ${T.red}44`, borderRadius:6, padding:"10px 14px", fontSize:11, color:T.red, display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ flex:1 }}>✕ {message}</span>
      {onRetry && <SmBtn onClick={onRetry}>↺ Retry</SmBtn>}
    </div>
  );
}

export function EmptyState({ icon="⬡", text }) {
  return (
    <div style={{ padding:"40px 0", textAlign:"center", color:T.faint }}>
      <div style={{ fontSize:28, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:12 }}>{text}</div>
    </div>
  );
}

export function StatCard({ label, value, color }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 14px" }}>
      <div style={{ fontSize:11, color:T.muted, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color }}>{value ?? "—"}</div>
    </div>
  );
}

// export function Pagination({ page, totalPages, onPageChange }) {
//   if (totalPages <= 1) return null;
//   return (
//     <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end", marginTop:14 }}>
//       <span style={{ fontSize:11, color:T.muted }}>Page {page+1} of {totalPages}</span>
//       <SmBtn onClick={() => onPageChange(page-1)} style={{ opacity:page===0?0.4:1 }}>← Prev</SmBtn>
//       <SmBtn onClick={() => onPageChange(page+1)} style={{ opacity:page>=totalPages-1?0.4:1 }}>Next →</SmBtn>
//     </div>
//   );
// }

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
      <span style={{ fontSize: 11, color: T.muted }}>Page {page + 1} of {totalPages}</span>
      <SmBtn onClick={() => onPageChange(page - 1)} disabled={page === 0}>← Prev</SmBtn>
      <SmBtn onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}>Next →</SmBtn>
    </div>
  );
}