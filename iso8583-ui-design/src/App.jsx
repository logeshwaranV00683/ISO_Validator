import { useState } from "react";

const T = {
  bg:"#070a0f", surface:"#0d1117", surface2:"#111720",
  border:"#1e2d3d", border2:"#243447", text:"#e6edf3",
  muted:"#8b949e", faint:"#3d4f61", accent:"#00d2ff",
  accent2:"#0057ff", green:"#3fb950", red:"#ff2d55",
  yellow:"#ff9f0a", blue:"#0a84ff", purple:"#bf5af2",
};

const SEV = {
  CRITICAL:{ bg:T.red+"18",    border:T.red+"55",    text:T.red    },
  WARNING: { bg:T.yellow+"18", border:T.yellow+"55", text:T.yellow },
  INFO:    { bg:T.blue+"18",   border:T.blue+"55",   text:T.blue   },
};

const ENV_COLORS = { PROD:"#ff2d55", UAT:"#ff9f0a", DEV:"#3fb950" };

const ROLES = {
  ADMIN:   { label:"Admin",   color:T.red,    can:{ edit:true,  delete:true,  add:true,  validate:true,  build:true  } },
  ANALYST: { label:"Analyst", color:T.yellow, can:{ edit:false, delete:false, add:false, validate:true,  build:true  } },
  VIEWER:  { label:"Viewer",  color:T.blue,   can:{ edit:false, delete:false, add:false, validate:false, build:false } },
};

const USERS = [
  { id:1, username:"admin",   password:"admin123",   role:"ADMIN",   name:"John Doe",   avatar:"JD" },
  { id:2, username:"analyst", password:"analyst123", role:"ANALYST", name:"Priya Singh", avatar:"PS" },
  { id:3, username:"viewer",  password:"viewer123",  role:"VIEWER",  name:"Alex Tan",   avatar:"AT" },
];

const NAV = [
  { id:"validator", icon:"⬡", label:"Message Validator"  },
  { id:"builder",   icon:"⊞", label:"Message Builder"    },
  { id:"rules",     icon:"⚙", label:"Rules Manager"      },
  { id:"formats",   icon:"⬢", label:"Message Formats"    },
  { id:"profiles",  icon:"⇄", label:"Switch Profile"     },
  { id:"history",   icon:"◷", label:"Validation History" },
  { id:"ai",        icon:"◈", label:"AI Settings"        },
];

const PROFILES = [
  { id:1, name:"Visa Switch",   format:"ISO87 ASCII",  formatId:1, env:"PROD", active:true,  isDefault:true,  rulesCount:14, lastUsed:"2025-05-14 14:30", host:"10.0.1.10:8583" },
  { id:2, name:"MasterCard GW", format:"ISO87 ASCII",  formatId:1, env:"UAT",  active:true,  isDefault:false, rulesCount:11, lastUsed:"2025-05-14 12:10", host:"10.0.1.20:8583" },
  { id:3, name:"Legacy Switch", format:"ISO93 EBCDIC", formatId:2, env:"DEV",  active:false, isDefault:false, rulesCount:8,  lastUsed:"2025-05-13 09:00", host:"10.0.2.5:9000"  },
];

const DE_NAMES = {
  DE2:"Primary Account Number", DE3:"Processing Code",      DE4:"Transaction Amount",
  DE7:"Transmission Date & Time", DE11:"System Trace Audit", DE12:"Local Transaction Time",
  DE13:"Local Transaction Date",  DE22:"POS Entry Mode",     DE37:"Retrieval Ref Number",
  DE39:"Response Code",           DE41:"Card Acceptor Term ID", DE42:"Card Acceptor ID",
};

const MOCK_FIELDS = [
  { de:"MTI",  name:"Message Type Indicator",    value:"0200",             present:true  },
  { de:"DE2",  name:"Primary Account Number",    value:"4111111111111111", present:true  },
  { de:"DE3",  name:"Processing Code",           value:"000000",           present:true  },
  { de:"DE4",  name:"Transaction Amount",        value:"00000010000",      present:true  },
  { de:"DE7",  name:"Transmission Date & Time",  value:"—",                present:false },
  { de:"DE11", name:"System Trace Audit",        value:"123456",           present:true  },
  { de:"DE22", name:"POS Entry Mode",            value:"—",                present:false },
  { de:"DE41", name:"Card Acceptor Terminal ID", value:"TERM0001",         present:true  },
];

const MOCK_ERRORS = [
  { field:"DE7",  name:"Transmission Date & Time", severity:"CRITICAL", issue:"Field is mandatory but absent",      rule:"mandatory=true, length=10" },
  { field:"DE4",  name:"Transaction Amount",        severity:"WARNING",  issue:"Length is 11, expected exactly 12", rule:"length=12"                 },
  { field:"DE22", name:"POS Entry Mode",            severity:"INFO",     issue:"Recommended field absent for 0200", rule:"mandatory=false"           },
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
  { id:1, profileId:1, mti:"0200", de:"DE2",  name:"Primary Account Number",   mandatory:true,  minLen:13, maxLen:19, type:"numeric",      pattern:"^[0-9]+$",      severity:"CRITICAL", active:true,  desc:"PAN must be present for all purchase transactions", updatedBy:"john.d",  updatedAt:"2025-05-10" },
  { id:2, profileId:1, mti:"0200", de:"DE3",  name:"Processing Code",           mandatory:true,  minLen:6,  maxLen:6,  type:"numeric",      pattern:"^[0-9]{6}$",    severity:"CRITICAL", active:true,  desc:"6-digit code identifying transaction type",         updatedBy:"john.d",  updatedAt:"2025-05-10" },
  { id:3, profileId:1, mti:"0200", de:"DE4",  name:"Transaction Amount",        mandatory:true,  minLen:12, maxLen:12, type:"numeric",      pattern:"^[0-9]{12}$",   severity:"WARNING",  active:true,  desc:"Amount in smallest currency unit, 12 digits zero-padded", updatedBy:"priya.s", updatedAt:"2025-05-12" },
  { id:4, profileId:1, mti:"0200", de:"DE7",  name:"Transmission Date & Time",  mandatory:true,  minLen:10, maxLen:10, type:"numeric",      pattern:"^[0-9]{10}$",   severity:"CRITICAL", active:true,  desc:"MMDDHHmmss — switch timestamp",                     updatedBy:"priya.s", updatedAt:"2025-05-12" },
  { id:5, profileId:1, mti:"0200", de:"DE11", name:"System Trace Audit Number", mandatory:true,  minLen:6,  maxLen:6,  type:"numeric",      pattern:"^[0-9]{6}$",    severity:"CRITICAL", active:true,  desc:"Unique trace per transaction within a day",         updatedBy:"john.d",  updatedAt:"2025-05-10" },
  { id:6, profileId:1, mti:"0200", de:"DE41", name:"Card Acceptor Terminal ID", mandatory:false, minLen:8,  maxLen:8,  type:"alphanumeric", pattern:"^[A-Z0-9]{8}$", severity:"INFO",     active:true,  desc:"8-char terminal identifier, spaces for unused",     updatedBy:"admin",   updatedAt:"2025-05-08" },
  { id:7, profileId:2, mti:"0200", de:"DE2",  name:"Primary Account Number",    mandatory:true,  minLen:13, maxLen:19, type:"numeric",      pattern:"^[0-9]+$",      severity:"CRITICAL", active:true,  desc:"PAN required",                                      updatedBy:"john.d",  updatedAt:"2025-05-10" },
  { id:8, profileId:2, mti:"0200", de:"DE4",  name:"Transaction Amount",        mandatory:true,  minLen:12, maxLen:12, type:"numeric",      pattern:"^[0-9]{12}$",   severity:"CRITICAL", active:true,  desc:"12-digit amount",                                   updatedBy:"priya.s", updatedAt:"2025-05-12" },
  { id:9, profileId:2, mti:"0200", de:"DE7",  name:"Transmission Date & Time",  mandatory:true,  minLen:10, maxLen:10, type:"numeric",      pattern:"^[0-9]{10}$",   severity:"CRITICAL", active:true,  desc:"MMDDHHmmss timestamp",                              updatedBy:"priya.s", updatedAt:"2025-05-12" },
];

const MOCK_FORMATS = [
  { id:1, name:"ISO87 ASCII",    version:"ISO 8583-1:1987", encoding:"ASCII",  fields:128, status:"active",   checksum:"a1b2c3d4", usedBy:["Visa Switch","MasterCard GW"], updatedBy:"admin", updatedAt:"2025-05-01", xmlVersion:3 },
  { id:2, name:"ISO93 EBCDIC",   version:"ISO 8583-1:1993", encoding:"EBCDIC", fields:128, status:"inactive", checksum:"e5f6a7b8", usedBy:["Legacy Switch"],               updatedBy:"admin", updatedAt:"2025-04-15", xmlVersion:1 },
  { id:3, name:"ISO2003 Binary", version:"ISO 8583-2:2003", encoding:"Binary", fields:192, status:"active",   checksum:"c9d0e1f2", usedBy:[],                              updatedBy:"admin", updatedAt:"2025-03-20", xmlVersion:2 },
];

