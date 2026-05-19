import { useState } from "react";

/* ═══════════════════════════════════════════
   THEME & CONSTANTS
═══════════════════════════════════════════ */
const T = {
  bg:       "#070a0f",
  surface:  "#0d1117",
  surface2: "#111720",
  border:   "#1e2d3d",
  border2:  "#243447",
  text:     "#e6edf3",
  muted:    "#8b949e",
  faint:    "#3d4f61",
  accent:   "#00d2ff",
  accent2:  "#0057ff",
  green:    "#3fb950",
  red:      "#ff2d55",
  yellow:   "#ff9f0a",
  blue:     "#0a84ff",
  purple:   "#bf5af2",
};

const SEV = {
  CRITICAL: { bg: T.red   + "18", border: T.red   + "55", text: T.red   },
  WARNING:  { bg: T.yellow+ "18", border: T.yellow+ "55", text: T.yellow },
  INFO:     { bg: T.blue  + "18", border: T.blue  + "55", text: T.blue   },
};

const ENV_COLORS = { PROD:"#ff2d55", UAT:"#ff9f0a", DEV:"#3fb950" };

const NAV = [
  { id:"validator", icon:"⬡", label:"Message Validator" },
  { id:"rules",     icon:"⚙", label:"Rules Manager"     },
  { id:"formats",   icon:"⬢", label:"Packager Configs"  },
  { id:"profiles",  icon:"⇄", label:"Switch Profiles"   },
  { id:"history",   icon:"◷", label:"Validation History"},
  { id:"ai",        icon:"◈", label:"AI Settings"       },
];

/* ── mock data ── */
const PROFILES = [
  { id:1, name:"Visa Switch",    format:"ISO87 ASCII",    formatId:1, env:"PROD", active:true,  isDefault:true,  rulesCount:14, lastUsed:"2025-05-14 14:30", host:"10.0.1.10:8583" },
  { id:2, name:"MasterCard GW", format:"ISO87 ASCII",    formatId:1, env:"UAT",  active:true,  isDefault:false, rulesCount:11, lastUsed:"2025-05-14 12:10", host:"10.0.1.20:8583" },
  { id:3, name:"Legacy Switch",  format:"ISO93 EBCDIC",  formatId:2, env:"DEV",  active:false, isDefault:false, rulesCount:8,  lastUsed:"2025-05-13 09:00", host:"10.0.2.5:9000"  },
];

const DE_NAMES = {
  DE2:"Primary Account Number",   DE3:"Processing Code",      DE4:"Transaction Amount",
  DE7:"Transmission Date & Time", DE11:"System Trace Audit",  DE12:"Local Transaction Time",
  DE13:"Local Transaction Date",  DE22:"POS Entry Mode",      DE37:"Retrieval Ref Number",
  DE39:"Response Code",           DE41:"Card Acceptor Term ID",DE42:"Card Acceptor ID",
};

const MOCK_FIELDS = [
  { de:"MTI",  name:"Message Type Indicator",    value:"0200",             present:true  },
  { de:"DE2",  name:"Primary Account Number",    value:"4111111111111111", present:true  },
  { de:"DE3",  name:"Processing Code",           value:"000000",           present:true  },
  { de:"DE4",  name:"Transaction Amount",        value:"00000010000",      present:true  },
  { de:"DE7",  name:"Transmission Date & Time",  value:"—",               present:false },
  { de:"DE11", name:"System Trace Audit",        value:"123456",           present:true  },
  { de:"DE22", name:"POS Entry Mode",            value:"—",               present:false },
  { de:"DE41", name:"Card Acceptor Terminal ID", value:"TERM0001",         present:true  },
];

const MOCK_ERRORS = [
  { field:"DE7",  name:"Transmission Date & Time",  severity:"CRITICAL", issue:"Field is mandatory but absent",          rule:"mandatory=true, length=10" },
  { field:"DE4",  name:"Transaction Amount",         severity:"WARNING",  issue:"Length is 11, expected exactly 12",      rule:"length=12"                 },
  { field:"DE22", name:"POS Entry Mode",             severity:"INFO",     issue:"Recommended field absent for 0200",      rule:"mandatory=false"           },
];

const MOCK_AI = [
  { field:"DE7", title:"Transmission Date & Time — Missing (CRITICAL)",
    body:"DE7 is mandatory in all 0200 authorization requests per ISO8583 spec. It timestamps when the transaction was initiated at the originating switch. Its absence causes acquirer switches to reject with response code 30 (Format Error), failing the transaction entirely.",
    fix:"Populate with MMDDHHmmss format. Example: 0514143022 (May 14, 14:30:22)" },
  { field:"DE4", title:"Transaction Amount — Invalid Length (WARNING)",
    body:"DE4 must be exactly 12 digits, right-justified and zero-padded to the left. You sent 11 digits (00000010000). This causes amount parsing failures at the issuer host, leading to incorrect transaction amounts or rejection.",
    fix:"Pad with a leading zero: 00000010000 → 000000010000" },
];

const MOCK_RULES = [
  { id:1, profileId:1, mti:"0200", de:"DE2",  name:"Primary Account Number",   mandatory:true,  minLen:13, maxLen:19, type:"numeric",      pattern:"^[0-9]+$",     severity:"CRITICAL", active:true,  desc:"PAN must be present for all purchase transactions",           updatedBy:"john.d",   updatedAt:"2025-05-10" },
  { id:2, profileId:1, mti:"0200", de:"DE3",  name:"Processing Code",           mandatory:true,  minLen:6,  maxLen:6,  type:"numeric",      pattern:"^[0-9]{6}$",   severity:"CRITICAL", active:true,  desc:"6-digit code identifying transaction type",                   updatedBy:"john.d",   updatedAt:"2025-05-10" },
  { id:3, profileId:1, mti:"0200", de:"DE4",  name:"Transaction Amount",        mandatory:true,  minLen:12, maxLen:12, type:"numeric",      pattern:"^[0-9]{12}$",  severity:"WARNING",  active:true,  desc:"Amount in smallest currency unit, 12 digits zero-padded",     updatedBy:"priya.s",  updatedAt:"2025-05-12" },
  { id:4, profileId:1, mti:"0200", de:"DE7",  name:"Transmission Date & Time",  mandatory:true,  minLen:10, maxLen:10, type:"numeric",      pattern:"^[0-9]{10}$",  severity:"CRITICAL", active:true,  desc:"MMDDHHmmss — switch timestamp",                               updatedBy:"priya.s",  updatedAt:"2025-05-12" },
  { id:5, profileId:1, mti:"0200", de:"DE11", name:"System Trace Audit Number", mandatory:true,  minLen:6,  maxLen:6,  type:"numeric",      pattern:"^[0-9]{6}$",   severity:"CRITICAL", active:true,  desc:"Unique trace per transaction within a day",                   updatedBy:"john.d",   updatedAt:"2025-05-10" },
  { id:6, profileId:1, mti:"0200", de:"DE41", name:"Card Acceptor Terminal ID", mandatory:false, minLen:8,  maxLen:8,  type:"alphanumeric", pattern:"^[A-Z0-9]{8}$",severity:"INFO",     active:true,  desc:"8-char terminal identifier, spaces for unused",               updatedBy:"admin",    updatedAt:"2025-05-08" },
];

