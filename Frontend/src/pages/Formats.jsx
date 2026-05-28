import { useState } from "react";
import { T } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi, useMutation } from "../hooks/useApi";
import { getFormats, validateXml, updateFormat, reloadFormat,
         getFormatVersions, rollbackFormat, deleteFormat, toggleFormatStatus } from "../api/profiles";
import { PageHeader, Card, Tag, SmBtn, Btn, RoleBanner,
         LoadingBar, ErrorBanner, Label } from "../components/shared";

export default function Formats() {
  const { can } = useAuth();
  const { data, loading, error, refetch } = useApi(getFormats);
  const [editingId, setEditingId]   = useState(null);
  const [xmlContent, setXmlContent] = useState({});
  const [xmlResult, setXmlResult]   = useState({});
  const [versions, setVersions]     = useState({});
  const { mutate: doValidate } = useMutation(validateXml);
  const { mutate: doUpdate   } = useMutation((id,d) => updateFormat(id,d));
  const { mutate: doReload   } = useMutation(reloadFormat);
  const { mutate: doRollback } = useMutation((id,v) => rollbackFormat(id,v));
  const { mutate: doDelete   } = useMutation(deleteFormat);
  const { mutate: doToggle   } = useMutation((id,s) => toggleFormatStatus(id,s));

  const handleValidate = async (id) => {
    const res = await doValidate(xmlContent[id]);
    setXmlResult(x => ({ ...x, [id]: res }));
  };

  const handleSave = async (id) => {
    await doUpdate(id, { xmlContent: xmlContent[id], changeNote:"Updated via UI" });
    refetch(); setEditingId(null);
  };

  const loadVersions = async (id) => {
    const v = await getFormatVersions(id);
    setVersions(x => ({ ...x, [id]: v }));
  };

  const handleReload = async (id) => { await doReload(id); alert("Reloaded!"); };
  const handleDelete = async (id) => { if(!window.confirm("Delete format?")) return; await doDelete(id); refetch(); };
  const handleToggle = async (id, status) => { await doToggle(id, status==="active"?"inactive":"active"); refetch(); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Message Formats" sub="ISO format XML definitions — stored in DB, hot-reloadable without restart" />
      {!can.edit && <RoleBanner roleNeeded="ADMIN" action="edit formats" />}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
        {can.add && <Btn primary>+ New Format</Btn>}
      </div>

      {loading && <LoadingBar text="Loading formats…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      {data?.content?.map(f => {
        const isEditing = editingId === f.formatId;
        const vr = xmlResult[f.formatId];
        const vs = versions[f.formatId];

        return (
          <div key={f.formatId} style={{ background:T.surface, border:`1px solid ${isEditing?T.accent:T.border}`, borderLeft:`3px solid ${f.status==="active"?T.green:T.faint}`, borderRadius:6, padding:16 }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{f.formatName}</span>
                  <Tag color={f.status==="active"?T.green:T.faint} small>{f.status?.toUpperCase()}</Tag>
                  <Tag color={T.muted} small>v{f.currentVersion}</Tag>
                </div>
                <div style={{ fontSize:11, color:T.muted, display:"flex", gap:16, flexWrap:"wrap" }}>
                  <span>{f.isoVersion}</span>
                  <span>{f.encoding} encoding</span>
                  <span>{f.fieldCount} DEs</span>
                  <span>Checksum: <span style={{ color:T.accent }}>{f.checksum}</span></span>
                  <span>Updated by <span style={{ color:T.text }}>{f.updatedBy}</span> · {new Date(f.updatedAt).toLocaleDateString()}</span>
                </div>
                <div style={{ marginTop:6, display:"flex", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontSize:10, color:T.muted }}>Used by: </span>
                  {f.usedByProfiles?.length
                    ? f.usedByProfiles.map(p => <Tag key={p} color={T.accent} small>{p}</Tag>)
                    : <span style={{ fontSize:10, color:T.faint }}>Not used</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {can.edit  && <SmBtn onClick={()=>{ setEditingId(isEditing?null:f.formatId); if(!xmlContent[f.formatId]) setXmlContent(x=>({...x,[f.formatId]:f.xmlContent||""})); }}>{isEditing?"▲ Close":"▼ Edit XML"}</SmBtn>}
                {can.edit  && <SmBtn onClick={()=>handleReload(f.formatId)}>🔄 Reload</SmBtn>}
                {can.edit  && <SmBtn onClick={()=>handleToggle(f.formatId,f.status)}>{f.status==="active"?"Disable":"Enable"}</SmBtn>}
                <SmBtn onClick={()=>loadVersions(f.formatId)}>Versions</SmBtn>
                {can.delete && !f.usedByProfiles?.length && <SmBtn danger onClick={()=>handleDelete(f.formatId)}>Delete</SmBtn>}
              </div>
            </div>

            {/* XML editor */}
            {isEditing && can.edit && (
              <div style={{ marginTop:14, borderTop:`1px solid ${T.border}`, paddingTop:14 }}>
                {vr && (
                  <div style={{ marginBottom:10, padding:"8px 12px", borderRadius:5, fontSize:11, background:vr.valid?T.green+"12":T.red+"12", color:vr.valid?T.green:T.red, border:`1px solid ${vr.valid?T.green+"33":T.red+"33"}` }}>
                    {vr.valid?`✓ Valid — ${vr.fieldCount} fields found`:`✗ ${vr.parseError}`}
                  </div>
                )}
                <Label>XML Config — {f.formatName}</Label>
                <textarea rows={10} value={xmlContent[f.formatId]||""} onChange={e=>setXmlContent(x=>({...x,[f.formatId]:e.target.value}))}
                  style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"10px 12px", borderRadius:6, fontSize:11, fontFamily:"inherit", resize:"vertical", outline:"none" }} />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <Btn primary onClick={()=>handleValidate(f.formatId)}>✓ Validate XML</Btn>
                  <Btn primary onClick={()=>handleSave(f.formatId)}>💾 Save to DB</Btn>
                  <Btn onClick={()=>handleReload(f.formatId)}>🔄 Hot Reload</Btn>
                  <Btn onClick={()=>setXmlContent(x=>({...x,[f.formatId]:f.xmlContent||""}))}>↺ Reset</Btn>
                </div>
              </div>
            )}

            {/* Versions */}
            {vs && (
              <div style={{ marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
                <div style={{ fontSize:11, color:T.muted, fontWeight:700, marginBottom:8 }}>Version History</div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
                  <thead><tr style={{ borderBottom:`1px solid ${T.border}` }}>{["Version","Updated By","Date","Change Note",""].map(h=><th key={h} style={{ textAlign:"left", padding:"5px 8px", color:T.faint, fontWeight:600 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {vs.map(v => (
                      <tr key={v.version} style={{ borderBottom:`1px solid ${T.border}22` }}>
                        <td style={{ padding:"6px 8px", color:T.accent }}>v{v.version}</td>
                        <td style={{ padding:"6px 8px", color:T.text }}>{v.updatedBy}</td>
                        <td style={{ padding:"6px 8px", color:T.muted }}>{new Date(v.updatedAt).toLocaleString()}</td>
                        <td style={{ padding:"6px 8px", color:T.muted }}>{v.changeNote}</td>
                        <td style={{ padding:"6px 8px" }}>{can.edit && v.version!==f.currentVersion && <SmBtn onClick={()=>{ doRollback(f.formatId,v.version); refetch(); }}>Rollback</SmBtn>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}