const MOCK_HISTORY = [
  { id:"VLD-0041", ts:"2025-05-14 14:30:22", mti:"0200", profile:"Visa Switch",   env:"PROD", errors:2, status:"FAILED", parsMs:12, valMs:8,  aiMs:420, totalMs:440, raw:"0200723A00010AC08012345..." },
  { id:"VLD-0040", ts:"2025-05-14 14:28:11", mti:"0210", profile:"Visa Switch",   env:"PROD", errors:0, status:"PASSED", parsMs:11, valMs:6,  aiMs:0,   totalMs:17,  raw:"0210823A00010AC08098765..." },
  { id:"VLD-0039", ts:"2025-05-14 14:15:05", mti:"0420", profile:"MasterCard GW", env:"UAT",  errors:1, status:"WARNED", parsMs:14, valMs:9,  aiMs:390, totalMs:413, raw:"0420923A00010AC08011111..." },
  { id:"VLD-0038", ts:"2025-05-14 13:50:44", mti:"0200", profile:"Visa Switch",   env:"PROD", errors:0, status:"PASSED", parsMs:10, valMs:7,  aiMs:0,   totalMs:17,  raw:"0200123A00010AC08099999..." },
  { id:"VLD-0037", ts:"2025-05-14 13:20:10", mti:"0200", profile:"Legacy Switch", env:"DEV",  errors:4, status:"FAILED", parsMs:18, valMs:12, aiMs:510, totalMs:540, raw:"0200FF3A00010AC08077777..." },
];

const BITMAP_PRESENT = ["DE2","DE3","DE4","DE11","DE41"];

const BUILDER_DE_CATALOG = {
  "0200": [
    { de:"DE2",  name:"Primary Account Number",     maxLen:19, placeholder:"4111111111111111", type:"numeric",      mandatory:true  },
    { de:"DE3",  name:"Processing Code",            maxLen:6,  placeholder:"000000",           type:"numeric",      mandatory:true  },
    { de:"DE4",  name:"Transaction Amount",         maxLen:12, placeholder:"000000010000",     type:"numeric",      mandatory:true  },
    { de:"DE7",  name:"Transmission Date & Time",   maxLen:10, placeholder:"0514143022",       type:"numeric",      mandatory:true  },
    { de:"DE11", name:"System Trace Audit Number",  maxLen:6,  placeholder:"123456",           type:"numeric",      mandatory:true  },
    { de:"DE12", name:"Local Transaction Time",     maxLen:6,  placeholder:"143022",           type:"numeric",      mandatory:false },
    { de:"DE13", name:"Local Transaction Date",     maxLen:4,  placeholder:"0514",             type:"numeric",      mandatory:false },
    { de:"DE22", name:"POS Entry Mode",             maxLen:3,  placeholder:"022",              type:"numeric",      mandatory:false },
    { de:"DE37", name:"Retrieval Reference Number", maxLen:12, placeholder:"123456789012",     type:"alphanumeric", mandatory:false },
    { de:"DE41", name:"Card Acceptor Terminal ID",  maxLen:8,  placeholder:"TERM0001",         type:"alphanumeric", mandatory:false },
    { de:"DE42", name:"Card Acceptor ID Code",      maxLen:15, placeholder:"MERCHANT001    ",  type:"alphanumeric", mandatory:false },
  ],
  "0210": [
    { de:"DE2",  name:"Primary Account Number",    maxLen:19, placeholder:"4111111111111111", type:"numeric", mandatory:true  },
    { de:"DE3",  name:"Processing Code",           maxLen:6,  placeholder:"000000",           type:"numeric", mandatory:true  },
    { de:"DE4",  name:"Transaction Amount",        maxLen:12, placeholder:"000000010000",     type:"numeric", mandatory:true  },
    { de:"DE7",  name:"Transmission Date & Time",  maxLen:10, placeholder:"0514143022",       type:"numeric", mandatory:true  },
    { de:"DE11", name:"System Trace Audit Number", maxLen:6,  placeholder:"123456",           type:"numeric", mandatory:true  },
    { de:"DE39", name:"Response Code",             maxLen:2,  placeholder:"00",               type:"numeric", mandatory:true  },
  ],
  "0420": [
    { de:"DE2",  name:"Primary Account Number",     maxLen:19, placeholder:"4111111111111111", type:"numeric",      mandatory:true },
    { de:"DE3",  name:"Processing Code",            maxLen:6,  placeholder:"000000",           type:"numeric",      mandatory:true },
    { de:"DE4",  name:"Transaction Amount",         maxLen:12, placeholder:"000000010000",     type:"numeric",      mandatory:true },
    { de:"DE7",  name:"Transmission Date & Time",   maxLen:10, placeholder:"0514143022",       type:"numeric",      mandatory:true },
    { de:"DE11", name:"System Trace Audit Number",  maxLen:6,  placeholder:"123456",           type:"numeric",      mandatory:true },
    { de:"DE37", name:"Retrieval Reference Number", maxLen:12, placeholder:"123456789012",     type:"alphanumeric", mandatory:true },
  ],
  "0800": [
    { de:"DE7",  name:"Transmission Date & Time",  maxLen:10, placeholder:"0514143022", type:"numeric", mandatory:true },
    { de:"DE11", name:"System Trace Audit Number", maxLen:6,  placeholder:"123456",     type:"numeric", mandatory:true },
    { de:"DE70", name:"Network Management Code",   maxLen:3,  placeholder:"001",        type:"numeric", mandatory:true },
  ],
  "0810": [
    { de:"DE7",  name:"Transmission Date & Time",  maxLen:10, placeholder:"0514143022", type:"numeric", mandatory:true },
    { de:"DE11", name:"System Trace Audit Number", maxLen:6,  placeholder:"123456",     type:"numeric", mandatory:true },
    { de:"DE39", name:"Response Code",             maxLen:2,  placeholder:"00",         type:"numeric", mandatory:true },
    { de:"DE70", name:"Network Management Code",   maxLen:3,  placeholder:"001",        type:"numeric", mandatory:true },
  ],
};

