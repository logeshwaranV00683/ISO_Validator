// T — all values are CSS variables so dark/light theme swap works via :root.light-theme
export const T = {
  bg:       "var(--bg)",
  surface:  "var(--surface)",
  surface2: "var(--surface2)",
  border:   "var(--border)",
  border2:  "var(--border2)",
  text:     "var(--text)",
  muted:    "var(--muted)",
  faint:    "var(--faint)",
  accent:   "var(--accent)",
  accent2:  "var(--accent2)",
  green:    "var(--green)",
  red:      "var(--red)",
  yellow:   "var(--yellow)",
  blue:     "var(--blue)",
  purple:   "var(--purple)",
  cadbury: "#B784A7",
  turquoise:"#0DB985",
  teal: "#0D97B9",
  cement:"#ADADAD",
  tetradic:"#E3DCDC",
  teak:"#49F278",
  fyellow:"#c2cd67"
};

export const SEV = {
  CRITICAL: { bg: "color-mix(in srgb, var(--red) 12%, transparent)",    border: "color-mix(in srgb, var(--red) 35%, transparent)",    text: "var(--red)"    },
  WARNING:  { bg: "color-mix(in srgb, var(--yellow) 12%, transparent)", border: "color-mix(in srgb, var(--yellow) 35%, transparent)", text: "var(--yellow)" },
  INFO:     { bg: "color-mix(in srgb, var(--blue) 12%, transparent)",   border: "color-mix(in srgb, var(--blue) 35%, transparent)",   text: "var(--blue)"   },
};

export const ENV_COLORS = { PROD: "#ff2d55", UAT: "#ff9f0a", DEV: "#3fb950" };

export const ROLES = {
  ADMIN:   { label: "Admin",   color: "var(--red)",    can: { edit:true,  delete:true,  add:true,  validate:true,  build:true  } },
  ANALYST: { label: "Analyst", color: "var(--yellow)", can: { edit:false, delete:false, add:false, validate:true,  build:true  } },
  VIEWER:  { label: "Viewer",  color: "var(--blue)",   can: { edit:false, delete:false, add:false, validate:false, build:false } },
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

export const MTIS = Object.keys(MTI_DESCRIPTIONS);

export const selectStyle = {
  width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
  color:"var(--text)", padding:"8px 10px", borderRadius:6,
  fontFamily:"inherit", fontSize:11, outline:"none", cursor:"pointer",
};

export const inputStyle = {
  width:"100%", boxSizing:"border-box", background:"var(--surface2)",
  border:"1px solid var(--border)", color:"var(--text)", padding:"8px 10px",
  borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none",
};