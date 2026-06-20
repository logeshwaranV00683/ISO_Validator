import { useState } from "react";
import { T, ENV_COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { getHistory, getHistoryStats, exportHistory } from "../api/history";
import { getProfiles } from "../api/profiles";
import { rerunValidation } from "../api/validation";
import { PageHeader, Card, Tag, SmBtn, Btn, LoadingBar, ErrorBanner,
         StatCard, Pagination, Th } from "../components/shared";

const STATUS_COLOR = { PASSED:T.green, FAILED:T.red, WARNED:T.yellow, PARSE_ERROR:T.red };

export default function History() {
  const { can } = useAuth();
  const [filters, setFilters] = useState({ page:0, size:20, sortBy:"createdAt", sortDir:"desc" });
  const [expanded, setExpanded] = useState(null);
  const [rerunning, setRerunning] = useState(null);

  const { data, loading, error, refetch } = useApi(() => getHistory(filters), [filters]);
  const { data: stats } = useApi(getHistoryStats);
  const { data: profiles } = useApi(getProfiles);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, page: 0 }));

  const handleRerun = async (runReference) => {
    setRerunning(runReference);
    try { await rerunValidation(runReference); refetch(); }
    catch {}
    finally { setRerunning(null); }
  };

  const handleExport = async (format) => {
    const data = await exportHistory(filters, format);
    const blob = format==="csv" ? data : new Blob([JSON.stringify(data,null,2)], { type:"application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `history.${format}`; a.click();
  };

  const SL = { width:"100%", background:T.surface2, border:`1px solid ${T.border}`, color:T.text, padding:"8px 10px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Validation History" sub="Full audit log of every parsed and validated Raw message" />

      {/* Stats */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <StatCard label="Total Runs" value={stats.totalRuns}                                            color={T.accent} />
          <StatCard label="Passed"     value={stats.passed}                                               color={T.green}  />
          <StatCard label="Failed"     value={stats.failed}                                               color={T.red}    />
          <StatCard label="Pass Rate"  value={`${stats.passRate?.toFixed(1)}%`}                           color={stats.passRate>=80?T.green:T.yellow} />
        </div>
      )}

      {/* Filters */}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 140px 160px 130px 130px", gap:10, alignItems:"end" }}>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Search</div>
            <input placeholder="Run ID, MTI…" onChange={e=>setFilter("search",e.target.value)}
              style={{ width:"100%", boxSizing:"border-box", background:T.bg, border:`1px solid ${T.border}`, color:T.text, padding:"8px 12px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" }} />
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Status</div>
            <select onChange={e=>setFilter("status",e.target.value)} style={SL}>
              {["ALL","PASSED","FAILED","WARNED","PARSE_ERROR"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>MTI</div>
            <select onChange={e=>setFilter("mti",e.target.value)} style={SL}>
              {["ALL","0200","0210","0420","0800","0810"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>Profile</div>
            <select onChange={e=>setFilter("profileId",e.target.value)} style={SL}>
              <option value="">ALL</option>
              {profiles?.content?.map(p=><option key={p.id} value={p.id}>{p.profileName}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>From</div>
            <input type="date" onChange={e=>setFilter("fromDate",e.target.value)} style={{ ...SL, width:"100%", boxSizing:"border-box" }} />
          </div>
          <div>
            <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>To</div>
            <input type="date" onChange={e=>setFilter("toDate",e.target.value)} style={{ ...SL, width:"100%", boxSizing:"border-box" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:10, justifyContent:"flex-end" }}>
          <SmBtn onClick={()=>handleExport("csv")}>⬇ CSV</SmBtn>
          {/* <SmBtn onClick={()=>handleExport("json")}>⬇ JSON</SmBtn> */}
          <SmBtn onClick={()=>setFilters({ page:0, size:20, sortBy:"createdAt", sortDir:"desc" })}>↺ Reset</SmBtn>
        </div>
      </Card>

      {loading && <LoadingBar text="Loading history…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      {data && (
        <Card title="Records" badge={`${data.totalElements} total`}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["","Run ID","Timestamp","MTI","Profile","Env","RC","Errors","Parse","Val","AI","Total","Status",""].map((h,i)=><Th key={h+i}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {data.content?.map(h => {
                const sc   = STATUS_COLOR[h.status]||T.muted;
                const open = expanded===h.runReference;
                return (<>
                  <tr key={h.runReference} style={{ borderBottom:open?"none":`1px solid ${T.border}22`, background:open?T.surface2:"transparent" }}>
                    <td style={{ padding:"8px 6px" }}>
                      <button onClick={()=>setExpanded(open?null:h.runReference)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, width:20, height:20, borderRadius:3, cursor:"pointer", fontSize:10 }}>
                        {open?"▲":"▼"}
                      </button>
                    </td>
                    <td style={{ padding:"8px 8px", color:T.accent }}>{h.runReference}</td>
                    <td style={{ padding:"8px 8px", color:T.muted, fontSize:10, whiteSpace:"nowrap" }}>{new Date(h.createdAt).toLocaleString()}</td>
                    <td style={{ padding:"8px 8px", color:T.text, fontWeight:700 }}>{h.mti}</td>
                    <td style={{ padding:"8px 8px", color:T.text, fontSize:10 }}>{h.profileNameSnapshot}</td>
                    <td style={{ padding:"8px 8px" }}><Tag color={ENV_COLORS[h.environment]||T.muted} small>{h.environment}</Tag></td>
                    <td style={{ padding:"8px 8px", fontSize:10 }}>
                      {h.responseCode
                        ? <span style={{ color:h.responseCode==="00"?T.green:T.yellow, fontWeight:700 }}>{h.responseCode}</span>
                        : <span style={{ color:T.faint }}>—</span>}
                    </td>
                    <td style={{ padding:"8px 8px", color:h.totalErrors>0?T.yellow:T.green, fontWeight:700, textAlign:"center" }}>{h.totalErrors}</td>
                    <td style={{ padding:"8px 8px", color:T.muted, textAlign:"center" }}>{h.parseDurationMs}ms</td>
                    <td style={{ padding:"8px 8px", color:T.muted, textAlign:"center" }}>{h.validationDurationMs}ms</td>
                    <td style={{ padding:"8px 8px", color:h.aiDurationMs?T.purple:T.faint, textAlign:"center" }}>{h.aiDurationMs?`${h.aiDurationMs}ms`:"—"}</td>
                    <td style={{ padding:"8px 8px", color:T.text, fontWeight:700 }}>{h.totalDurationMs}ms</td>
                    <td style={{ padding:"8px 8px" }}><Tag color={sc} small>{h.status}</Tag></td>
                    <td style={{ padding:"8px 8px" }}>
                      <div style={{ display:"flex", gap:4 }}>
                        {can.validate && <SmBtn onClick={()=>handleRerun(h.runReference)}>{rerunning===h.runReference?"…":"↺"}</SmBtn>}
                        <SmBtn>⬇</SmBtn>
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr key={h.runReference+"_exp"} style={{ borderBottom:`1px solid ${T.border}22`, background:T.surface2 }}>
                      <td colSpan={14} style={{ padding:"10px 14px" }}>
                        <div style={{ fontSize:11, color:T.muted, marginBottom:6 }}>Raw Message:</div>
                        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:4, padding:"8px 12px", fontSize:11, color:T.accent, wordBreak:"break-all" }}>
                          {h.rawMessageSnapshot}
                        </div>
                      </td>
                    </tr>
                  )}
                </>);
              })}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={p=>setFilters(f=>({...f,page:p}))} />
        </Card>
      )}
    </div>
  );
}