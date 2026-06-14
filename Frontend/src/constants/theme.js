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
  "0100":"Authorization Request (Online)",
  "0110":"Authorization Response (Online)",
  "0120":"Authorization Advice",
  "0121":"Authorization Advice Repeat",
  "0130":"Authorization Advice Response",
  "0200":"Financial Transaction Request",
  "0210":"Financial Transaction Response",
  "0220":"Financial Transaction Advice",
  "0221":"Financial Transaction Advice Repeat",
  "0230":"Financial Transaction Advice Response",
  "0400":"Reversal Request",
  "0410":"Reversal Response",
  "0420":"Reversal Advice",
  "0421":"Reversal Advice Repeat",
  "0422":"Reversal Advice (Auth)",
  "0430":"Reversal Advice Response",
  "0800":"Network Management Request",
  "0810":"Network Management Response",
  "0820":"Network Management Advice",
};

export const MTI_SHORT_LABELS = {
  "0100":"Auth Req (Online)",   "0110":"Auth Resp (Online)",
  "0120":"Auth Advice",         "0130":"Auth Advice Resp",
  "0200":"Fin Txn Req",         "0210":"Fin Txn Resp",
  "0220":"Fin Advice",          "0230":"Fin Advice Resp",
  "0400":"Reversal Req",        "0410":"Reversal Resp",
  "0420":"Reversal Advice",     "0421":"Reversal Advice Rpt",
  "0430":"Reversal Adv Resp",   "0800":"Net Mgmt Req",
  "0810":"Net Mgmt Resp",       "0820":"Net Mgmt Advice",
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