/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
export default function App() {
  const [user, setUser]         = useState(null);
  const [page, setPage]         = useState("validator");
  const [builtMsg, setBuiltMsg] = useState(null);

  if (!user) return <LoginPage onLogin={setUser} />;
  const role = ROLES[user.role];

  return (
    <div style={{ fontFamily:"'JetBrains Mono','Fira Code',monospace", background:T.bg, color:T.text, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <TopBar user={user} role={role} onLogout={() => setUser(null)} />
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <Sidebar page={page} setPage={p => setPage(p)} role={role} />
        <main style={{ flex:1, overflow:"auto", padding:24, display:"flex", flexDirection:"column", gap:16 }}>
          {page === "validator" && <ValidatorPage role={role} initialMsg={builtMsg} />}
          {page === "builder"   && <MessageBuilderPage role={role} onSendToValidator={msg => { setBuiltMsg(msg); setPage("validator"); }} />}
          {page === "rules"     && <RulesPage role={role} />}
          {page === "formats"   && <FormatsPage role={role} />}
          {page === "profiles"  && <ProfilesPage role={role} />}
          {page === "history"   && <HistoryPage role={role} />}
          {page === "ai"        && <AIPage role={role} />}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════ */
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    setError(""); setLoading(true);
    setTimeout(() => {
      const found = USERS.find(u => u.username === username && u.password === password);
      if (found) { onLogin(found); }
      else { setError("Invalid credentials. Check username and password."); setLoading(false); }
    }, 700);
  };

  const quickLogin = (u) => { setUsername(u.username); setPassword(u.password); };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono','Fira Code',monospace", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.border}33 1px,transparent 1px),linear-gradient(90deg,${T.border}33 1px,transparent 1px)`, backgroundSize:"40px 40px", opacity:0.4 }} />
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translate(-50%,-50%)", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,${T.accent2}15,transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ position:"relative", zIndex:1, width:420 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:`linear-gradient(135deg,${T.accent2},${T.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 12px" }}>⬡</div>
          <div style={{ fontSize:20, fontWeight:700, color:T.text, letterSpacing:"-0.5px" }}>ISO<span style={{ color:T.accent }}>8583</span> Validator</div>
          <div style={{ fontSize:11, color:T.faint, marginTop:4 }}>Enterprise Payment Message Platform · v2.1.0</div>
        </div>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:28 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:20 }}>Sign In</div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <Label>Username</Label>
              <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} placeholder="Enter username"
                style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${error?T.red:T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
            </div>
            <div>
              <Label>Password</Label>
              <div style={{ position:"relative" }}>
                <input type={showPass?"text":"password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} placeholder="Enter password"
                  style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${error?T.red:T.border}`, color:T.text, padding:"10px 36px 10px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
                <button onClick={() => setShowPass(x=>!x)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:T.faint, cursor:"pointer", fontSize:12, padding:0 }}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>
            {error && <div style={{ background:T.red+"15", border:`1px solid ${T.red}44`, borderRadius:5, padding:"8px 12px", fontSize:11, color:T.red }}>✕ {error}</div>}
            <button onClick={handleLogin} disabled={loading||!username||!password}
              style={{ background:`linear-gradient(135deg,${T.accent2},${T.accent})`, border:"none", color:"#fff", padding:"11px 0", borderRadius:7, fontFamily:"inherit", fontSize:12, fontWeight:700, cursor:loading||!username||!password?"not-allowed":"pointer", opacity:loading||!username||!password?0.6:1, letterSpacing:"0.5px" }}>
              {loading?"Authenticating…":"▶ SIGN IN"}
            </button>
          </div>
          <div style={{ marginTop:22, borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
            <div style={{ fontSize:10, color:T.faint, marginBottom:10 }}>Quick login (demo)</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {USERS.map(u => {
                const r = ROLES[u.role];
                return (
                  <button key={u.id} onClick={() => quickLogin(u)} style={{ display:"flex", alignItems:"center", gap:10, background:T.bg, border:`1px solid ${T.border}`, borderRadius:5, padding:"7px 10px", cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                    <div style={{ width:26, height:26, borderRadius:6, background:r.color+"22", border:`1px solid ${r.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:r.color, flexShrink:0 }}>{u.avatar}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:T.text }}>{u.name}</div>
                      <div style={{ fontSize:9.5, color:T.faint }}>{u.username} · {u.password}</div>
                    </div>
                    <Tag color={r.color} small>{u.role}</Tag>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ marginTop:14, background:T.surface+"88", border:`1px solid ${T.border}`, borderRadius:8, padding:"10px 14px" }}>
          <div style={{ fontSize:10, color:T.faint, marginBottom:8 }}>Role Permissions</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, fontSize:9.5 }}>
            {Object.entries(ROLES).map(([key, r]) => (
              <div key={key} style={{ background:T.bg, border:`1px solid ${r.color}33`, borderRadius:5, padding:"6px 8px" }}>
                <div style={{ color:r.color, fontWeight:700, marginBottom:4 }}>{r.label}</div>
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

/* ═══════════════════════════════════════════
   TOPBAR
═══════════════════════════════════════════ */
function TopBar({ user, role, onLogout }) {
  return (
    <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, position:"sticky", top:0, zIndex:100 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:30, height:30, borderRadius:7, background:`linear-gradient(135deg,${T.accent2},${T.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⬡</div>
        <span style={{ fontSize:14, fontWeight:700, color:T.text, letterSpacing:"-0.3px" }}>ISO<span style={{ color:T.accent }}>8583</span> Validator</span>
        <Tag color={T.red}>PROD</Tag>
      </div>
      <div style={{ display:"flex", gap:16, fontSize:11, color:T.muted, alignItems:"center" }}>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}><Dot color={T.green} /> Ollama · Mistral 7B · localhost:11434</span>
        <span style={{ color:T.faint }}>|</span>
        <span>Org Network · 192.168.1.0/24</span>
        <span style={{ color:T.faint }}>|</span>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:T.surface2, border:`1px solid ${T.border}`, borderRadius:6, padding:"4px 10px" }}>
          <div style={{ width:22, height:22, borderRadius:5, background:role.color+"22", border:`1px solid ${role.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8.5, fontWeight:700, color:role.color }}>{user.avatar}</div>
          <div>
            <div style={{ fontSize:10.5, color:T.text, lineHeight:1 }}>{user.name}</div>
            <div style={{ fontSize:9, color:role.color, marginTop:1 }}>{user.role}</div>
          </div>
          <button onClick={onLogout} style={{ background:"none", border:`1px solid ${T.border}`, color:T.faint, padding:"2px 8px", borderRadius:4, fontSize:9, fontFamily:"inherit", cursor:"pointer", marginLeft:4 }}>⎋ Logout</button>
        </div>
        <span style={{ color:T.muted }}>v2.1.0</span>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
function Sidebar({ page, setPage, role }) {
  return (
    <aside style={{ width:215, background:T.surface, borderRight:`1px solid ${T.border}`, padding:"12px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
      {NAV.map(n => {
        const disabled = n.id === "builder" && !role.can.build;
        return (
          <button key={n.id} onClick={() => !disabled && setPage(n.id)} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 20px", border:"none", cursor:disabled?"not-allowed":"pointer",
            background: page===n.id ? T.accent+"12" : "transparent",
            borderLeft: `2px solid ${page===n.id ? T.accent : "transparent"}`,
            color: disabled ? T.faint : page===n.id ? T.accent : T.muted,
            fontSize:11.5, fontFamily:"inherit", transition:"all 0.12s", textAlign:"left", width:"100%", opacity:disabled?0.4:1,
          }}>
            <span style={{ fontSize:13 }}>{n.icon}</span>
            {n.label}
            {disabled && <span style={{ fontSize:8, marginLeft:"auto", color:T.faint }}>NO ACCESS</span>}
          </button>
        );
      })}
      <div style={{ marginTop:"auto", padding:"12px 20px", borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:9.5, color:T.faint, marginBottom:6 }}>Signed in as</div>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:18, height:18, borderRadius:4, background:role.color+"22", border:`1px solid ${role.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:7, color:role.color, fontWeight:700 }}>{role.label[0]}</div>
          <div>
            <div style={{ fontSize:10, color:T.text }}>{role.label}</div>
            <div style={{ fontSize:8.5, color:T.faint }}>{role.can.edit?"Full Access":role.can.validate?"Read + Validate":"Read Only"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════
   1. VALIDATOR PAGE
═══════════════════════════════════════════ */
function ValidatorPage({ role, initialMsg }) {
  const [profileId, setProfileId] = useState(1);
  const [rawMsg, setRawMsg]       = useState(initialMsg || "0200723A00010AC08012345678901234560000000000000100000514143022123456TERM0001");
  const [sevFilter, setSevFilter] = useState("ALL");
  const [validated, setValidated] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [expanded, setExpanded]   = useState({});
  const [bitmapExt, setBitmapExt] = useState(false);
  const [hexView, setHexView]     = useState(false);
  const [copied, setCopied]       = useState(false);

  const profile  = PROFILES.find(p => p.id === profileId);
  const filtered = sevFilter === "ALL" ? MOCK_ERRORS : MOCK_ERRORS.filter(e => e.severity === sevFilter);

  const validate = () => { setLoading(true); setTimeout(() => { setLoading(false); setValidated(true); }, 1500); };
  const clear    = () => { setRawMsg(""); setValidated(false); };
  const copy     = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const TIMING   = { parse:12, validate:8, ai:420, total:440 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Message Validator" sub="Parse · Validate · AI-explain ISO8583 messages in one click" />
      {!role.can.validate && <RoleBanner roleNeeded="ANALYST or ADMIN" action="validate messages" />}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 220px", gap:16 }}>
          <div>
            <Row><Label>Raw ISO8583 Message</Label>{hexView && <span style={{ fontSize:10, color:T.muted }}>hex view active</span>}</Row>
            <textarea value={rawMsg} onChange={e => setRawMsg(e.target.value)} rows={3}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:hexView?T.accent:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }}
              placeholder="Paste raw ISO message here…" />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <Label>Switch Connection <Required /></Label>
              <select value={profileId} onChange={e => setProfileId(+e.target.value)} style={selectStyle}>
                {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}{p.isDefault?" (default)":""}</option>)}
              </select>
              {profile && (
                <div style={{ fontSize:10, color:T.muted, marginTop:4, display:"flex", gap:8 }}>
                  <span>{profile.format}</span><span style={{ color:T.faint }}>·</span>
                  <Tag color={ENV_COLORS[profile.env]} small>{profile.env}</Tag>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn onClick={validate} disabled={loading||!role.can.validate} primary style={{ flex:1 }}>{loading?"Processing…":"▶ VALIDATE"}</Btn>
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
        <div style={{ display:"flex", gap:10, alignItems:"center", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 14px", fontSize:11 }}>
          <span style={{ color:T.muted, marginRight:4 }}>Processing:</span>
          {[["Parse",TIMING.parse,T.accent],["Validate",TIMING.validate,T.green],["AI",TIMING.ai,T.purple]].map(([l,v,c]) => (
            <span key={l} style={{ color:T.muted }}>{l}: <span style={{ color:c, fontWeight:700 }}>{v}ms</span></span>
          ))}
          <span style={{ color:T.faint }}>·</span>
          <span style={{ color:T.muted }}>Total: <span style={{ color:T.text, fontWeight:700 }}>{TIMING.total}ms</span></span>
          <div style={{ flex:1 }} />
          <span style={{ color:T.muted }}>ID: <span style={{ color:T.accent }}>VLD-0041</span></span>
          <span style={{ color:T.faint }}>·</span>
          <span style={{ color:T.muted }}>2025-05-14 14:30:22</span>
          <Btn onClick={copy} secondary style={{ padding:"3px 10px", fontSize:10 }}>{copied?"✓ Copied":"⎘ Copy JSON"}</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Card title="Parsed Fields" badge={`${MOCK_FIELDS.filter(f=>f.present).length} / ${MOCK_FIELDS.length} present`}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{["DE","Field Name","Value","Status"].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {MOCK_FIELDS.map(f => (
                    <tr key={f.de} style={{ borderBottom:`1px solid ${T.border}22` }}>
                      <td style={{ padding:"6px 8px", color:T.accent, fontWeight:700, fontSize:11 }}>{f.de}</td>
                      <td style={{ padding:"6px 8px", color:T.muted, fontSize:10 }}>{f.name}</td>
                      <td style={{ padding:"6px 8px", color:f.present?T.text:T.faint }}>{f.value}</td>
                      <td style={{ padding:"6px 8px" }}><span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:f.present?T.green+"22":T.red+"22", color:f.present?T.green:T.red }}>{f.present?"PRESENT":"ABSENT"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title={bitmapExt?"Bitmap — Extended (128-bit)":"Bitmap — Primary (64-bit)"} badge={`${BITMAP_PRESENT.length} bits ON`} extra={<Toggle label="Extended" active={bitmapExt} onClick={()=>setBitmapExt(x=>!x)} />}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:3 }}>
                {Array.from({ length:bitmapExt?128:64 }, (_,i) => {
                  const de = `DE${i+1}`; const on = BITMAP_PRESENT.includes(de);
                  return <div key={de} title={`${de}${DE_NAMES[de]?" — "+DE_NAMES[de]:""}`} style={{ padding:"4px 0", textAlign:"center", borderRadius:3, background:on?T.accent+"22":T.surface2, border:`1px solid ${on?T.accent+"55":T.border}`, color:on?T.accent:T.faint, fontSize:8.5, cursor:"default" }}>{i+1}</div>;
                })}
              </div>
              <div style={{ marginTop:8, display:"flex", gap:14, fontSize:10, color:T.muted }}>
                <span><ColorBox color={T.accent+"33"} /> Present ({BITMAP_PRESENT.length})</span>
                <span><ColorBox color={T.surface2} /> Absent ({(bitmapExt?128:64)-BITMAP_PRESENT.length})</span>
              </div>
            </Card>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Card title="Validation Errors" badge={<span style={{ color:MOCK_ERRORS.length>0?T.red:T.green }}>{MOCK_ERRORS.length} issue{MOCK_ERRORS.length!==1?"s":""}</span>}
              extra={<div style={{ display:"flex", gap:4 }}>{["ALL","CRITICAL","WARNING","INFO"].map(s => (
                <button key={s} onClick={()=>setSevFilter(s)} style={{ background:sevFilter===s?(s==="ALL"?T.accent:SEV[s]?.text||T.accent)+"22":"transparent", border:`1px solid ${sevFilter===s?(s==="ALL"?T.accent:SEV[s]?.text||T.accent)+"66":T.border}`, color:sevFilter===s?(s==="ALL"?T.accent:SEV[s]?.text||T.accent):T.faint, padding:"2px 7px", borderRadius:4, fontSize:9, fontFamily:"inherit", cursor:"pointer" }}>{s}</button>
              ))}</div>}
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
                {filtered.length===0 && <div style={{ textAlign:"center", color:T.muted, fontSize:12, padding:"12px 0" }}>No issues</div>}
              </div>
            </Card>
            <Card title="AI Explanation" badge={<span style={{ color:T.accent, fontSize:10 }}>Mistral 7B · 420ms · Local</span>}>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {MOCK_AI.map((a,i) => (
                  <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
                    <button onClick={() => setExpanded(x=>({...x,[i]:!x[i]}))} style={{ width:"100%", background:"none", border:"none", padding:"10px 12px", cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:T.accent }}>{a.title}</span>
                      <span style={{ color:T.faint, fontSize:12 }}>{expanded[i]?"▲":"▼"}</span>
                    </button>
                    {expanded[i] !== false && (
                      <div style={{ padding:"0 12px 12px", fontSize:11, lineHeight:1.8 }}>
                        <p style={{ color:T.muted, margin:"0 0 8px" }}>{a.body}</p>
                        <div style={{ background:T.green+"12", border:`1px solid ${T.green}33`, borderRadius:4, padding:"6px 10px", color:T.green, fontSize:11 }}>→ <strong>Fix:</strong> {a.fix}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              {[["1 CRITICAL",T.red],["1 WARNING",T.yellow],["1 INFO",T.blue]].map(([l,c])=><Tag key={l} color={c}>{l}</Tag>)}
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
          <span>Paste a message, select a connection, and click VALIDATE</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ISO8583 BUILD HELPER
═══════════════════════════════════════════ */
function buildISO8583(mti, fieldValues, catalog) {
  const LLVAR = new Set([2,14,28,29,30,31,32,33,34,35,36,45,46,47,48]);

  const present = catalog
    .filter(f => fieldValues[f.de]?.trim())
    .map(f => ({ ...f, num:parseInt(f.de.replace("DE",""),10), val:fieldValues[f.de].trim() }))
    .sort((a,b) => a.num - b.num);

  const bits = new Array(64).fill(0);
  present.forEach(f => { if (f.num >= 1 && f.num <= 64) bits[f.num-1] = 1; });
  let bitmapHex = "";
  for (let i = 0; i < 64; i += 4)
    bitmapHex += parseInt(bits.slice(i,i+4).join(""),2).toString(16).toUpperCase();

  let fieldData = "";
  present.forEach(({ num, val, maxLen, type }) => {
    if (LLVAR.has(num)) {
      fieldData += String(val.length).padStart(2,"0") + val;
    } else if (type === "numeric") {
      fieldData += val.padStart(maxLen,"0").slice(0,maxLen);
    } else {
      fieldData += val.padEnd(maxLen," ").slice(0,maxLen);
    }
  });

  return { raw:mti+bitmapHex+fieldData, bitmapHex, parts:present };
}

/* ═══════════════════════════════════════════
   2. MESSAGE BUILDER PAGE
═══════════════════════════════════════════ */
function MessageBuilderPage({ role, onSendToValidator }) {
  const [profileId, setProfileId]       = useState(1);
  const [mti, setMti]                   = useState("0200");
  const [fieldValues, setFieldValues]   = useState({});
  const [built, setBuilt]               = useState(null);
  const [copied, setCopied]             = useState(false);
  const [showOptional, setShowOptional] = useState(true);
  const [buildError, setBuildError]     = useState(null);

  const profile   = PROFILES.find(p => p.id === profileId);
  const catalog   = BUILDER_DE_CATALOG[mti] || [];
  const mandatory = catalog.filter(f => f.mandatory);
  const optional  = catalog.filter(f => !f.mandatory);

  const updateField = (de, val) => setFieldValues(x => ({ ...x, [de]:val }));
  const resetAll    = () => { setFieldValues({}); setBuilt(null); setBuildError(null); };

  const validateAndBuild = () => {
    setBuildError(null);
    const missing = mandatory.filter(f => !(fieldValues[f.de]?.trim()));
    if (missing.length > 0) { setBuildError(`Missing mandatory fields: ${missing.map(f=>f.de).join(", ")}`); return; }
    setBuilt(buildISO8583(mti, fieldValues, catalog));
  };

  const progress = mandatory.length > 0
    ? Math.round((mandatory.filter(f => fieldValues[f.de]?.trim()).length / mandatory.length) * 100)
    : 0;

  const deIndex = built
    ? built.parts.length
    : Object.keys(fieldValues).filter(k => fieldValues[k]?.trim()).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Message Builder" sub="Construct well-formed ISO8583 raw messages from scratch using connection rules — optional tool" />

      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, alignItems:"end" }}>
          <div>
            <Label>Switch Connection <Required /></Label>
            <select value={profileId} onChange={e => { setProfileId(+e.target.value); resetAll(); }} style={selectStyle}>
              {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name} ({p.env})</option>)}
            </select>
            {profile && <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>Format: <span style={{ color:T.accent }}>{profile.format}</span> · <Tag color={ENV_COLORS[profile.env]} small>{profile.env}</Tag></div>}
          </div>
          <div>
            <Label>Message Type Indicator (MTI)</Label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[["0200","Auth Req"],["0210","Auth Resp"],["0420","Reversal"],["0800","Net Mgmt"],["0810","Net Resp"]].map(([m,sub]) => (
                <button key={m} onClick={() => { setMti(m); resetAll(); }} style={{ background:mti===m?T.accent+"22":T.surface2, border:`1px solid ${mti===m?T.accent:T.border}`, color:mti===m?T.accent:T.muted, padding:"7px 16px", borderRadius:6, fontSize:11, fontFamily:"inherit", cursor:"pointer" }}>
                  {m}<span style={{ fontSize:9, color:mti===m?T.accent:T.faint, display:"block", marginTop:1 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
          <span style={{ fontSize:11, color:T.muted }}>
            Mandatory: <span style={{ color:progress===100?T.green:T.yellow, fontWeight:700 }}>{mandatory.filter(f=>fieldValues[f.de]?.trim()).length} / {mandatory.length}</span>
            <span style={{ color:T.faint }}> · Optional: {optional.filter(f=>fieldValues[f.de]?.trim()).length} / {optional.length}</span>
          </span>
          <span style={{ fontSize:10, color:progress===100?T.green:T.muted }}>{progress}% ready</span>
        </div>
        <div style={{ height:4, background:T.surface2, borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${progress}%`, background:progress===100?T.green:T.accent, borderRadius:2, transition:"width 0.3s" }} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card title="Mandatory Fields" badge={<Tag color={T.red} small>REQUIRED</Tag>}>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {mandatory.map(f => <FieldInput key={f.de} field={f} value={fieldValues[f.de]||""} onChange={val => updateField(f.de, val)} />)}
            </div>
          </Card>
          <Card title="Optional Fields" badge={<Tag color={T.blue} small>OPTIONAL</Tag>} extra={<Toggle label={showOptional?"Hide":"Show"} active={showOptional} onClick={() => setShowOptional(x=>!x)} />}>
            {showOptional
              ? <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {optional.length===0
                    ? <div style={{ textAlign:"center", color:T.faint, fontSize:12, padding:"12px 0" }}>No optional fields for {mti}</div>
                    : optional.map(f => <FieldInput key={f.de} field={f} value={fieldValues[f.de]||""} onChange={val => updateField(f.de,val)} />)}
                </div>
              : <div style={{ textAlign:"center", color:T.faint, fontSize:11, padding:"8px 0" }}>{optional.length} optional fields hidden</div>}
          </Card>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <Card title="Live Field Summary">
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:300, overflowY:"auto" }}>
              {catalog.map(f => {
                const val = fieldValues[f.de]?.trim();
                return (
                  <div key={f.de} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:`1px solid ${T.border}22` }}>
                    <span style={{ color:T.accent, fontSize:10, fontWeight:700, width:40, flexShrink:0 }}>{f.de}</span>
                    <span style={{ color:T.muted, fontSize:9.5, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                    {f.mandatory && <span style={{ fontSize:8, color:T.red }}>*</span>}
                    <span style={{ fontSize:10, color:val?T.text:T.faint, maxWidth:80, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val||"—"}</span>
                    <span style={{ width:6, height:6, borderRadius:"50%", background:val?T.green:f.mandatory?T.red:T.faint, flexShrink:0 }} />
                  </div>
                );
              })}
            </div>
          </Card>

          {mti === "0200" && (
            <Card title="Load Template" badge="quick-fill">
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {[
                  { label:"Purchase · Visa", values:{ DE2:"4111111111111111", DE3:"000000", DE4:"000000010000", DE7:"0514143022", DE11:"123456", DE41:"TERM0001" } },
                  { label:"Cash Advance",    values:{ DE2:"4222222222222222", DE3:"010000", DE4:"000000050000", DE7:"0514150000", DE11:"654321", DE41:"ATM00001" } },
                  { label:"Balance Enquiry", values:{ DE2:"4333333333333333", DE3:"310000", DE4:"000000000000", DE7:"0514160000", DE11:"111111", DE41:"POS00001" } },
                ].map(t => (
                  <button key={t.label} onClick={() => setFieldValues(v=>({...v,...t.values}))} style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.muted, padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:10, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <span>{t.label}</span><span style={{ color:T.faint, fontSize:9 }}>⊞ Apply</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {buildError && <div style={{ background:T.red+"12", border:`1px solid ${T.red}44`, borderRadius:5, padding:"8px 12px", fontSize:11, color:T.red }}>✕ {buildError}</div>}
            <Btn primary onClick={validateAndBuild} style={{ width:"100%", textAlign:"center" }}>⊞ Build Raw Message</Btn>
            <Btn secondary onClick={resetAll} style={{ width:"100%", textAlign:"center" }}>↺ Reset All Fields</Btn>
          </div>
        </div>
      </div>

      {built && (
        <Card title="Generated Raw Message" badge={<Tag color={T.green} small>READY</Tag>}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ background:T.bg, border:`1px solid ${T.green}44`, borderRadius:6, padding:"12px 14px", fontFamily:"inherit", fontSize:11, wordBreak:"break-all", lineHeight:2.2 }}>
              <span title="MTI" style={{ color:T.yellow, background:T.yellow+"18", padding:"2px 3px", borderRadius:3 }}>{built.raw.substring(0,4)}</span>
              <span title="Bitmap (16 hex chars)" style={{ color:T.accent, background:T.accent+"18", padding:"2px 3px", borderRadius:3 }}>{built.bitmapHex}</span>
              <span style={{ color:T.text }}>{built.raw.substring(20)}</span>
            </div>
            <div style={{ display:"flex", gap:14, fontSize:10, flexWrap:"wrap" }}>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}><Tag color={T.yellow} small>MTI</Tag>{mti}</span>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}><Tag color={T.accent} small>BITMAP</Tag>{built.bitmapHex} · {built.parts.length} DEs set</span>
              <span style={{ color:T.muted }}>Total length: <span style={{ color:T.text }}>{built.raw.length} chars</span></span>
              <span style={{ color:T.muted }}>Profile: <span style={{ color:T.text }}>{profile?.name}</span></span>
            </div>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:T.muted, marginBottom:8, fontWeight:700 }}>Field Breakdown</div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 140px 60px", gap:8, fontSize:9, color:T.faint, paddingBottom:5, borderBottom:`1px solid ${T.border}` }}>
                  <span>DE</span><span>Name</span><span>Value</span><span>Encoding</span>
                </div>
                {built.parts.map(p => {
                  const isLL = [2,14,28,29,30,31,32,33,34,35,36,45,46,47,48].includes(p.num);
                  return (
                    <div key={p.de} style={{ display:"grid", gridTemplateColumns:"40px 1fr 140px 60px", gap:8, fontSize:10, padding:"3px 0", borderBottom:`1px solid ${T.border}11` }}>
                      <span style={{ color:T.accent, fontWeight:700 }}>{p.de}</span>
                      <span style={{ color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                      <span style={{ color:T.text }}>{isLL ? `${String(p.val.length).padStart(2,"0")}${p.val}` : p.val}</span>
                      <span style={{ color:T.faint, fontSize:9 }}>{isLL?"LLVAR":"FIXED"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Btn primary onClick={() => onSendToValidator(built.raw)}>▶ Send to Validator</Btn>
              <Btn secondary onClick={() => { navigator.clipboard?.writeText(built.raw); setCopied(true); setTimeout(()=>setCopied(false),1500); }}>{copied?"✓ Copied":"⎘ Copy Raw"}</Btn>
              <Btn secondary>⬇ Export JSON</Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const hasVal      = value?.trim().length > 0;
  const lenOk       = !hasVal || (value.length <= field.maxLen);
  const borderColor = hasVal && lenOk ? T.green : hasVal && !lenOk ? T.red : T.border;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"70px 1fr", gap:10, alignItems:"start" }}>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:T.accent }}>{field.de}</div>
        <div style={{ fontSize:8.5, color:T.faint, lineHeight:1.4 }}>{field.type}<br/>max {field.maxLen}</div>
      </div>
      <div>
        <div style={{ fontSize:9.5, color:T.muted, marginBottom:3 }}>{field.name}{field.mandatory&&<span style={{ color:T.red }}> *</span>}</div>
        <div style={{ position:"relative" }}>
          <input value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} maxLength={field.maxLen}
            style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${borderColor}`, color:T.text, padding:"7px 40px 7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:11, outline:"none", transition:"border-color 0.15s" }} />
          <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", fontSize:8.5, color:hasVal&&!lenOk?T.red:T.faint }}>{value.length}/{field.maxLen}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. RULES MANAGER
═══════════════════════════════════════════ */
function RulesPage({ role }) {
  const [profileId, setProfileId] = useState(1);
  const [mti, setMti]             = useState("0200");
  const [showAdd, setShowAdd]     = useState(false);

  const profile = PROFILES.find(p => p.id === profileId);
  const rules   = MOCK_RULES.filter(r => r.profileId === profileId && r.mti === mti);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Rules Manager" sub="Dynamic per-connection, per-MTI validation rules — stored in DB, no redeploy needed" />
      {!role.can.edit && <RoleBanner roleNeeded="ADMIN" action="add or edit rules" />}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, alignItems:"end" }}>
          <div>
            <Label>Switch Connection <Required /></Label>
            <select value={profileId} onChange={e=>setProfileId(+e.target.value)} style={selectStyle}>
              {PROFILES.map(p=><option key={p.id} value={p.id}>{p.name} ({p.env})</option>)}
            </select>
            {profile && <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>Format: <span style={{ color:T.accent }}>{profile.format}</span> · {profile.rulesCount} rules configured</div>}
          </div>
          <div>
            <Label>MTI</Label>
            <div style={{ display:"flex", gap:8 }}>
              {["0200","0210","0420","0800","0810"].map(m=>(
                <button key={m} onClick={()=>setMti(m)} style={{ background:mti===m?T.accent+"22":T.surface2, border:`1px solid ${mti===m?T.accent:T.border}`, color:mti===m?T.accent:T.muted, padding:"7px 16px", borderRadius:6, fontSize:11, fontFamily:"inherit", cursor:"pointer" }}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.muted }}>{rules.length} rules for <span style={{ color:T.text }}>{profile?.name}</span> · MTI <span style={{ color:T.accent }}>{mti}</span></span>
        <div style={{ flex:1 }} />
        {role.can.add && <Btn primary onClick={()=>setShowAdd(true)}>+ Add Rule</Btn>}
        {role.can.edit && <Btn secondary>⬆ Import JSON</Btn>}
        <Btn secondary>⬇ Export JSON</Btn>
        {role.can.edit && <Btn secondary>↺ Reload Cache</Btn>}
      </div>
      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["DE","Field Name","Mandatory","Min","Max","Type","Severity","Pattern","Active","Description","Audit",...(role.can.edit?["Actions"]:[])].map(h=><Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rules.map(r=>(
                <tr key={r.id} style={{ borderBottom:`1px solid ${T.border}22`, opacity:r.active?1:0.45 }}>
                  <td style={{ padding:"8px 8px", color:T.accent, fontWeight:700 }}>{r.de}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, maxWidth:130 }}>{r.name}</td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}><span style={{ color:r.mandatory?T.green:T.faint, fontSize:12 }}>{r.mandatory?"✓":"✗"}</span></td>
                  <td style={{ padding:"8px 8px", color:T.text, textAlign:"center" }}>{r.minLen}</td>
                  <td style={{ padding:"8px 8px", color:T.text, textAlign:"center" }}>{r.maxLen}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={T.blue} small>{r.type}</Tag></td>
                  <td style={{ padding:"8px 8px" }}><Tag color={SEV[r.severity].text} small>{r.severity}</Tag></td>
                  <td style={{ padding:"8px 8px", color:T.faint, fontSize:10 }}>{r.pattern}</td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}>
                    <div style={{ width:28, height:15, borderRadius:8, background:r.active?T.green+"44":T.faint+"44", border:`1px solid ${r.active?T.green:T.faint}`, display:"inline-flex", alignItems:"center", padding:"0 2px", cursor:role.can.edit?"pointer":"default" }}>
                      <div style={{ width:11, height:11, borderRadius:"50%", background:r.active?T.green:T.faint, marginLeft:r.active?12:0, transition:"margin 0.15s" }} />
                    </div>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, maxWidth:160 }}>{r.desc}</td>
                  <td style={{ padding:"8px 8px", fontSize:9, color:T.faint, whiteSpace:"nowrap" }}><div>{r.updatedBy}</div><div>{r.updatedAt}</div></td>
                  {role.can.edit && <td style={{ padding:"8px 8px" }}><div style={{ display:"flex", gap:4 }}><SmBtn>Edit</SmBtn><SmBtn>History</SmBtn><SmBtn danger>Del</SmBtn></div></td>}
                </tr>
              ))}
              {rules.length===0 && <tr><td colSpan={12} style={{ padding:"24px", textAlign:"center", color:T.faint, fontSize:12 }}>No rules configured for {mti} on this connection</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Total Rules",      value:rules.length,                        color:T.accent },
          { label:"Active Rules",     value:rules.filter(r=>r.active).length,    color:T.green  },
          { label:"Mandatory Fields", value:rules.filter(r=>r.mandatory).length, color:T.yellow },
          { label:"Last Updated",     value:"2025-05-12",                        color:T.muted  },
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
          {[{ label:"DE Number", placeholder:"DE7" },{ label:"Field Name", placeholder:"Transmission Date & Time" },{ label:"Min Length", placeholder:"10" },{ label:"Max Length", placeholder:"10" },{ label:"Pattern / Regex", placeholder:"^[0-9]{10}$" },{ label:"Effective From", placeholder:"2025-05-14", type:"date" }].map(f=>(
            <div key={f.label}><Label>{f.label}</Label><input type={f.type||"text"} placeholder={f.placeholder} style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:11, outline:"none" }} /></div>
          ))}
          <div><Label>Data Type</Label><select style={selectStyle}>{["numeric","alpha","alphanumeric","binary","special"].map(t=><option key={t}>{t}</option>)}</select></div>
          <div><Label>Severity</Label><select style={selectStyle}>{["CRITICAL","WARNING","INFO"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{ gridColumn:"1/-1" }}><Label>Description</Label><textarea rows={2} style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"7px 10px", borderRadius:5, fontFamily:"inherit", fontSize:11, outline:"none", resize:"vertical" }} /></div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}><Label>Mandatory</Label><Toggle label="Yes" active={true} /></div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}><Label>Active</Label><Toggle label="Yes" active={true} /></div>
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
   4. MESSAGE FORMATS
═══════════════════════════════════════════ */
function FormatsPage({ role }) {
  const [selected, setSelected] = useState(null);
  const [xmlVal, setXmlVal]     = useState(false);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Message Formats" sub="ISO format definitions stored in DB — replaces static iso87ascii.xml files. Hot-reloadable without restart." />
      {!role.can.edit && <RoleBanner roleNeeded="ADMIN" action="edit message formats" />}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        {role.can.add && <Btn primary>+ New Format</Btn>}
        {role.can.edit && <Btn secondary>⬆ Upload XML</Btn>}
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
                <span>{f.version}</span><span>{f.encoding} encoding</span><span>{f.fields} DEs</span>
                <span>Version: <span style={{ color:T.text }}>v{f.xmlVersion}</span></span>
                <span>Checksum: <span style={{ color:T.accent }}>{f.checksum}</span></span>
                <span>Updated by <span style={{ color:T.text }}>{f.updatedBy}</span> on {f.updatedAt}</span>
              </div>
              <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:10, color:T.muted }}>Used by: </span>
                {f.usedBy.length ? f.usedBy.map(p=><Tag key={p} color={T.accent} small>{p}</Tag>) : <span style={{ fontSize:10, color:T.faint }}>Not used</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {role.can.edit && <SmBtn onClick={()=>setSelected(selected===f.id?null:f.id)}>{selected===f.id?"▲ Close":"▼ Edit XML"}</SmBtn>}
              <SmBtn onClick={()=>setXmlVal(true)}>Validate XML</SmBtn>
              {role.can.edit && <SmBtn>🔄 Hot Reload</SmBtn>}
              {role.can.edit && <SmBtn>Clone</SmBtn>}
              <SmBtn>Version History</SmBtn>
              {role.can.delete && f.usedBy.length===0 && <SmBtn danger>Delete</SmBtn>}
            </div>
          </div>
          {selected===f.id && role.can.edit && (
            <div style={{ marginTop:14, borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
              {xmlVal && <div style={{ marginBottom:10, background:T.green+"12", border:`1px solid ${T.green}33`, borderRadius:5, padding:"8px 12px", fontSize:11, color:T.green }}>✓ XML structure validated — valid jPOS GenericPackager config</div>}
              <Label>XML Config Editor — {f.name}</Label>
              <textarea rows={8} defaultValue={`<isopackager>\n  <isofield id="2"  length="19" name="Primary Account Number"    class="IFB_LLNUM"   />\n  <isofield id="3"  length="6"  name="Processing Code"           class="IFB_NUMERIC" />\n  <isofield id="4"  length="12" name="Transaction Amount"         class="IFB_NUMERIC" />\n  <isofield id="7"  length="10" name="Transmission Date and Time" class="IFB_NUMERIC" />\n  <isofield id="11" length="6"  name="System Trace Audit Number"  class="IFB_NUMERIC" />\n  <isofield id="41" length="8"  name="Card Acceptor Terminal ID"  class="IFB_CHAR"    />\n</isopackager>`}
                style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }} />
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
   5. SWITCH PROFILE
═══════════════════════════════════════════ */
function ProfilesPage({ role }) {
  const [testing, setTesting]       = useState(null);
  const [testResult, setTestResult] = useState({});

  const testConn = (id) => {
    setTesting(id);
    setTimeout(()=>{ setTesting(null); setTestResult(x=>({...x,[id]:id===3?"FAILED":"OK"})); }, 1200);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Switch Profile" sub="Each connection binds a message format + validation rules + switch host. One dropdown to rule them all." />
      {!role.can.edit && <RoleBanner roleNeeded="ADMIN" action="edit Switch Profile" />}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        {role.can.add && <Btn primary>+ New Connection</Btn>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {PROFILES.map(p=>{
          const conn = testResult[p.id];
          return (
            <div key={p.id} style={{ background:T.surface, borderRadius:8, border:`1px solid ${p.isDefault?T.accent:T.border}`, borderTop:`2px solid ${p.active?ENV_COLORS[p.env]:T.faint}`, padding:16, opacity:p.active?1:0.6 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{p.name}</span>
                    {p.isDefault && <Tag color={T.accent} small>DEFAULT</Tag>}
                  </div>
                  <div style={{ display:"flex", gap:6 }}><Tag color={ENV_COLORS[p.env]} small>{p.env}</Tag><Tag color={p.active?T.green:T.faint} small>{p.active?"ACTIVE":"INACTIVE"}</Tag></div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:T.muted }}>
                  Active
                  <div style={{ width:32, height:17, borderRadius:9, background:p.active?T.green+"44":T.faint+"44", border:`1px solid ${p.active?T.green:T.faint}`, display:"flex", alignItems:"center", padding:"0 2px", cursor:role.can.edit?"pointer":"default" }}>
                    <div style={{ width:13, height:13, borderRadius:"50%", background:p.active?T.green:T.faint, marginLeft:p.active?14:0, transition:"margin 0.15s" }} />
                  </div>
                </div>
              </div>
              <div style={{ fontSize:11, color:T.muted, display:"flex", flexDirection:"column", gap:5, marginBottom:12 }}>
                <Row><span>Message Format:</span><span style={{ color:T.accent }}>{p.format}</span></Row>
                <Row><span>Host:</span><span style={{ color:T.text }}>{p.host}</span></Row>
                <Row><span>Rules Configured:</span><span style={{ color:T.yellow, fontWeight:700 }}>{p.rulesCount} rules</span></Row>
                <Row><span>Last Used:</span><span style={{ color:T.text }}>{p.lastUsed}</span></Row>
              </div>
              {conn && <div style={{ marginBottom:10, padding:"6px 10px", borderRadius:4, fontSize:11, background:conn==="OK"?T.green+"12":T.red+"12", color:conn==="OK"?T.green:T.red, border:`1px solid ${conn==="OK"?T.green+"33":T.red+"33"}` }}>{conn==="OK"?"✓ Connection OK — switch reachable":"✗ Connection FAILED — host unreachable"}</div>}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                <SmBtn onClick={()=>testConn(p.id)}>{testing===p.id?"Testing…":"Test Connection"}</SmBtn>
                {role.can.edit && <SmBtn>Edit</SmBtn>}
                {role.can.add && <SmBtn>Clone</SmBtn>}
                {role.can.edit && !p.isDefault && <SmBtn>Set Default</SmBtn>}
                {role.can.delete && !p.isDefault && <SmBtn danger>Delete</SmBtn>}
              </div>
            </div>
          );
        })}
      </div>
      <Card title="Connection → Format Mapping" badge="overview">
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{["Connection","Environment","Message Format","Encoding","DEs","Rules","Default","Status"].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {PROFILES.map(p=>{ const fmt=MOCK_FORMATS.find(f=>f.id===p.formatId); return (
              <tr key={p.id} style={{ borderBottom:`1px solid ${T.border}22` }}>
                <td style={{ padding:"8px 8px", color:T.text, fontWeight:700 }}>{p.name}</td>
                <td style={{ padding:"8px 8px" }}><Tag color={ENV_COLORS[p.env]} small>{p.env}</Tag></td>
                <td style={{ padding:"8px 8px", color:T.accent }}>{fmt?.name}</td>
                <td style={{ padding:"8px 8px", color:T.muted }}>{fmt?.encoding}</td>
                <td style={{ padding:"8px 8px", color:T.muted }}>{fmt?.fields}</td>
                <td style={{ padding:"8px 8px", color:T.yellow }}>{p.rulesCount}</td>
                <td style={{ padding:"8px 8px" }}>{p.isDefault&&<Tag color={T.accent} small>YES</Tag>}</td>
                <td style={{ padding:"8px 8px" }}><Tag color={p.active?T.green:T.faint} small>{p.active?"ACTIVE":"INACTIVE"}</Tag></td>
              </tr>
            );})}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   6. VALIDATION HISTORY
═══════════════════════════════════════════ */
function HistoryPage({ role }) {
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("ALL");
  const [mtiF, setMtiF]         = useState("ALL");
  const [profF, setProfF]       = useState("ALL");
  const [pg, setPg]             = useState(1);

  const filtered = MOCK_HISTORY.filter(h =>
    (statusF==="ALL"||h.status===statusF) && (mtiF==="ALL"||h.mti===mtiF) &&
    (profF==="ALL"||h.profile===profF) && (search===""||h.id.includes(search)||h.mti.includes(search))
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Validation History" sub="Full audit log of every parsed and validated ISO8583 message" />
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 140px 120px 120px", gap:10, alignItems:"end" }}>
          <div><Label>Search</Label><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by ID, MTI…" style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"8px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} /></div>
          <div><Label>Status</Label><select value={statusF} onChange={e=>setStatusF(e.target.value)} style={selectStyle}>{["ALL","PASSED","FAILED","WARNED"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div><Label>MTI</Label><select value={mtiF} onChange={e=>setMtiF(e.target.value)} style={selectStyle}>{["ALL","0200","0210","0420"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div><Label>Connection</Label><select value={profF} onChange={e=>setProfF(e.target.value)} style={selectStyle}>{["ALL",...PROFILES.map(p=>p.name)].map(s=><option key={s}>{s}</option>)}</select></div>
          <div><Label>From</Label><input type="date" style={{ ...selectStyle, width:"100%", boxSizing:"border-box" }} /></div>
          <div><Label>To</Label><input type="date" style={{ ...selectStyle, width:"100%", boxSizing:"border-box" }} /></div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:10, justifyContent:"flex-end" }}>
          <Btn secondary>⬇ Export CSV</Btn>
          <Btn secondary>↺ Reset</Btn>
        </div>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {[
          { label:"Total Runs",  value:MOCK_HISTORY.length,                                                                                                    color:T.accent },
          { label:"Passed",      value:MOCK_HISTORY.filter(h=>h.status==="PASSED").length,                                                                     color:T.green  },
          { label:"Failed",      value:MOCK_HISTORY.filter(h=>h.status==="FAILED").length,                                                                     color:T.red    },
          { label:"Avg AI Time", value:`${Math.round(MOCK_HISTORY.filter(h=>h.aiMs>0).reduce((a,h)=>a+h.aiMs,0)/MOCK_HISTORY.filter(h=>h.aiMs>0).length)}ms`, color:T.purple },
        ].map(s=>(
          <div key={s.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 14px" }}>
            <div style={{ fontSize:10, color:T.muted, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <Card title="Records" badge={`${filtered.length} results`}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{["","ID","Timestamp","MTI","Connection","Env","Errors","Parse","Validate","AI","Total","Status",""].map((h,i)=><Th key={h+i}>{h}</Th>)}</tr></thead>
          <tbody>
            {filtered.map(h=>{
              const sc={ PASSED:T.green, FAILED:T.red, WARNED:T.yellow }[h.status];
              const isOpen = expanded===h.id;
              return (<>
                <tr key={h.id} style={{ borderBottom:isOpen?"none":`1px solid ${T.border}22`, background:isOpen?T.surface2:"transparent" }}>
                  <td style={{ padding:"8px 6px", textAlign:"center" }}>
                    <button onClick={()=>setExpanded(isOpen?null:h.id)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, width:20, height:20, borderRadius:3, cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center" }}>{isOpen?"▲":"▼"}</button>
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
                  <td style={{ padding:"8px 8px" }}><div style={{ display:"flex", gap:4 }}><SmBtn>View</SmBtn>{role.can.validate&&<SmBtn>↺ Re-run</SmBtn>}<SmBtn>⬇ JSON</SmBtn></div></td>
                </tr>
                {isOpen && <tr key={h.id+"_exp"} style={{ borderBottom:`1px solid ${T.border}22`, background:T.surface2 }}><td colSpan={13} style={{ padding:"10px 14px" }}><div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>Raw Message Preview:</div><div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 12px", fontFamily:"inherit", fontSize:11, color:T.accent, wordBreak:"break-all" }}>{h.raw}<span style={{ color:T.faint }}>…</span></div></td></tr>}
              </>);
            })}
          </tbody>
        </table>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:14, justifyContent:"flex-end" }}>
          <span style={{ fontSize:11, color:T.muted }}>Page {pg} of 1</span>
          <SmBtn onClick={()=>setPg(p=>Math.max(1,p-1))}>← Prev</SmBtn>
          <SmBtn onClick={()=>setPg(p=>p+1)}>Next →</SmBtn>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   7. AI SETTINGS
═══════════════════════════════════════════ */
function AIPage({ role }) {
  const [testOutput, setTestOutput] = useState(null);
  const [testing, setTesting]       = useState(false);
  const [activeTab, setActiveTab]   = useState("global");

  const test = () => { setTesting(true); setTimeout(()=>{ setTesting(false); setTestOutput("DE7 is missing Transmission Date & Time. This field is mandatory for all 0200 messages per ISO8583..."); }, 1400); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="AI Settings" sub="Configure Ollama model, prompt templates, fallback behavior — all stored in DB" />
      {!role.can.edit && <RoleBanner roleNeeded="ADMIN" action="edit AI settings" />}
      <div style={{ display:"flex", gap:6, borderBottom:`1px solid ${T.border}` }}>
        {[["global","Global Config"],["profiles","Per-Connection Prompts"],["history","Prompt History"]].map(([id,label])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{ background:"none", border:"none", borderBottom:`2px solid ${activeTab===id?T.accent:"transparent"}`, color:activeTab===id?T.accent:T.muted, padding:"8px 16px", fontFamily:"inherit", fontSize:12, cursor:"pointer", marginBottom:-1 }}>{label}</button>
        ))}
      </div>
      {activeTab==="global" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <Card title="Model Configuration">
              <div style={{ display:"flex", flexDirection:"column", gap:10, fontSize:12 }}>
                {[{ label:"Ollama Endpoint", val:"http://localhost:11434/api/generate" },{ label:"Active Model", val:"mistral:7b" },{ label:"Temperature", val:"0.3", type:"number" },{ label:"Max Tokens", val:"1024", type:"number" },{ label:"Timeout (ms)", val:"15000", type:"number" },{ label:"Retry Count", val:"2", type:"number" }].map(f=>(
                  <div key={f.label} style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ width:140, color:T.muted, fontSize:11, flexShrink:0 }}>{f.label}</span>
                    <input type={f.type||"text"} defaultValue={f.val} disabled={!role.can.edit} style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"6px 10px", borderRadius:4, fontFamily:"inherit", fontSize:11, outline:"none", opacity:role.can.edit?1:0.6 }} />
                  </div>
                ))}
                <div><Label>Fallback Behavior</Label><select style={selectStyle} disabled={!role.can.edit}>{["SKIP_AI — return validation only","RETURN_ERROR — fail the request","RETRY — retry N times then skip"].map(o=><option key={o}>{o}</option>)}</select></div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>{role.can.edit&&<Btn primary>💾 Save</Btn>}<Btn secondary>Test Connection</Btn></div>
              </div>
            </Card>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <Card title="Available Models" badge="Ollama local">
                {[{ name:"mistral:7b", size:"4.1GB", active:true },{ name:"phi3:mini", size:"2.3GB", active:false },{ name:"llama3:8b", size:"4.7GB", active:false },{ name:"codellama:7b", size:"3.8GB", active:false }].map((m,i)=>(
                  <div key={m.name} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom:i<3?`1px solid ${T.border}22`:"none" }}>
                    <div style={{ flex:1 }}><div style={{ fontSize:12, color:m.active?T.accent:T.text }}>{m.name}</div><div style={{ fontSize:10, color:T.faint }}>{m.size}</div></div>
                    {m.active?<span style={{ fontSize:10, color:T.green }}>● Active</span>:role.can.edit&&<SmBtn>Set Active</SmBtn>}
                  </div>
                ))}
                {role.can.edit&&<Btn secondary style={{ marginTop:8, width:"100%", textAlign:"center" }}>⬇ Pull New Model</Btn>}
              </Card>
              <Card title="Response Time Stats">
                {[{ label:"Avg Response", value:"412ms", color:T.purple },{ label:"P95 Response", value:"680ms", color:T.yellow },{ label:"AI Runs Today", value:"41", color:T.accent },{ label:"Skip Rate", value:"0%", color:T.green }].map(s=>(
                  <div key={s.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}22`, fontSize:11 }}><span style={{ color:T.muted }}>{s.label}</span><span style={{ color:s.color, fontWeight:700 }}>{s.value}</span></div>
                ))}
              </Card>
            </div>
          </div>
          <Card title="Global Prompt Template" badge="Stored in DB">
            <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>Variables: {["{mti}","{profile}","{fields}","{errors}"].map(v=><Tag key={v} color={T.accent} small style={{ marginLeft:4 }}>{v}</Tag>)}</div>
            <textarea rows={8} disabled={!role.can.edit}
              defaultValue={"You are an ISO8583 payment expert assisting with a fintech switch migration.\n\nFor each validation error below, provide:\n1. What the issue is\n2. Why it matters in payment processing\n3. Exact fix with example value\n\nContext:\n- MTI: {mti}\n- Switch Profile: {profile}\n- Parsed Fields: {fields}\n\nValidation Errors:\n{errors}\n\nRespond field-by-field. Be concise, technical, and actionable. No markdown."}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none", opacity:role.can.edit?1:0.6 }} />
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              {role.can.edit&&<Btn primary>💾 Save Template</Btn>}
              <Btn secondary onClick={test}>{testing?"Testing…":"▶ Test Prompt"}</Btn>
              <Btn secondary>Version History</Btn>
              {role.can.edit&&<Btn secondary>↺ Reset Default</Btn>}
            </div>
            {testOutput&&<div style={{ marginTop:12, background:T.bg, border:`1px solid ${T.green}33`, borderRadius:6, padding:"10px 12px" }}><div style={{ fontSize:10, color:T.green, marginBottom:6 }}>✓ AI Response Preview (420ms)</div><div style={{ fontSize:11, color:T.muted, lineHeight:1.7 }}>{testOutput}</div></div>}
          </Card>
        </div>
      )}
      {activeTab==="profiles" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ fontSize:12, color:T.muted }}>Override the global prompt per connection. Leave blank to inherit global template.</div>
          {PROFILES.map(p=>(
            <Card key={p.id} title={p.name} badge={<Tag color={ENV_COLORS[p.env]} small>{p.env}</Tag>}>
              <textarea rows={4} disabled={!role.can.edit} placeholder="Leave blank to use global template…"
                style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none", opacity:role.can.edit?1:0.6 }} />
              {role.can.edit&&<div style={{ display:"flex", gap:8, marginTop:8 }}><Btn primary>💾 Save Override</Btn><Btn secondary>↺ Clear</Btn></div>}
            </Card>
          ))}
        </div>
      )}
      {activeTab==="history" && (
        <Card title="Prompt Template Version History">
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{["Version","Updated By","Updated At","Change Note",""].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {[{ v:"v3", by:"priya.s", at:"2025-05-12 10:00", note:"Added {profile} context variable" },{ v:"v2", by:"john.d", at:"2025-05-01 09:30", note:"Removed markdown instruction" },{ v:"v1", by:"admin", at:"2025-04-15 14:00", note:"Initial prompt template" }].map(r=>(
                <tr key={r.v} style={{ borderBottom:`1px solid ${T.border}22` }}>
                  <td style={{ padding:"8px 8px", color:T.accent }}>{r.v}</td>
                  <td style={{ padding:"8px 8px", color:T.text }}>{r.by}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{r.at}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{r.note}</td>
                  <td style={{ padding:"8px 8px" }}>{role.can.edit&&<SmBtn>Restore</SmBtn>}</td>
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
function RoleBanner({ roleNeeded, action }) {
  return (
    <div style={{ background:T.yellow+"10", border:`1px solid ${T.yellow}33`, borderRadius:6, padding:"8px 14px", fontSize:11, color:T.yellow, display:"flex", alignItems:"center", gap:8 }}>
      ⚠ You have <strong>read-only</strong> access. Only <strong>{roleNeeded}</strong> can {action}. Contact your administrator.
    </div>
  );
}

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
        {["1. Parsing","2. Validating","3. AI Explain"].map(s=>(
          <div key={s} style={{ padding:"4px 14px", borderRadius:20, fontSize:11, background:T.accent+"18", color:T.accent, border:`1px solid ${T.accent}44` }}>{s}</div>
        ))}
      </div>
    </div>
  );
}

function Label({ children }) { return <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>{children}</div>; }
function Required() { return <span style={{ color:T.red }}>*</span>; }
function Row({ children }) { return <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>{children}</div>; }

function Tag({ color, small, children, style:s }) {
  return <span style={{ fontSize:small?9:10, padding:small?"2px 6px":"3px 8px", borderRadius:4, background:color+"22", color, border:`1px solid ${color}44`, whiteSpace:"nowrap", ...s }}>{children}</span>;
}

function Dot({ color }) { return <span style={{ width:6, height:6, borderRadius:"50%", background:color, display:"inline-block" }} />; }
function ColorBox({ color }) { return <span style={{ display:"inline-block", width:10, height:10, background:color, border:`1px solid ${T.border}`, borderRadius:2, verticalAlign:"middle", marginRight:4 }} />; }

function Btn({ children, primary, secondary, onClick, disabled, style:s }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:primary?`linear-gradient(135deg,${T.accent2},${T.accent})`:T.surface2, border:primary?"none":`1px solid ${T.border}`, color:primary?"#fff":T.muted, padding:"8px 14px", borderRadius:6, fontFamily:"inherit", fontSize:11, fontWeight:600, cursor:disabled?"not-allowed":"pointer", whiteSpace:"nowrap", opacity:disabled?0.5:1, ...s }}>{children}</button>
  );
}

function SmBtn({ children, danger, onClick }) {
  return <button onClick={onClick} style={{ background:"none", border:`1px solid ${danger?T.red+"44":T.border}`, color:danger?T.red:T.muted, padding:"3px 9px", borderRadius:4, fontFamily:"inherit", fontSize:9.5, cursor:"pointer", whiteSpace:"nowrap" }}>{children}</button>;
}

function Toggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:`1px solid ${active?T.accent+"55":T.border}`, borderRadius:4, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", color:active?T.accent:T.faint, fontSize:10 }}>
      <div style={{ width:20, height:11, borderRadius:6, background:active?T.accent+"33":T.surface2, border:`1px solid ${active?T.accent:T.faint}`, display:"flex", alignItems:"center", padding:"0 1px" }}>
        <div style={{ width:9, height:9, borderRadius:"50%", background:active?T.accent:T.faint, marginLeft:active?8:0, transition:"margin 0.15s" }} />
      </div>
      {label}
    </button>
  );
}

function Th({ children }) { return <th style={{ textAlign:"left", padding:"7px 8px", color:T.muted, fontWeight:600, fontSize:10, whiteSpace:"nowrap" }}>{children}</th>; }

const selectStyle = { width:"100%", background:T.surface2, border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none", cursor:"pointer" };