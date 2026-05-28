import { useNavigate } from "react-router-dom";
import { T, ENV_COLORS } from "../constants/theme";
import { useApi } from "../hooks/useApi";
import { getHistoryStats, getHistory } from "../api/history";
import { PageHeader, Card, Tag, StatCard, LoadingBar, ErrorBanner } from "../components/shared";

const STATUS_COLOR = { PASSED:T.green, FAILED:T.red, WARNED:T.yellow, PROCESSING:T.blue, PARSE_ERROR:T.red };

export default function Dashboard() {
  const navigate = useNavigate();
  const { data:stats, loading:sLoad, error:sErr, refetch:sRefetch } = useApi(getHistoryStats);
  const { data:recent, loading:rLoad } = useApi(() => getHistory({ page:0, size:5, sortBy:"createdAt", sortDir:"desc" }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Dashboard" sub="Real-time validation analytics and recent activity" />

      {sLoad && <LoadingBar text="Loading stats…" />}
      {sErr  && <ErrorBanner message={sErr} onRetry={sRefetch} />}

      {stats && (<>
        {/* Row 1 — counts */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <StatCard label="Total Runs"  value={stats.totalRuns}                        color={T.accent} />
          <StatCard label="Passed"      value={stats.passed}                           color={T.green}  />
          <StatCard label="Failed"      value={stats.failed}                           color={T.red}    />
          <StatCard label="Pass Rate"   value={`${stats.passRate?.toFixed(1)}%`}       color={stats.passRate>=80?T.green:T.yellow} />
        </div>

        {/* Row 2 — timing */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <StatCard label="Avg Total"   value={`${stats.avgTotalMs ?? "—"}ms`}         color={T.muted}  />
          <StatCard label="P95 Total"   value={`${stats.p95TotalMs ?? "—"}ms`}         color={T.yellow} />
          <StatCard label="Avg AI"      value={`${stats.avgAiMs ?? "—"}ms`}            color={T.purple} />
          <StatCard label="AI Skips"    value={stats.aiSkipCount ?? 0}                 color={T.faint}  />
        </div>

        {/* Row 3 — charts */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>

          {/* By Status */}
          <Card title="Runs by Status">
            {Object.entries(stats.runsByStatus || {}).map(([status, count]) => {
              const pct = stats.totalRuns ? Math.round(count/stats.totalRuns*100) : 0;
              return (
                <div key={status} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                    <span style={{ color:STATUS_COLOR[status]||T.muted }}>{status}</span>
                    <span style={{ color:T.muted }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:4, background:T.surface2, borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:STATUS_COLOR[status]||T.accent, borderRadius:2, transition:"width 0.6s" }} />
                  </div>
                </div>
              );
            })}
          </Card>

          {/* By MTI */}
          <Card title="Runs by MTI">
            {Object.entries(stats.runsByMti || {}).map(([mti, count]) => {
              const pct = stats.totalRuns ? Math.round(count/stats.totalRuns*100) : 0;
              return (
                <div key={mti} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                    <span style={{ color:T.accent }}>{mti}</span>
                    <span style={{ color:T.muted }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height:4, background:T.surface2, borderRadius:2 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:T.accent, borderRadius:2 }} />
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Top Error Fields */}
          <Card title="Top Error Fields">
            {(stats.topErrorFields||[]).slice(0,6).map((f,i) => (
              <div key={f.deNumber} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:`1px solid ${T.border}22` }}>
                <span style={{ fontSize:9, color:T.faint, width:12 }}>{i+1}</span>
                <span style={{ color:T.red, fontWeight:700, fontSize:10, width:36 }}>{f.deNumber}</span>
                <span style={{ color:T.muted, fontSize:10, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.fieldName}</span>
                <span style={{ color:T.yellow, fontWeight:700, fontSize:11 }}>{f.errorCount}</span>
              </div>
            ))}
            {!stats.topErrorFields?.length && <span style={{ fontSize:11, color:T.faint }}>No errors recorded</span>}
          </Card>
        </div>
      </>)}

      {/* Recent Runs */}
      <Card
        title="Recent Validations"
        extra={<button onClick={() => navigate("/history")} style={{ background:"none", border:"none", color:T.accent, fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>View all →</button>}
      >
        {rLoad && <LoadingBar text="Loading recent runs…" />}
        {recent?.content && (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                {["Run ID","Timestamp","MTI","Profile","Env","Status","Errors","Duration"].map(h => (
                  <th key={h} style={{ textAlign:"left", padding:"7px 8px", color:T.muted, fontWeight:600, fontSize:10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.content.map(h => (
                <tr key={h.runReference} onClick={() => navigate("/history")}
                  style={{ borderBottom:`1px solid ${T.border}22`, cursor:"pointer" }}>
                  <td style={{ padding:"8px 8px", color:T.accent }}>{h.runReference}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 }}>{new Date(h.createdAt).toLocaleString()}</td>
                  <td style={{ padding:"8px 8px", color:T.text, fontWeight:700 }}>{h.mti}</td>
                  <td style={{ padding:"8px 8px", color:T.text, fontSize:10 }}>{h.profileNameSnapshot}</td>
                  <td style={{ padding:"8px 8px" }}><Tag color={ENV_COLORS[h.environment]||T.muted} small>{h.environment}</Tag></td>
                  <td style={{ padding:"8px 8px" }}><Tag color={STATUS_COLOR[h.status]||T.muted} small>{h.status}</Tag></td>
                  <td style={{ padding:"8px 8px", color:h.totalErrors>0?T.yellow:T.green, fontWeight:700 }}>{h.totalErrors}</td>
                  <td style={{ padding:"8px 8px", color:T.muted }}>{h.totalDurationMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}