const MOCK_FORMATS = [
  { id:1, name:"ISO87 ASCII",    version:"ISO 8583-1:1987", encoding:"ASCII",  fields:128, status:"active",   checksum:"a1b2c3d4", usedBy:["Visa Switch","MasterCard GW"], updatedBy:"admin", updatedAt:"2025-05-01", xmlVersion:3 },
  { id:2, name:"ISO93 EBCDIC",   version:"ISO 8583-1:1993", encoding:"EBCDIC", fields:128, status:"inactive", checksum:"e5f6a7b8", usedBy:["Legacy Switch"],               updatedBy:"admin", updatedAt:"2025-04-15", xmlVersion:1 },
  { id:3, name:"ISO2003 Binary", version:"ISO 8583-2:2003", encoding:"Binary", fields:192, status:"active",   checksum:"c9d0e1f2", usedBy:[],                              updatedBy:"admin", updatedAt:"2025-03-20", xmlVersion:2 },
];

const MOCK_HISTORY = [
  { id:"VLD-0041", ts:"2025-05-14 14:30:22", mti:"0200", profile:"Visa Switch",    env:"PROD", errors:2, status:"FAILED",  parsMs:12,  valMs:8,  aiMs:420, totalMs:440, raw:"0200723A00010AC08012345..." },
  { id:"VLD-0040", ts:"2025-05-14 14:28:11", mti:"0210", profile:"Visa Switch",    env:"PROD", errors:0, status:"PASSED",  parsMs:11,  valMs:6,  aiMs:0,   totalMs:17,  raw:"0210823A00010AC08098765..." },
  { id:"VLD-0039", ts:"2025-05-14 14:15:05", mti:"0420", profile:"MasterCard GW",  env:"UAT",  errors:1, status:"WARNED",  parsMs:14,  valMs:9,  aiMs:390, totalMs:413, raw:"0420923A00010AC08011111..." },
  { id:"VLD-0038", ts:"2025-05-14 13:50:44", mti:"0200", profile:"Visa Switch",    env:"PROD", errors:0, status:"PASSED",  parsMs:10,  valMs:7,  aiMs:0,   totalMs:17,  raw:"0200123A00010AC08099999..." },
  { id:"VLD-0037", ts:"2025-05-14 13:20:10", mti:"0200", profile:"Legacy Switch",  env:"DEV",  errors:4, status:"FAILED",  parsMs:18,  valMs:12, aiMs:510, totalMs:540, raw:"0200FF3A00010AC08077777..." },
];

const BITMAP_PRESENT = ["DE2","DE3","DE4","DE11","DE41"];

