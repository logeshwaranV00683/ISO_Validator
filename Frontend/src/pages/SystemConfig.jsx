import { useState } from "react";
import { T } from "../constants/theme";
import { useApi, useMutation } from "../hooks/useApi";
import { getSystemConfig, updateSystemConfig } from "../api/config";
import { PageHeader, Card, SmBtn, Btn, LoadingBar, ErrorBanner, Th } from "../components/shared";

export default function SystemConfig() {
  const { data, loading, error, refetch } = useApi(getSystemConfig);
  const [edits, setEdits]   = useState({});
  const [saving, setSaving] = useState(null);
  const { mutate: doUpdate } = useMutation((k,v,d) => updateSystemConfig(k,v,d));

  const handleSave = async (key, description) => {
    setSaving(key);
    try { await doUpdate(key, edits[key], description); refetch(); delete edits[key]; }
    finally { setSaving(null); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="System Config" sub="Runtime key-value configuration — changes take effect immediately without restart" />

      {loading && <LoadingBar text="Loading system config…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      <Card title="Configuration Keys" badge={`${data?.length||0} entries`}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Config Key","Value","Description","Updated By","Updated At",""].map(h=><Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {(data||[]).map(c => {
              const isEditing = edits[c.key] !== undefined;
              return (
                <tr key={c.key} style={{ borderBottom:`1px solid ${T.border}22`, background:isEditing?T.surface2:"transparent" }}>
                  <td style={{ padding:"10px 8px", color:T.accent, fontWeight:700, fontFamily:"monospace", fontSize:11 }}>{c.key}</td>
                  <td style={{ padding:"10px 8px", minWidth:200 }}>
                    <input
                      value={isEditing ? edits[c.key] : c.value}
                      onChange={e => setEdits(x=>({...x,[c.key]:e.target.value}))}
                      onFocus={() => { if (!isEditing) setEdits(x=>({...x,[c.key]:c.value})); }}
                      style={{ width:"100%", boxSizing:"border-box", background:isEditing?T.bg:T.surface2, border:`1px solid ${isEditing?T.accent:T.border}`, color:T.text, padding:"6px 10px", borderRadius:5, fontFamily:"monospace", fontSize:11, outline:"none" }} />
                  </td>
                  <td style={{ padding:"10px 8px", color:T.muted, fontSize:10, maxWidth:200 }}>{c.description}</td>
                  <td style={{ padding:"10px 8px", color:T.muted, fontSize:10 }}>{c.updatedBy}</td>
                  <td style={{ padding:"10px 8px", color:T.faint, fontSize:10 }}>{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : "—"}</td>
                  <td style={{ padding:"10px 8px" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      {isEditing && <Btn primary onClick={()=>handleSave(c.key,c.description)} style={{ padding:"3px 10px", fontSize:10 }}>{saving===c.key?"Saving…":"Save"}</Btn>}
                      {isEditing && <SmBtn onClick={()=>setEdits(x=>{ const n={...x}; delete n[c.key]; return n; })}>Cancel</SmBtn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}