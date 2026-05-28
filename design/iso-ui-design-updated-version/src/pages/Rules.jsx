import { useState } from "react";
import { T, SEV, ENV_COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi, useMutation } from "../hooks/useApi";
import { getRules, deleteRule, toggleRule, exportRules } from "../api/rules";
import { getProfiles } from "../api/profiles";
import { PageHeader, Card, Tag, SmBtn, Btn, RoleBanner,
         LoadingBar, ErrorBanner, StatCard, Th, Pagination } from "../components/shared";
import RuleModal from "./modals/RuleModal";

const MTIS = ["0200","0210","0420","0800","0810"];

export default function Rules() {
  const { can } = useAuth();
  const [profileId, setProfileId] = useState("");
  const [mti, setMti]             = useState("0200");
  const [page, setPage]           = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule]   = useState(null);

  const { data: profiles } = useApi(getProfiles);
  const { data, loading, error, refetch } = useApi(
    () => getRules({ profileId, mti, page, size:50 }),
    [profileId, mti, page]
  );
  const { mutate: doDelete } = useMutation(deleteRule);
  const { mutate: doToggle } = useMutation((id,v) => toggleRule(id,v));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    await doDelete(id); refetch();
  };

  const handleToggle = async (id, current) => {
    await doToggle(id, !current); refetch();
  };

  const handleExport = async () => {
    const data = await exportRules(profileId, mti);
    const blob = new Blob([JSON.stringify(data,null,2)], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href=url; a.download="rules.json"; a.click();
  };

  const SL = { width:"100%", background:T.surface2, border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" };

  const rules = data?.content || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Rules Manager" sub="Per-profile, per-MTI validation rules — stored in DB, hot-reloadable" />
      {!can.edit && <RoleBanner roleNeeded="ADMIN" action="add or edit rules" />}

      {/* Filters */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, alignItems:"end" }}>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Switch Profile</div>
            <select value={profileId} onChange={e=>{ setProfileId(e.target.value); setPage(0); }} style={SL}>
              <option value="">All Profiles</option>
              {profiles?.content?.map(p => <option key={p.profileId} value={p.profileId}>{p.profileName} ({p.environment})</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>MTI</div>
            <div style={{ display:"flex", gap:8 }}>
              {MTIS.map(m => (
                <button key={m} onClick={()=>{ setMti(m); setPage(0); }}
                  style={{ background:mti===m?T.accent+"22":T.surface2, border:`1px solid ${mti===m?T.accent:T.border}`, color:mti===m?T.accent:T.muted, padding:"7px 16px", borderRadius:6, fontFamily:"inherit", fontSize:11, cursor:"pointer" }}>{m}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:12, color:T.muted }}>
          <span style={{ color:T.text, fontWeight:700 }}>{data?.totalElements||0}</span> rules
        </span>
        <div style={{ flex:1 }} />
        {can.add  && <Btn primary onClick={()=>{ setEditRule(null); setShowModal(true); }}>+ Add Rule</Btn>}
        {can.edit && <SmBtn>⬆ Import JSON</SmBtn>}
        <SmBtn onClick={handleExport}>⬇ Export JSON</SmBtn>
      </div>

      {/* Stats */}
      {rules.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <StatCard label="Total Rules"      value={data?.totalElements}                    color={T.accent} />
          <StatCard label="Active"           value={rules.filter(r=>r.isActive).length}     color={T.green}  />
          <StatCard label="Mandatory Fields" value={rules.filter(r=>r.isMandatory).length}  color={T.yellow} />
          <StatCard label="Critical Rules"   value={rules.filter(r=>r.severity==="CRITICAL").length} color={T.red} />
        </div>
      )}

      {loading && <LoadingBar text="Loading rules…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      <Card>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["#","DE","Field Name","Mandatory","Min","Max","Type","Severity","Pattern","Allowed Values","Active","Eff. From","Eff. To","Updated",...(can.edit?["Actions"]:[])].map(h=><Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.ruleId} style={{ borderBottom:`1px solid ${T.border}22`, opacity:r.isActive?1:0.5 }}>
                  <td style={{ padding:"8px 8px", color:T.faint, textAlign:"center" }}>{r.priority}</td>
                  <td style={{ padding:"8px 8px", color:T.accent, fontWeight:700 }}>{r.deNumber}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, maxWidth:130 }}>{r.fieldName}</td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}><span style={{ color:r.isMandatory?T.green:T.faint }}>{r.isMandatory?"✓":"✗"}</span></td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}>{r.minLength}</td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}>{r.maxLength}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={T.blue} small>{r.dataType}</Tag></td>
                  <td style={{ padding:"8px 8px" }}><Tag color={SEV[r.severity]?.text||T.muted} small>{r.severity}</Tag></td>
                  <td style={{ padding:"8px 8px", color:T.faint, fontSize:10 }}>{r.patternRegex||"—"}</td>
                  <td style={{ padding:"8px 8px", fontSize:9 }}>
                    {r.allowedValues?.length
                      ? <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>{r.allowedValues.map(v=><span key={v} style={{ background:T.accent+"15", color:T.accent, padding:"1px 5px", borderRadius:3 }}>{v}</span>)}</div>
                      : <span style={{ color:T.faint }}>Any</span>}
                  </td>
                  <td style={{ padding:"8px 8px", textAlign:"center" }}>
                    {can.edit
                      ? <div onClick={()=>handleToggle(r.ruleId,r.isActive)} style={{ width:28, height:15, borderRadius:8, background:r.isActive?T.green+"44":T.faint+"44", border:`1px solid ${r.isActive?T.green:T.faint}`, display:"inline-flex", alignItems:"center", padding:"0 2px", cursor:"pointer" }}>
                          <div style={{ width:11, height:11, borderRadius:"50%", background:r.isActive?T.green:T.faint, marginLeft:r.isActive?12:0, transition:"margin 0.15s" }} />
                        </div>
                      : <span style={{ color:r.isActive?T.green:T.faint }}>{r.isActive?"✓":"✗"}</span>}
                  </td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 }}>{r.effectiveFrom||"—"}</td>
                  <td style={{ padding:"8px 8px", color:r.effectiveTo?T.yellow:T.faint, fontSize:10 }}>{r.effectiveTo||"∞"}</td>
                  <td style={{ padding:"8px 8px", fontSize:9, color:T.faint }}><div>{r.updatedBy}</div><div>{r.updatedAt?.split("T")[0]}</div></td>
                  {can.edit && (
                    <td style={{ padding:"8px 8px" }}>
                      <div style={{ display:"flex", gap:4 }}>
                        <SmBtn onClick={()=>{ setEditRule(r); setShowModal(true); }}>Edit</SmBtn>
                        <SmBtn danger onClick={()=>handleDelete(r.ruleId)}>Del</SmBtn>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rules.length===0 && !loading && (
                <tr><td colSpan={15} style={{ padding:"24px", textAlign:"center", color:T.faint, fontSize:12 }}>No rules for {mti} on this profile</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={data?.page||0} totalPages={data?.totalPages||1} onPageChange={setPage} />
      </Card>

      {showModal && (
        <RuleModal
          rule={editRule}
          profileId={profileId}
          mti={mti}
          profiles={profiles?.content||[]}
          onClose={()=>setShowModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}