/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("validator");

  return (
    <div style={{ fontFamily:"'JetBrains Mono','Fira Code',monospace", background:T.bg, color:T.text, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <TopBar />
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <Sidebar page={page} setPage={p => setPage(p)} />
        <main style={{ flex:1, overflow:"auto", padding:24, display:"flex", flexDirection:"column", gap:16 }}>
          {page === "validator" && <ValidatorPage />}
          {page === "rules"     && <RulesPage />}
          {page === "formats"   && <FormatsPage />}
          {page === "profiles"  && <ProfilesPage />}
          {page === "history"   && <HistoryPage />}
          {page === "ai"        && <AIPage />}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════ */
function TopBar() {
  return (
    <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:30, height:30, borderRadius:7, background:`linear-gradient(135deg,${T.accent2},${T.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⬡</div>
        <span style={{ fontSize:14, fontWeight:700, color:T.text, letterSpacing:"-0.3px" }}>
          ISO<span style={{ color:T.accent }}>8583</span> Validator
        </span>
        <Tag color={T.red}>PROD</Tag>
      </div>
      <div style={{ display:"flex", gap:20, fontSize:11, color:T.muted, alignItems:"center" }}>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
          <Dot color={T.green} /> Ollama · Mistral 7B · localhost:11434
        </span>
        <span style={{ color:T.faint }}>|</span>
        <span>Org Network · 192.168.1.0/24</span>
        <span style={{ color:T.faint }}>|</span>
        <span style={{ color:T.muted }}>v2.1.0</span>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
function Sidebar({ page, setPage }) {
  return (
    <aside style={{ width:215, background:T.surface, borderRight:`1px solid ${T.border}`, padding:"12px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
      {NAV.map(n => (
        <button key={n.id} onClick={() => setPage(n.id)} style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"10px 20px", border:"none", cursor:"pointer",
          background: page===n.id ? T.accent+"12" : "transparent",
          borderLeft: `2px solid ${page===n.id ? T.accent : "transparent"}`,
          color: page===n.id ? T.accent : T.muted,
          fontSize:11.5, fontFamily:"inherit", transition:"all 0.12s", textAlign:"left", width:"100%",
        }}>
          <span style={{ fontSize:13 }}>{n.icon}</span>{n.label}
        </button>
      ))}
    </aside>
  );
}

/* ═══════════════════════════════════════════
   1. VALIDATOR PAGE
═══════════════════════════════════════════ */
function ValidatorPage() {
  const [profileId, setProfileId]   = useState(1);
  const [rawMsg, setRawMsg]         = useState("0200723A00010AC08012345678901234560000000000000100000514143022123456TERM0001");
  const [sevFilter, setSevFilter]   = useState("ALL");
  const [validated, setValidated]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState({});
  const [bitmapExt, setBitmapExt]   = useState(false);
  const [hexView, setHexView]       = useState(false);
  const [copied, setCopied]         = useState(false);

  const profile = PROFILES.find(p => p.id === profileId);
  const filtered = sevFilter === "ALL" ? MOCK_ERRORS : MOCK_ERRORS.filter(e => e.severity === sevFilter);

  const validate = () => { setLoading(true); setTimeout(() => { setLoading(false); setValidated(true); }, 1500); };
  const clear    = () => { setRawMsg(""); setValidated(false); };
  const copy     = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const TIMING = { parse:12, validate:8, ai:420, total:440 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Message Validator" sub="Parse · Validate · AI-explain ISO8583 messages in one click" />

      {/* ── Input Row ── */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 220px", gap:16 }}>
          <div>
            <Row>
              <Label>Raw ISO8583 Message</Label>
              {hexView && <span style={{ fontSize:10, color:T.muted }}>hex view active</span>}
            </Row>
            <textarea value={rawMsg} onChange={e => setRawMsg(e.target.value)} rows={3}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color: hexView ? T.accent : T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }}
              placeholder="Paste raw ISO message here…"
            />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <Label>Switch Profile <Required /></Label>
              <select value={profileId} onChange={e => setProfileId(+e.target.value)} style={selectStyle}>
                {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault?" (default)":""}</option>)}
              </select>
              {profile && (
                <div style={{ fontSize:10, color:T.muted, marginTop:4, display:"flex", gap:8 }}>
                  <span>{profile.format}</span>
                  <span style={{ color:T.faint }}>·</span>
                  <Tag color={ENV_COLORS[profile.env]} small>{profile.env}</Tag>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn onClick={validate} disabled={loading} primary style={{ flex:1 }}>
                {loading ? "Processing…" : "▶ VALIDATE"}
              </Btn>
              <Btn onClick={clear} secondary>✕ Clear</Btn>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <Toggle label="Hex View" active={hexView} onClick={() => setHexView(x=>!x)} />
              <Toggle label="Extended Bitmap" active={bitmapExt} onClick={() => setBitmapExt(x=>!x)} />
            </div>
          </div>
        </div>
      </Card>

      {loading && <LoadingBar />}

      {validated && !loading && (<>
        {/* ── Timing Strip ── */}
        <div style={{ display:"flex", gap:10, alignItems:"center", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 14px", fontSize:11 }}>
          <span style={{ color:T.muted, marginRight:4 }}>Processing:</span>
          {[["Parse", TIMING.parse, T.accent], ["Validate", TIMING.validate, T.green], ["AI", TIMING.ai, T.purple]].map(([l,v,c]) => (
            <span key={l} style={{ color:T.muted }}>{l}: <span style={{ color:c, fontWeight:700 }}>{v}ms</span></span>
          ))}
          <span style={{ color:T.faint }}>·</span>
          <span style={{ color:T.muted }}>Total: <span style={{ color:T.text, fontWeight:700 }}>{TIMING.total}ms</span></span>
          <div style={{ flex:1 }} />
          <span style={{ color:T.muted }}>ID: <span style={{ color:T.accent }}>VLD-0041</span></span>
          <span style={{ color:T.faint }}>·</span>
          <span style={{ color:T.muted }}>2025-05-14 14:30:22</span>
          <Btn onClick={copy} secondary style={{ padding:"3px 10px", fontSize:10 }}>
            {copied ? "✓ Copied" : "⎘ Copy JSON"}
          </Btn>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {/* LEFT */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Parsed Fields */}
            <Card title="Parsed Fields" badge={`${MOCK_FIELDS.filter(f=>f.present).length} / ${MOCK_FIELDS.length} present`}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {["DE","Field Name","Value","Status"].map(h => <Th key={h}>{h}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_FIELDS.map(f => (
                    <tr key={f.de} style={{ borderBottom:`1px solid ${T.border}22` }}>
                      <td style={{ padding:"6px 8px", color:T.accent, fontWeight:700, fontSize:11 }}>{f.de}</td>
                      <td style={{ padding:"6px 8px", color:T.muted, fontSize:10 }}>{f.name}</td>
                      <td style={{ padding:"6px 8px", color:f.present ? T.text : T.faint }}>{f.value}</td>
                      <td style={{ padding:"6px 8px" }}>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:f.present?T.green+"22":T.red+"22", color:f.present?T.green:T.red }}>
                          {f.present?"PRESENT":"ABSENT"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Bitmap */}
            <Card title={bitmapExt ? "Bitmap — Extended (128-bit)" : "Bitmap — Primary (64-bit)"}
              badge={`${BITMAP_PRESENT.length} bits ON`}
              extra={<Toggle label="Extended" active={bitmapExt} onClick={()=>setBitmapExt(x=>!x)} />}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:3 }}>
                {Array.from({ length: bitmapExt ? 128 : 64 }, (_,i) => {
                  const de = `DE${i+1}`;
                  const on = BITMAP_PRESENT.includes(de);
                  return (
                    <div key={de} title={`${de}${DE_NAMES[de] ? " — "+DE_NAMES[de] : ""}`} style={{
                      padding:"4px 0", textAlign:"center", borderRadius:3,
                      background: on ? T.accent+"22" : T.surface2,
                      border:`1px solid ${on ? T.accent+"55" : T.border}`,
                      color: on ? T.accent : T.faint, fontSize:8.5, cursor:"default",
                    }}>{i+1}</div>
                  );
                })}
              </div>
              <div style={{ marginTop:8, display:"flex", gap:14, fontSize:10, color:T.muted }}>
                <span><ColorBox color={T.accent+"33"} /> Present ({BITMAP_PRESENT.length})</span>
                <span><ColorBox color={T.surface2} /> Absent ({(bitmapExt?128:64)-BITMAP_PRESENT.length})</span>
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {/* Errors */}
            <Card title="Validation Errors"
              badge={<span style={{ color: MOCK_ERRORS.length>0 ? T.red : T.green }}>{MOCK_ERRORS.length} issue{MOCK_ERRORS.length!==1?"s":""}</span>}
              extra={
                <div style={{ display:"flex", gap:4 }}>
                  {["ALL","CRITICAL","WARNING","INFO"].map(s => (
                    <button key={s} onClick={()=>setSevFilter(s)} style={{
                      background: sevFilter===s ? (s==="ALL"?T.accent:SEV[s]?.text||T.accent)+"22" : "transparent",
                      border:`1px solid ${sevFilter===s ? (s==="ALL"?T.accent:SEV[s]?.text||T.accent)+"66" : T.border}`,
                      color: sevFilter===s ? (s==="ALL"?T.accent:SEV[s]?.text||T.accent) : T.faint,
                      padding:"2px 7px", borderRadius:4, fontSize:9, fontFamily:"inherit", cursor:"pointer",
                    }}>{s}</button>
                  ))}
                </div>
              }
            >
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filtered.map((e,i) => {
                  const sc = SEV[e.severity];
                  return (
                    <div key={i} style={{ background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:6, padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                        <span style={{ color:sc.text, fontWeight:700, fontSize:12 }}>{e.field}</span>
                        <span style={{ fontSize:9, padding:"2px 7px", borderRadius:3, background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{e.severity}</span>
                        <span style={{ fontSize:10, color:T.muted, fontStyle:"italic" }}>{e.name}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.text, marginBottom:3 }}>{e.issue}</div>
                      <div style={{ fontSize:10, color:T.faint }}>Rule: {e.rule}</div>
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ textAlign:"center", color:T.muted, fontSize:12, padding:"12px 0" }}>No {sevFilter!=="ALL"?sevFilter+" ":""} issues</div>}
              </div>
            </Card>

            {/* AI Explanation */}
            <Card title="AI Explanation" badge={<span style={{ color:T.accent, fontSize:10 }}>Mistral 7B · 420ms · Local</span>}>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {MOCK_AI.map((a,i) => (
                  <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
                    <button onClick={() => setExpanded(x=>({...x,[i]:!x[i]}))}
                      style={{ width:"100%", background:"none", border:"none", padding:"10px 12px", cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:T.accent }}>{a.title}</span>
                      <span style={{ color:T.faint, fontSize:12 }}>{expanded[i]?"▲":"▼"}</span>
                    </button>
                    {expanded[i] !== false && (
                      <div style={{ padding:"0 12px 12px", fontSize:11, lineHeight:1.8 }}>
                        <p style={{ color:T.muted, margin:"0 0 8px" }}>{a.body}</p>
                        <div style={{ background:T.green+"12", border:`1px solid ${T.green}33`, borderRadius:4, padding:"6px 10px", color:T.green, fontSize:11 }}>
                          → <strong>Fix:</strong> {a.fix}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Summary */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              {[["1 CRITICAL",T.red],["1 WARNING",T.yellow],["1 INFO",T.blue]].map(([l,c])=>(
                <Tag key={l} color={c}>{l}</Tag>
              ))}
              <div style={{ flex:1 }} />
              <Btn secondary style={{ fontSize:10, padding:"4px 10px" }}>↺ Re-run</Btn>
              <Btn secondary style={{ fontSize:10, padding:"4px 10px" }}>⬇ Export JSON</Btn>
            </div>
          </div>
        </div>
      </>)}

      {!validated && !loading && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:T.faint, fontSize:13, gap:8, padding:"40px 0" }}>
          <span style={{ fontSize:28 }}>⬡</span>
          <span>Paste a message, select a profile, and click VALIDATE</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. RULES MANAGER
═══════════════════════════════════════════ */
function RulesPage() {
  const [profileId, setProfileId] = useState(1);
  const [mti, setMti]             = useState("0200");
  const [showAdd, setShowAdd]     = useState(false);

  const profile = PROFILES.find(p => p.id === profileId);
  const rules   = MOCK_RULES.filter(r => r.profileId === profileId && r.mti === mti);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Rules Manager" sub="Dynamic per-profile, per-MTI validation rules — stored in DB, no redeploy needed" />

      {/* Profile + MTI selectors */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, alignItems:"end" }}>
          <div>
            <Label>Switch Profile <Required /></Label>
            <select value={profileId} onChange={e=>setProfileId(+e.target.value)} style={selectStyle}>
              {PROFILES.map(p=><option key={p.id} value={p.id}>{p.name} ({p.env})</option>)}
            </select>
            {profile && (
              <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>
                Format: <span style={{ color:T.accent }}>{profile.format}</span> · {profile.rulesCount} rules configured
              </div>
            )}
          </div>
          <div>
            <Label>Message Type Indicator (MTI)</Label>
            <div style={{ display:"flex", gap:8 }}>
              {["0200","0210","0420","0800","0810"].map(m=>(
                <button key={m} onClick={()=>setMti(m)} style={{
                  background: mti===m ? T.accent+"22" : T.surface2,
                  border:`1px solid ${mti===m ? T.accent : T.border}`,
                  color: mti===m ? T.accent : T.muted,
                  padding:"7px 16px", borderRadius:6, fontSize:11, fontFamily:"inherit", cursor:"pointer",
                }}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.muted }}>{rules.length} rules for <span style={{ color:T.text }}>{profile?.name}</span> · MTI <span style={{ color:T.accent }}>{mti}</span></span>
        <div style={{ flex:1 }} />
        <Btn primary onClick={()=>setShowAdd(true)}>+ Add Rule</Btn>
        <Btn secondary>⬆ Import JSON</Btn>
        <Btn secondary>⬇ Export JSON</Btn>
        <Btn secondary>↺ Reload Cache</Btn>
      </div>

      {/* Rules Table */}
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["DE","Field Name","Mandatory","Min","Max","Type","Severity","Pattern / Regex","Active","Description","Audit","Actions"].map(h=><Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rules.map(r=>(
                <tr key={r.id} style={{ borderBottom:`1px solid ${T.border}22`, opacity:r.active?1:0.45 }}>
                  <td style={{ padding:"8px 8px", color:T.accent, fontWeight:700 }}>{r.de}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, maxWidth:130 }}>{r.name}</td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}>
                    <span style={{ color:r.mandatory?T.green:T.faint, fontSize:12 }}>{r.mandatory?"✓":"✗"}</span>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.text, textAlign:"center" }}>{r.minLen}</td>
                  <td style={{ padding:"8px 8px", color:T.text, textAlign:"center" }}>{r.maxLen}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={T.blue} small>{r.type}</Tag></td>
                  <td style={{ padding:"8px 8px" }}><Tag color={SEV[r.severity].text} small>{r.severity}</Tag></td>
                  <td style={{ padding:"8px 8px", color:T.faint, fontSize:10, fontFamily:"inherit" }}>{r.pattern}</td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}>
                    <div style={{ width:28, height:15, borderRadius:8, background:r.active?T.green+"44":T.faint+"44", border:`1px solid ${r.active?T.green:T.faint}`, display:"inline-flex", alignItems:"center", padding:"0 2px", cursor:"pointer" }}>
                      <div style={{ width:11, height:11, borderRadius:"50%", background:r.active?T.green:T.faint, marginLeft:r.active?12:0, transition:"margin 0.15s" }} />
                    </div>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, maxWidth:160 }}>{r.desc}</td>
                  <td style={{ padding:"8px 8px", fontSize:9, color:T.faint, whiteSpace:"nowrap" }}>
                    <div>{r.updatedBy}</div><div>{r.updatedAt}</div>
                  </td>
                  <td style={{ padding:"8px 8px" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      <SmBtn>Edit</SmBtn>
                      <SmBtn>History</SmBtn>
                      <SmBtn danger>Del</SmBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {rules.length===0 && (
                <tr><td colSpan={12} style={{ padding:"24px", textAlign:"center", color:T.faint, fontSize:12 }}>No rules configured for {mti} on this profile</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Total Rules",      value:rules.length,                    color:T.accent },
          { label:"Active Rules",     value:rules.filter(r=>r.active).length, color:T.green  },
          { label:"Mandatory Fields", value:rules.filter(r=>r.mandatory).length, color:T.yellow },
          { label:"Last Updated",     value:"2025-05-12",                    color:T.muted  },
        ].map(s=>(
          <div key={s.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:T.muted, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {showAdd && <AddRuleModal onClose={()=>setShowAdd(false)} profile={profile} mti={mti} />}
    </div>
  );
}

function AddRuleModal({ onClose, profile, mti }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:24, width:520, maxHeight:"80vh", overflow:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ fontSize:14, fontWeight:700, color:T.text }}>Add Rule — {profile?.name} · {mti}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, fontSize:12 }}>
          {[
            { label:"DE Number", placeholder:"DE7" },
            { label:"Field Name", placeholder:"Transmission Date & Time" },
            { label:"Min Length", placeholder:"10" },
            { label:"Max Length", placeholder:"10" },
            { label:"Pattern / Regex", placeholder:"^[0-9]{10}$" },
            { label:"Effective From", placeholder:"2025-05-14", type:"date" },
          ].map(f=>(
            <div key={f.label}>
              <Label>{f.label}</Label>
              <input type={f.type||"text"} placeholder={f.placeholder} style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:11, outline:"none" }} />
            </div>
          ))}
          <div>
            <Label>Data Type</Label>
            <select style={selectStyle}>
              {["numeric","alpha","alphanumeric","binary","special"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Severity if Failed</Label>
            <select style={selectStyle}>
              {["CRITICAL","WARNING","INFO"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <Label>Description / Notes</Label>
            <textarea rows={2} placeholder="Why this rule exists…" style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:11, outline:"none", resize:"vertical" }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Label>Mandatory</Label>
            <Toggle label="Yes" active={true} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Label>Active</Label>
            <Toggle label="Yes" active={true} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <Btn secondary onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={onClose}>Save Rule</Btn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. PACKAGER CONFIGS
═══════════════════════════════════════════ */
function FormatsPage() {
  const [selected, setSelected] = useState(null);
  const [xmlVal, setXmlVal]     = useState(false);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Packager Configs" sub="ISO format configs stored in DB — replaces static iso87ascii.xml. Hot-reloadable without restart." />
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <Btn primary>+ New Config</Btn>
        <Btn secondary>⬆ Upload XML</Btn>
      </div>

      {MOCK_FORMATS.map(f=>(
        <div key={f.id} style={{ background:T.surface, border:`1px solid ${selected===f.id?T.accent:T.border}`, borderLeft:`3px solid ${f.status==="active"?T.green:T.faint}`, borderRadius:6, padding:16 }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{f.name}</span>
                <Tag color={f.status==="active"?T.green:T.faint} small>{f.status.toUpperCase()}</Tag>
              </div>
              <div style={{ fontSize:11, color:T.muted, display:"flex", gap:16, flexWrap:"wrap" }}>
                <span>{f.version}</span>
                <span>{f.encoding} encoding</span>
                <span>{f.fields} DEs</span>
                <span>Version: <span style={{ color:T.text }}>v{f.xmlVersion}</span></span>
                <span>Checksum: <span style={{ color:T.accent, fontFamily:"inherit" }}>{f.checksum}</span></span>
                <span>Updated by <span style={{ color:T.text }}>{f.updatedBy}</span> on {f.updatedAt}</span>
              </div>
              <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:10, color:T.muted }}>Used by: </span>
                {f.usedBy.length ? f.usedBy.map(p=>(
                  <Tag key={p} color={T.accent} small>{p}</Tag>
                )) : <span style={{ fontSize:10, color:T.faint }}>Not used by any profile</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <SmBtn onClick={()=>setSelected(selected===f.id?null:f.id)}>
                {selected===f.id?"▲ Close Editor":"▼ Edit XML"}
              </SmBtn>
              <SmBtn onClick={()=>setXmlVal(true)}>Validate XML</SmBtn>
              <SmBtn>🔄 Hot Reload</SmBtn>
              <SmBtn>Clone</SmBtn>
              <SmBtn>Version History</SmBtn>
              {f.usedBy.length===0&&<SmBtn danger>Delete</SmBtn>}
            </div>
          </div>

          {selected===f.id && (
            <div style={{ marginTop:14, borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
              {xmlVal && (
                <div style={{ marginBottom:10, background:T.green+"12", border:`1px solid ${T.green}33`, borderRadius:5, padding:"8px 12px", fontSize:11, color:T.green }}>
                  ✓ XML structure validated — valid jPOS GenericPackager config
                </div>
              )}
              <Label>XML Config Editor — {f.name}</Label>
              <textarea rows={8} defaultValue={`<isopackager>\n  <isofield id="2"  length="19" name="Primary Account Number"    class="IFB_LLNUM"   />\n  <isofield id="3"  length="6"  name="Processing Code"           class="IFB_NUMERIC" />\n  <isofield id="4"  length="12" name="Transaction Amount"         class="IFB_NUMERIC" />\n  <isofield id="7"  length="10" name="Transmission Date and Time" class="IFB_NUMERIC" />\n  <isofield id="11" length="6"  name="System Trace Audit Number"  class="IFB_NUMERIC" />\n  <isofield id="41" length="8"  name="Card Acceptor Terminal ID"  class="IFB_CHAR"    />\n  <!-- add more DEs here -->\n</isopackager>`}
                style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }}
              />
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <Btn primary onClick={()=>setXmlVal(true)}>✓ Validate XML</Btn>
                <Btn primary>💾 Save to DB</Btn>
                <Btn secondary>🔄 Hot Reload</Btn>
                <Btn secondary>Diff vs Previous</Btn>
                <Btn secondary>↺ Reset</Btn>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   4. SWITCH PROFILES
═══════════════════════════════════════════ */
function ProfilesPage() {
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState({});

  const testConn = (id) => {
    setTesting(id);
    setTimeout(()=>{
      setTesting(null);
      setTestResult(x=>({...x,[id]: id===3?"FAILED":"OK"}));
    }, 1200);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Switch Profiles" sub="Each profile binds a packager format + validation rules + switch host. One dropdown to rule them all." />
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <Btn primary>+ New Profile</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {PROFILES.map(p=>{
          const conn = testResult[p.id];
          return (
            <div key={p.id} style={{
              background:T.surface, borderRadius:8,
              border:`1px solid ${p.isDefault?T.accent:T.border}`,
              borderTop:`2px solid ${p.active?ENV_COLORS[p.env]:T.faint}`,
              padding:16, opacity:p.active?1:0.6,
            }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{p.name}</span>
                    {p.isDefault && <Tag color={T.accent} small>DEFAULT</Tag>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <Tag color={ENV_COLORS[p.env]} small>{p.env}</Tag>
                    <Tag color={p.active?T.green:T.faint} small>{p.active?"ACTIVE":"INACTIVE"}</Tag>
                  </div>
                </div>
                {/* Active toggle */}
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:T.muted }}>
                  Active
                  <div style={{ width:32, height:17, borderRadius:9, background:p.active?T.green+"44":T.faint+"44", border:`1px solid ${p.active?T.green:T.faint}`, display:"flex", alignItems:"center", padding:"0 2px", cursor:"pointer" }}>
                    <div style={{ width:13, height:13, borderRadius:"50%", background:p.active?T.green:T.faint, marginLeft:p.active?14:0, transition:"margin 0.15s" }} />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ fontSize:11, color:T.muted, display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
                <Row>
                  <span>Packager Format:</span>
                  <span style={{ color:T.accent }}>{p.format}</span>
                </Row>
                <Row>
                  <span>Host:</span>
                  <span style={{ color:T.text, fontFamily:"inherit" }}>{p.host}</span>
                </Row>
                <Row>
                  <span>Rules Configured:</span>
                  <span style={{ color:T.yellow, fontWeight:700 }}>{p.rulesCount} rules</span>
                </Row>
                <Row>
                  <span>Last Used:</span>
                  <span style={{ color:T.text }}>{p.lastUsed}</span>
                </Row>
              </div>

              {/* Connection test result */}
              {conn && (
                <div style={{ marginBottom:10, padding:"6px 10px", borderRadius:4, fontSize:11, background:conn==="OK"?T.green+"12":T.red+"12", color:conn==="OK"?T.green:T.red, border:`1px solid ${conn==="OK"?T.green+"33":T.red+"33"}` }}>
                  {conn==="OK" ? "✓ Connection OK — switch reachable" : "✗ Connection FAILED — host unreachable"}
                </div>
              )}

              {/* Actions */}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <SmBtn onClick={()=>testConn(p.id)}>
                  {testing===p.id ? "Testing…" : "Test Connection"}
                </SmBtn>
                <SmBtn>Edit</SmBtn>
                <SmBtn>Clone</SmBtn>
                {!p.isDefault && <SmBtn>Set Default</SmBtn>}
                {!p.isDefault && <SmBtn danger>Delete</SmBtn>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Profile–Format relationship table */}
      <Card title="Profile → Format Mapping" badge="overview">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Profile","Environment","Format","Encoding","DEs","Rules","Default","Status"].map(h=><Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {PROFILES.map(p=>{
              const fmt = MOCK_FORMATS.find(f=>f.id===p.formatId);
              return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${T.border}22` }}>
                  <td style={{ padding:"8px 8px", color:T.text, fontWeight:700 }}>{p.name}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={ENV_COLORS[p.env]} small>{p.env}</Tag></td>
                  <td style={{ padding:"8px 8px", color:T.accent }}>{fmt?.name}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{fmt?.encoding}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{fmt?.fields}</td>
                  <td style={{ padding:"8px 8px", color:T.yellow }}>{p.rulesCount}</td>
                  <td style={{ padding:"8px 8px" }}>{p.isDefault && <Tag color={T.accent} small>YES</Tag>}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={p.active?T.green:T.faint} small>{p.active?"ACTIVE":"INACTIVE"}</Tag></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   5. VALIDATION HISTORY
═══════════════════════════════════════════ */
function HistoryPage() {
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("ALL");
  const [mtiF, setMtiF]         = useState("ALL");
  const [profF, setProfF]       = useState("ALL");
  const [page, setPage]         = useState(1);

  const filtered = MOCK_HISTORY.filter(h =>
    (statusF==="ALL" || h.status===statusF) &&
    (mtiF==="ALL"   || h.mti===mtiF) &&
    (profF==="ALL"  || h.profile===profF) &&
    (search===""    || h.id.includes(search) || h.mti.includes(search))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Validation History" sub="Full audit log of every parsed and validated ISO8583 message" />

      {/* Filters */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 140px 120px 120px", gap:10, alignItems:"end" }}>
          <div>
            <Label>Search</Label>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, MTI…"
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"8px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
          </div>
          <div>
            <Label>Status</Label>
            <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={selectStyle}>
              {["ALL","PASSED","FAILED","WARNED"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>MTI</Label>
            <select value={mtiF} onChange={e=>setMtiF(e.target.value)} style={selectStyle}>
              {["ALL","0200","0210","0420"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>Profile</Label>
            <select value={profF} onChange={e=>setProfF(e.target.value)} style={selectStyle}>
              {["ALL",...PROFILES.map(p=>p.name)].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <Label>From Date</Label>
            <input type="date" style={{ ...selectStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
          <div>
            <Label>To Date</Label>
            <input type="date" style={{ ...selectStyle, width:"100%", boxSizing:"border-box" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:10, justifyContent:"flex-end" }}>
          <Btn secondary>⬇ Export CSV</Btn>
          <Btn secondary>↺ Reset Filters</Btn>
        </div>
      </Card>

      {/* Summary stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Total Runs",   value:MOCK_HISTORY.length,                      color:T.accent },
          { label:"Passed",       value:MOCK_HISTORY.filter(h=>h.status==="PASSED").length, color:T.green  },
          { label:"Failed",       value:MOCK_HISTORY.filter(h=>h.status==="FAILED").length, color:T.red    },
          { label:"Avg AI Time",  value:`${Math.round(MOCK_HISTORY.filter(h=>h.aiMs>0).reduce((a,h)=>a+h.aiMs,0)/MOCK_HISTORY.filter(h=>h.aiMs>0).length)}ms`, color:T.purple },
        ].map(s=>(
          <div key={s.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:T.muted, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card title="Records" badge={`${filtered.length} results`}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["","ID","Timestamp","MTI","Profile","Env","Errors","Parse","Validate","AI","Total","Status",""].map(h=><Th key={h+Math.random()}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(h=>{
              const sc = { PASSED:T.green, FAILED:T.red, WARNED:T.yellow }[h.status];
              const isOpen = expanded===h.id;
              return (<>
                <tr key={h.id} style={{ borderBottom: isOpen ? "none" : `1px solid ${T.border}22`, background: isOpen ? T.surface2 : "transparent" }}>
                  <td style={{ padding:"8px 6px", textAlign:"center" }}>
                    <button onClick={()=>setExpanded(isOpen?null:h.id)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, width:20, height:20, borderRadius:3, cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isOpen?"▲":"▼"}
                    </button>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.accent }}>{h.id}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 }}>{h.ts}</td>
                  <td style={{ padding:"8px 8px", color:T.text, fontWeight:700 }}>{h.mti}</td>
                  <td style={{ padding:"8px 8px", color:T.text }}>{h.profile}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={ENV_COLORS[h.env]} small>{h.env}</Tag></td>
                  <td style={{ padding:"8px 8px", color:h.errors>0?T.yellow:T.green, textAlign:"center", fontWeight:700 }}>{h.errors}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, textAlign:"center" }}>{h.parsMs}ms</td>
                  <td style={{ padding:"8px 8px", color:T.muted, textAlign:"center" }}>{h.valMs}ms</td>
                  <td style={{ padding:"8px 8px", color:h.aiMs?T.purple:T.faint, textAlign:"center" }}>{h.aiMs?`${h.aiMs}ms`:"—"}</td>
                  <td style={{ padding:"8px 8px", color:T.text, textAlign:"center", fontWeight:700 }}>{h.totalMs}ms</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={sc} small>{h.status}</Tag></td>
                  <td style={{ padding:"8px 8px" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      <SmBtn>View</SmBtn>
                      <SmBtn>↺ Re-run</SmBtn>
                      <SmBtn>⬇ JSON</SmBtn>
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr key={h.id+"_exp"} style={{ borderBottom:`1px solid ${T.border}22`, background:T.surface2 }}>
                    <td colSpan={13} style={{ padding:"10px 14px" }}>
                      <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>Raw Message Preview:</div>
                      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 12px", fontFamily:"inherit", fontSize:11, color:T.accent, wordBreak:"break-all" }}>
                        {h.raw}<span style={{ color:T.faint }}>…</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>);
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, justifyContent:"flex-end" }}>
          <span style={{ fontSize:11, color:T.muted }}>Page {page} of 1</span>
          <SmBtn onClick={()=>setPage(p=>Math.max(1,p-1))}>← Prev</SmBtn>
          <SmBtn onClick={()=>setPage(p=>p+1)}>Next →</SmBtn>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   6. AI SETTINGS
═══════════════════════════════════════════ */
function AIPage() {
  const [testOutput, setTestOutput] = useState(null);
  const [testing, setTesting]       = useState(false);
  const [activeTab, setActiveTab]   = useState("global");

  const test = () => {
    setTesting(true);
    setTimeout(()=>{
      setTesting(false);
      setTestOutput("DE7 is missing Transmission Date & Time. This field is mandatory for all 0200 messages...");
    }, 1400);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="AI Settings" sub="Configure Ollama model, prompt templates, fallback behavior — all stored in DB, editable without redeploy" />

      {/* Tabs */}
      <div style={{ display:"flex", gap:6, borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        {[["global","Global Config"],["profiles","Per-Profile Prompts"],["history","Prompt History"]].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{
            background:"none", border:"none",
            borderBottom:`2px solid ${activeTab===id?T.accent:"transparent"}`,
            color: activeTab===id?T.accent:T.muted,
            padding:"8px 16px", fontFamily:"inherit", fontSize:12, cursor:"pointer", marginBottom:-1,
          }}>{label}</button>
        ))}
      </div>

      {activeTab === "global" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {/* Model config */}
            <Card title="Model Configuration">
              <div style={{ display:"flex", flexDirection:"column", gap:10, fontSize:12 }}>
                {[
                  { label:"Ollama Endpoint",  val:"http://localhost:11434/api/generate", w:"100%" },
                  { label:"Active Model",     val:"mistral:7b" },
                  { label:"Temperature",      val:"0.3", type:"number" },
                  { label:"Max Tokens",       val:"1024", type:"number" },
                  { label:"Timeout (ms)",     val:"15000", type:"number" },
                  { label:"Retry Count",      val:"2", type:"number" },
                ].map(f=>(
                  <div key={f.label} style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ width:140, color:T.muted, fontSize:11, flexShrink:0 }}>{f.label}</span>
                    <input type={f.type||"text"} defaultValue={f.val} style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"6px 10px", borderRadius:4, fontFamily:"inherit", fontSize:11, outline:"none" }} />
                  </div>
                ))}
                <div>
                  <Label>Fallback Behavior (if Ollama down)</Label>
                  <select style={selectStyle}>
                    {["SKIP_AI — return validation only","RETURN_ERROR — fail the request","RETRY — retry N times then skip"].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <Btn primary>💾 Save</Btn>
                  <Btn secondary>Test Connection</Btn>
                </div>
              </div>
            </Card>

            {/* Available models + stats */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Card title="Available Models" badge="Ollama local">
                {[
                  { name:"mistral:7b",    size:"4.1GB", active:true  },
                  { name:"phi3:mini",     size:"2.3GB", active:false },
                  { name:"llama3:8b",     size:"4.7GB", active:false },
                  { name:"codellama:7b",  size:"3.8GB", active:false },
                ].map((m,i)=>(
                  <div key={m.name} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<3?`1px solid ${T.border}22`:"none" }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, color:m.active?T.accent:T.text }}>{m.name}</div>
                      <div style={{ fontSize:10, color:T.faint }}>{m.size}</div>
                    </div>
                    {m.active ? <span style={{ fontSize:10, color:T.green }}>● Active</span> : <SmBtn>Set Active</SmBtn>}
                  </div>
                ))}
                <Btn secondary style={{ marginTop:8, width:"100%", textAlign:"center" }}>⬇ Pull New Model</Btn>
              </Card>

              <Card title="Response Time Stats">
                {[
                  { label:"Avg Response", value:"412ms", color:T.purple },
                  { label:"P95 Response", value:"680ms", color:T.yellow },
                  { label:"AI Runs Today",value:"41",    color:T.accent  },
                  { label:"Skip Rate",    value:"0%",    color:T.green   },
                ].map(s=>(
                  <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}22`, fontSize:11 }}>
                    <span style={{ color:T.muted }}>{s.label}</span>
                    <span style={{ color:s.color, fontWeight:700 }}>{s.value}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          {/* Global prompt template */}
          <Card title="Global Prompt Template" badge="Editable · Stored in DB">
            <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>
              Variables: {["{mti}","{profile}","{fields}","{errors}"].map(v=>(
                <Tag key={v} color={T.accent} small style={{ marginLeft:4 }}>{v}</Tag>
              ))}
            </div>
            <textarea rows={8}
              defaultValue={`You are an ISO8583 payment expert assisting with a fintech switch migration.\n\nFor each validation error below, provide:\n1. What the issue is\n2. Why it matters in payment processing\n3. Exact fix with example value\n\nContext:\n- MTI: {mti}\n- Switch Profile: {profile}\n- Parsed Fields: {fields}\n\nValidation Errors:\n{errors}\n\nRespond field-by-field. Be concise, technical, and actionable. No markdown.`}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }}
            />
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <Btn primary>💾 Save Template</Btn>
              <Btn secondary onClick={test}>{testing?"Testing…":"▶ Test Prompt"}</Btn>
              <Btn secondary>Version History</Btn>
              <Btn secondary>↺ Reset Default</Btn>
            </div>
            {testOutput && (
              <div style={{ marginTop:12, background:T.bg, border:`1px solid ${T.green}33`, borderRadius:6, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:T.green, marginBottom:6 }}>✓ AI Response Preview (420ms)</div>
                <div style={{ fontSize:11, color:T.muted, lineHeight:1.7 }}>{testOutput}</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "profiles" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:12, color:T.muted }}>
            Override the global prompt for specific switch profiles. Leave blank to inherit the global template.
          </div>
          {PROFILES.map(p=>(
            <Card key={p.id} title={p.name} badge={<Tag color={ENV_COLORS[p.env]} small>{p.env}</Tag>}>
              <textarea rows={4} placeholder={`Leave blank to use global template…\n\nOr override: "You are a ${p.name}-specific ISO8583 expert…"`}
                style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }}
              />
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <Btn primary>💾 Save Override</Btn>
                <Btn secondary>↺ Clear (use global)</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <Card title="Prompt Template Version History">
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["Version","Updated By","Updated At","Change Note",""].map(h=><Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {[
                { v:"v3", by:"priya.s", at:"2025-05-12 10:00", note:"Added {profile} context variable" },
                { v:"v2", by:"john.d",  at:"2025-05-01 09:30", note:"Removed markdown instruction, added example value ask" },
                { v:"v1", by:"admin",   at:"2025-04-15 14:00", note:"Initial prompt template" },
              ].map(r=>(
                <tr key={r.v} style={{ borderBottom:`1px solid ${T.border}22` }}>
                  <td style={{ padding:"8px 8px", color:T.accent }}>{r.v}</td>
                  <td style={{ padding:"8px 8px", color:T.text }}>{r.by}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{r.at}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{r.note}</td>
                  <td style={{ padding:"8px 8px" }}><SmBtn>Restore</SmBtn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════ */
function PageHeader({ title, sub }) {
  return (
    <div style={{ borderBottom:`1px solid ${T.border}`, paddingBottom:14 }}>
      <h1 style={{ margin:0, fontSize:18, fontWeight:700, color:T.text }}>{title}</h1>
      <p style={{ margin:"4px 0 0", fontSize:11.5, color:T.muted }}>{sub}</p>
    </div>
  );
}

function Card({ title, badge, extra, children, style:s }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, overflow:"hidden", ...s }}>
      {(title||badge||extra) && (
        <div style={{ padding:"9px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
          {title && <span style={{ fontSize:12, fontWeight:700, color:T.text, flex:1 }}>{title}</span>}
          {badge && <span style={{ fontSize:10, color:T.muted }}>{badge}</span>}
          {extra}
        </div>
      )}
      <div style={{ padding:14 }}>{children}</div>
    </div>
  );
}

function LoadingBar() {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, alignItems:"center" }}>
      <div style={{ fontSize:12, color:T.muted }}>Parsing → Validating → AI explanation…</div>
      <div style={{ display:"flex", gap:10 }}>
        {["1. Parsing","2. Validating","3. AI Explain"].map((s,i)=>(
          <div key={s} style={{ padding:"4px 14px", borderRadius:20, fontSize:11, background:T.accent+"18", color:T.accent, border:`1px solid ${T.accent}44` }}>{s}</div>
        ))}
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>{children}</div>;
}

function Required() {
  return <span style={{ color:T.red }}>*</span>;
}

function Row({ children }) {
  return <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>{children}</div>;
}

function Tag({ color, small, children, style:s }) {
  return (
    <span style={{ fontSize:small?9:10, padding:small?"2px 6px":"3px 8px", borderRadius:4, background:color+"22", color, border:`1px solid ${color}44`, whiteSpace:"nowrap", ...s }}>
      {children}
    </span>
  );
}

function Dot({ color }) {
  return <span style={{ width:6, height:6, borderRadius:"50%", background:color, display:"inline-block" }} />;
}

function ColorBox({ color }) {
  return <span style={{ display:"inline-block", width:10, height:10, background:color, border:`1px solid ${T.border}`, borderRadius:2, verticalAlign:"middle", marginRight:4 }} />;
}

function Btn({ children, primary, secondary, onClick, disabled, style:s }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: primary ? `linear-gradient(135deg,${T.accent2},${T.accent})` : T.surface2,
      border: primary ? "none" : `1px solid ${T.border}`,
      color: primary ? "#fff" : T.muted,
      padding:"8px 14px", borderRadius:6, fontFamily:"inherit", fontSize:11, fontWeight:600,
      cursor:disabled?"not-allowed":"pointer", whiteSpace:"nowrap", opacity:disabled?0.5:1, ...s,
    }}>{children}</button>
  );
}

function SmBtn({ children, danger, onClick }) {
  return (
    <button onClick={onClick} style={{
      background:"none", border:`1px solid ${danger?T.red+"44":T.border}`,
      color:danger?T.red:T.muted, padding:"3px 9px", borderRadius:4,
      fontFamily:"inherit", fontSize:9.5, cursor:"pointer", whiteSpace:"nowrap",
    }}>{children}</button>
  );
}

function Toggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:5, background:"none",
      border:`1px solid ${active?T.accent+"55":T.border}`, borderRadius:4,
      padding:"3px 8px", cursor:"pointer", fontFamily:"inherit",
      color:active?T.accent:T.faint, fontSize:10,
    }}>
      <div style={{ width:20, height:11, borderRadius:6, background:active?T.accent+"33":T.surface2, border:`1px solid ${active?T.accent:T.faint}`, display:"flex", alignItems:"center", padding:"0 1px" }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:active?T.accent:T.faint, marginLeft:active?8:0, transition:"margin 0.15s" }} />
      </div>
      {label}
    </button>
  );
}

function Th({ children }) {
  return <th style={{ textAlign:"left", padding:"7px 8px", color:T.muted, fontWeight:600, fontSize:10, whiteSpace:"nowrap" }}>{children}</th>;
}

const selectStyle = {
  width:"100%", background:T.surface2, border:`1px solid ${T.border}`,
  color:T.text, padding:"8px 10px", borderRadius:6,
  fontFamily:"inherit", fontSize:11, outline:"none", cursor:"pointer",
};