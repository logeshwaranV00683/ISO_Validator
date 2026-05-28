export const T = {
  bg: "#070a0f", surface: "#0d1117", surface2: "#111720",
  border: "#1e2d3d", border2: "#243447", text: "#e6edf3",
  muted: "#8b949e", faint: "#3d4f61", accent: "#00d2ff",
  accent2: "#0057ff", green: "#3fb950", red: "#ff2d55",
  yellow: "#ff9f0a", blue: "#0a84ff", purple: "#bf5af2",
};

export const SEV = {
  CRITICAL: { bg: T.red    + "18", border: T.red    + "55", text: T.red    },
  WARNING:  { bg: T.yellow + "18", border: T.yellow + "55", text: T.yellow },
  INFO:     { bg: T.blue   + "18", border: T.blue   + "55", text: T.blue   },
};

export const ENV_COLORS = { PROD: "#ff2d55", UAT: "#ff9f0a", DEV: "#3fb950" };

export const ROLES = {
  ADMIN:   { label: "Admin",   color: T.red,    can: { edit:true,  delete:true,  add:true,  validate:true,  build:true  } },
  ANALYST: { label: "Analyst", color: T.yellow, can: { edit:false, delete:false, add:false, validate:true,  build:true  } },
  VIEWER:  { label: "Viewer",  color: T.blue,   can: { edit:false, delete:false, add:false, validate:false, build:false } },
};

export const MTI_DESCRIPTIONS = {
  "0200":"Authorization Request", "0210":"Authorization Response",
  "0420":"Reversal Request",      "0422":"Reversal Advice",
  "0430":"Reversal Response",     "0800":"Network Management Request",
  "0810":"Network Management Response",
};

export const selectStyle = {
  width:"100%", background:T.surface2, border:`1px solid ${T.border}`,
  color:T.text, padding:"8px 10px", borderRadius:6,
  fontFamily:"inherit", fontSize:11, outline:"none", cursor:"pointer",
};

export const inputStyle = {
  width:"100%", boxSizing:"border-box", background:T.surface2,
  border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px",
  borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none",
};