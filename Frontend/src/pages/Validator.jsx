import { useState, useEffect } from "react";
import { T, SEV, ENV_COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { getProfiles } from "../api/profiles";
import { validateMessage, rerunValidation } from "../api/validation";
import { PageHeader, Card, RoleBanner, LoadingBar, ErrorBanner,
         Btn, SmBtn, Tag, Toggle, Label, Row, Th } from "../components/shared";

export default function Validator({ initialMsg = "" }) {
  const { can } = useAuth();
  const { data: profiles } = useApi(getProfiles);

  const [profileId, setProfileId] = useState(null);
  const [rawMsg, setRawMsg]       = useState(initialMsg || "0200723A00010AC080123456789012345600000000000001000005141430221234567890TERM0001");
  const [enableAi, setEnableAi]   = useState(false);
  const [sevFilter, setSevFilter] = useState("ALL");
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [bitmapExt, setBitmapExt] = useState(false);
  const [expanded, setExpanded]   = useState({});
  const [copied, setCopied]       = useState(false);

  // Set default profile on load
  useEffect(() => {
    if (profiles?.length && !profileId) {
      const def = profiles.find(p => p.isDefault) || profiles[0];
      setProfileId(def.id);
    }
  }, [profiles, profileId]);

  const profile = profiles?.find(p => p.id === profileId);

  const validate = async () => {
    if (!profileId || !rawMsg.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      setResult(await validateMessage(profileId, rawMsg.trim(), enableAi));
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || "Validation failed");
    } finally { setLoading(false); }
  };

  const rerun = async () => {
    if (!result?.runReference) return;
    setLoading(true); setError(null);
    try { setResult(await rerunValidation(result.runReference)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const filtered = result
    ? (sevFilter === "ALL" ? result.errors : result.errors.filter(e => e.severity === sevFilter))
    : [];

  const STATUS_COLOR = { PASSED:T.green, FAILED:T.red, WARNED:T.yellow, PARSE_ERROR:T.red };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Message Validator" sub="Parse · Validate · AI-explain ISO8583 messages in one click" />
      {!can.validate && <RoleBanner roleNeeded="ANALYST or ADMIN" action="validate messages" />}

      {/* Input */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 240px", gap:16 }}>
          <div>
            <Label>Raw ISO8583 Message</Label>
            <textarea value={rawMsg} onChange={e => setRawMsg(e.target.value)} rows={3}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }}
              placeholder="Paste raw ISO8583 hex message here…" />
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <Label>Switch Profile</Label>
              <select value={profileId||""} onChange={e => setProfileId(+e.target.value)}
                style={{ width:"100%", background:T.surface2, border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }}>
                {!profiles && <option>Loading…</option>}
                {profiles?.map(p => (
                  <option key={p.id} value={p.id}>{p.profileName}{p.isDefault?" (default)":""}</option>
                ))}
              </select>
              {profile && (
                <div style={{ fontSize:10, color:T.muted, marginTop:4, display:"flex", gap:6, alignItems:"center" }}>
                  <span>{profile.formatName}</span>
                  <Tag color={ENV_COLORS[profile.environment]||T.muted} small>{profile.environment}</Tag>
                </div>
              )}
            </div>
            <Toggle label="Enable AI Explanation" active={enableAi} onClick={() => setEnableAi(x=>!x)} />
            <div style={{ display:"flex", gap:8 }}>
              <Btn primary onClick={validate} disabled={loading||!can.validate||!profileId} style={{ flex:1 }}>
                {loading?"Processing…":"▶ VALIDATE"}
              </Btn>
              <Btn onClick={() => { setRawMsg(""); setResult(null); setError(null); }}>✕</Btn>
            </div>
          </div>
        </div>
      </Card>

      {loading && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"16px 20px", textAlign:"center" }}>
          <div style={{ fontSize:12, color:T.muted, marginBottom:8 }}>Parsing → Validating{enableAi?" → AI Explanation":""}…</div>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            {["1. Parsing","2. Validating",...(enableAi?["3. AI Explain"]:[])].map(s => (
              <span key={s} style={{ padding:"4px 12px", borderRadius:20, fontSize:11, background:T.accent+"18", color:T.accent, border:`1px solid ${T.accent}44` }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={validate} />}

      {result && !loading && (<>
        {/* Meta bar */}
        <div style={{ display:"flex", gap:10, alignItems:"center", background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 14px", fontSize:11, flexWrap:"wrap" }}>
          <span style={{ color:T.muted }}>Run: <span style={{ color:T.accent }}>{result.runReference}</span></span>
          <span style={{ color:T.faint }}>|</span>
          {[["Parse",result.timing?.parseDurationMs,T.accent],["Validate",result.timing?.validationDurationMs,T.green],...(result.ai?.enabled?[["AI",result.timing?.aiDurationMs,T.purple]]:[])].map(([l,v,c]) => (
            <span key={l} style={{ color:T.muted }}>{l}: <span style={{ color:c, fontWeight:700 }}>{v}ms</span></span>
          ))}
          <span style={{ color:T.faint }}>| Total: <span style={{ color:T.text, fontWeight:700 }}>{result.timing?.totalDurationMs}ms</span></span>
          <div style={{ flex:1 }} />
          <Tag color={STATUS_COLOR[result.status]||T.muted}>{result.status}</Tag>
          <SmBtn onClick={() => { navigator.clipboard?.writeText(JSON.stringify(result,null,2)); setCopied(true); setTimeout(()=>setCopied(false),1500); }}>
            {copied?"✓ Copied":"⎘ Copy JSON"}
          </SmBtn>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {/* Left */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Parsed Fields */}
            <Card title="Parsed Fields" badge={`${result.parsedFields?.filter(f=>f.present).length}/${result.parsedFields?.length} present`}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{["DE","Field Name","Value","Status","Display"].map(h=><Th key={h}>{h}</Th>)}</tr></thead>
                <tbody>
                  {result.parsedFields?.map(f => (
                    <tr key={f.deNumber} style={{ borderBottom:`1px solid ${T.border}22` }}>
                      <td style={{ padding:"6px 8px", color:T.accent, fontWeight:700 }}>{f.deNumber}</td>
                      <td style={{ padding:"6px 8px", color:T.muted, fontSize:10 }}>{f.fieldName}</td>
                      <td style={{ padding:"6px 8px", color:f.present?T.text:T.faint}}>{f.rawValue||"—"}</td>
                      <td style={{ padding:"6px 8px" }}>
                        <span style={{ fontSize:9, padding:"2px 6px", borderRadius:3, background:f.present?T.green+"22":T.red+"22", color:f.present?T.green:T.red }}>
                          {f.present?"PRESENT":"ABSENT"}
                        </span>
                      </td>
                      <td style={{ padding:"6px 8px", color:T.muted, fontSize:10 }}>{f.displayValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Bitmap */}
            <Card title={bitmapExt?"Bitmap — Extended (128-bit)":"Bitmap — Primary (64-bit)"}
              badge={`${result.bitmap?.bitsSet?.length||0} bits ON`}
              extra={<Toggle label="Extended" active={bitmapExt} onClick={()=>setBitmapExt(x=>!x)} />}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:3 }}>
                {Array.from({length:bitmapExt?128:64},(_,i) => {
                  const on = result.bitmap?.bitsSet?.includes(i+1);
                  return <div key={i} title={`DE${i+1}`} style={{ padding:"4px 0", textAlign:"center", borderRadius:3, background:on?T.accent+"22":T.surface2, border:`1px solid ${on?T.accent+"55":T.border}`, color:on?T.accent:T.faint, fontSize:8.5 }}>{i+1}</div>;
                })}
              </div>
              <div style={{ marginTop:8, fontSize:10, color:T.muted }}>
                Primary: <span style={{ color:T.accent }}>{result.bitmap?.primary}</span>
                {result.bitmap?.extended && <> · Extended: <span style={{ color:T.purple }}>{result.bitmap.extended}</span></>}
              </div>
            </Card>
          </div>

          {/* Right */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Errors */}
            <Card title="Validation Errors"
              badge={<span style={{ color:result.errors?.length>0?T.red:T.green }}>{result.errors?.length} issue{result.errors?.length!==1?"s":""}</span>}
              extra={
                <div style={{ display:"flex", gap:4 }}>
                  {["ALL","CRITICAL","WARNING","INFO"].map(s => (
                    <button key={s} onClick={()=>setSevFilter(s)} style={{ background:sevFilter===s?(SEV[s]?.text||T.accent)+"22":"transparent", border:`1px solid ${sevFilter===s?(SEV[s]?.text||T.accent)+"66":T.border}`, color:sevFilter===s?(SEV[s]?.text||T.accent):T.faint, padding:"2px 7px", borderRadius:4, fontSize:9, fontFamily:"inherit", cursor:"pointer" }}>{s}</button>
                  ))}
                </div>
              }>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {filtered.map((e,i) => {
                  const sc = SEV[e.severity]||SEV.INFO;
                  return (
                    <div key={i} style={{ background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:6, padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ color:sc.text, fontWeight:700 }}>{e.deNumber}</span>
                        <Tag color={sc.text} small>{e.severity}</Tag>
                        <span style={{ fontSize:10, color:T.muted, fontStyle:"italic" }}>{e.fieldName}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.text, marginBottom:3 }}>{e.issueDescription}</div>
                      <div style={{ fontSize:10, color:T.faint }}>Rule: {e.ruleSnapshot}</div>
                    </div>
                  );
                })}
                {filtered.length===0 && (
                    result.message
                      ? <div style={{ background:T.red+"12", border:`1px solid ${T.red}33`, borderRadius:6, padding:"10px 12px", fontSize:11 }}>
                          <span style={{ color:T.red, fontWeight:700 }}>⚠ Parse Error: </span>
                          <span style={{ color:T.text, fontFamily:"monospace" }}>{result.message}</span>
                        </div>
                      : <div style={{ textAlign:"center", color:T.muted, fontSize:12, padding:"12px 0" }}>No issues{sevFilter!=="ALL"?` for ${sevFilter}`:""}</div>
                  )}
              </div>
            </Card>

    {/* AI */}
    {result.ai?.enabled && (
      result.ai?.skipped
        ? <Card title="AI Explanation" badge={<span style={{ color:T.yellow }}>Skipped</span>}>
            <div style={{ textAlign:"center", padding:"12px 0", fontSize:11, color:T.muted }}>
              {result.ai.skipReason === "AI_UNAVAILABLE" && "⚠ AI service is currently unavailable"}
              {result.ai.skipReason === "NO_ERRORS"      && "✓ No errors found — AI explanation skipped"}
              {result.ai.skipReason === "PARSE_ERROR"    && "✗ Message could not be parsed — AI skipped"}
            </div>
          </Card>
        : result.errors?.some(e=>e.aiExplanation) && (
            <Card title="AI Explanation" badge={<span style={{ color:T.accent }}>{result.ai.modelUsed} · {result.ai.durationMs}ms · Local</span>}>
              {/* existing AI explanation content unchanged */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {result.errors.filter(e=>e.aiExplanation).map((e,i) => (
                  <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:6, overflow:"hidden" }}>
                    <button onClick={()=>setExpanded(x=>({...x,[i]:!x[i]}))} style={{ width:"100%", background:"none", border:"none", padding:"10px 12px", cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", fontFamily:"inherit" }}>
                      <span style={{ fontSize:11, fontWeight:700, color:T.accent }}>{e.deNumber} — {e.fieldName}</span>
                      <span style={{ color:T.faint }}>{expanded[i]?"▲":"▼"}</span>
                    </button>
                    {expanded[i]!==false && (
                      <div style={{ padding:"0 12px 12px", fontSize:11, lineHeight:1.8 }}>
                        <p style={{ color:T.muted, margin:"0 0 8px" }}>{e.aiExplanation}</p>
                        {e.aiFixSuggestion && <div style={{ background:T.green+"12", border:`1px solid ${T.green}33`, borderRadius:4, padding:"6px 10px", color:T.green }}>→ <strong>Fix:</strong> {e.aiFixSuggestion}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )
    )}

            {/* Actions */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Tag color={T.red}>{result.summary?.criticalCount} CRITICAL</Tag>
              <Tag color={T.yellow}>{result.summary?.warningCount} WARNING</Tag>
              <Tag color={T.blue}>{result.summary?.infoCount} INFO</Tag>
              <div style={{ flex:1 }} />
              {can.validate && <SmBtn onClick={rerun}>↺ Re-run</SmBtn>}
              <SmBtn>⬇ Export JSON</SmBtn>
            </div>
          </div>
        </div>
      </>)}

      {!result && !loading && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:T.faint, fontSize:13, gap:8, padding:"40px 0" }}>
          <span style={{ fontSize:28 }}>⬡</span>
          <span>Paste a message, select a profile, and click VALIDATE</span>
        </div>
      )}
    </div>
  );
}