import { useState } from "react";
import { T } from "../constants/theme";
import { useApi } from "../hooks/useApi";
import { getAuditLogs } from "../api/history";
import { PageHeader, Card, Tag, SmBtn, LoadingBar, ErrorBanner, Th, Pagination } from "../components/shared";

export default function AuditLog() {
  const [page, setPage]           = useState(0);
  const [filters, setFilters]     = useState({});
  const [expanded, setExpanded]   = useState(null);

  const { data, loading, error, refetch } = useApi(
    () => getAuditLogs({ ...filters, page, size:30 }),
    [filters, page]
  );

  const SL = { background:T.surface2, border:`1px solid ${T.border}`, color:T.text, padding:"7px 10px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" };

  const logs = data?.content || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Audit Log" sub="Immutable audit trail of all system actions across all services" />

      {/* Filters */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 160px 160px 160px 140px 140px", gap:10, alignItems:"end" }}>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Entity ID / User</div>
            <input placeholder="Search entity ID or user…" onChange={e=>setFilters(f=>({...f,entityId:e.target.value}))}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"8px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Service</div>
            <select onChange={e=>setFilters(f=>({...f,sourceService:e.target.value}))} style={SL}>
              {["ALL","profile-service","format-service","rule-service","validation-service","auth-service","user-service","config-service"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Action</div>
            <select onChange={e=>setFilters(f=>({...f,action:e.target.value}))} style={SL}>
              {["ALL","CREATE","UPDATE","DELETE","LOGIN","LOGOUT","VALIDATE","RULE_RELOAD"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Entity Type</div>
            <select onChange={e=>setFilters(f=>({...f,entityType:e.target.value}))} style={SL}>
              {["ALL","PROFILE","FORMAT","RULE","FIELD_DEFINITION","USER","PROMPT","CONFIG"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>From</div>
            <input type="date" onChange={e=>setFilters(f=>({...f,fromDate:e.target.value}))} style={{ ...SL, width:"100%", boxSizing:"border-box" }} />
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>To</div>
            <input type="date" onChange={e=>setFilters(f=>({...f,toDate:e.target.value}))} style={{ ...SL, width:"100%", boxSizing:"border-box" }} />
          </div>
        </div>
      </Card>

      {loading && <LoadingBar text="Loading audit logs…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      <Card title="Audit Trail" badge={`${data?.totalElements||0} entries`}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["","Timestamp","Service","Action","Entity Type","Entity ID","User","IP","Changes"].map(h=><Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {logs.map(l => {
              const open = expanded===l.auditId;
              const ACTION_COLOR = { CREATE:T.green, UPDATE:T.yellow, DELETE:T.red, LOGIN:T.accent, LOGOUT:T.faint, VALIDATE:T.blue };
              return (<>
                <tr key={l.auditId} style={{ borderBottom:open?"none":`1px solid ${T.border}22`, background:open?T.surface2:"transparent" }}>
                  <td style={{ padding:"8px 6px" }}>
                    <button onClick={()=>setExpanded(open?null:l.auditId)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, width:20, height:20, borderRadius:3, cursor:"pointer", fontSize:10 }}>
                      {open?"▲":"▼"}
                    </button>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, whiteSpace:"nowrap" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={T.blue} small>{l.sourceService}</Tag></td>
                  <td style={{ padding:"8px 8px" }}><Tag color={ACTION_COLOR[l.action]||T.muted} small>{l.action}</Tag></td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{l.entityType}</td>
                  <td style={{ padding:"8px 8px", color:T.accent }}>{l.entityId}</td>
                  <td style={{ padding:"8px 8px", color:T.text }}>{l.performedBy}</td>
                  <td style={{ padding:"8px 8px", color:T.faint, fontSize:10 }}>{l.ipAddress}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 }}>{l.changesSummary}</td>
                </tr>
                {open && (
                  <tr key={l.auditId+"_exp"} style={{ borderBottom:`1px solid ${T.border}22`, background:T.surface2 }}>
                    <td colSpan={9} style={{ padding:"10px 14px" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, fontSize:11 }}>
                        <div>
                          <div style={{ color:T.faint, marginBottom:6, fontSize:10, fontWeight:700 }}>BEFORE</div>
                          <pre style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 10px", fontSize:10, color:T.muted, margin:0, overflowX:"auto" }}>
                            {l.beforeValue ? JSON.stringify(JSON.parse(l.beforeValue), null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <div style={{ color:T.green, marginBottom:6, fontSize:10, fontWeight:700 }}>AFTER</div>
                          <pre style={{ background:T.bg, border:`1px solid ${T.green}33`, borderRadius:4, padding:"8px 10px", fontSize:10, color:T.text, margin:0, overflowX:"auto" }}>
                            {l.afterValue ? JSON.stringify(JSON.parse(l.afterValue), null, 2) : "—"}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>);
            })}
            {logs.length===0 && !loading && (
              <tr><td colSpan={9} style={{ padding:"24px", textAlign:"center", color:T.faint, fontSize:12 }}>No audit entries found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={data?.page||0} totalPages={data?.totalPages||1} onPageChange={setPage} />
      </Card>
    </div>
  );
}