import { useState, useEffect } from "react";
import { T, SEV, MTIS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi, useMutation } from "../hooks/useApi";
import { getRules, deleteRule, toggleRule, exportRules } from "../api/rules";
import { getProfiles } from "../api/profiles";
import {
  PageHeader, Card, Tag, SmBtn, Btn, RoleBanner,
  LoadingBar, ErrorBanner, StatCard, Th, Pagination
} from "../components/shared";
import RuleModal from "./modals/RuleModal";

export default function Rules() {
  const { can } = useAuth();
  const [profileId, setProfileId] = useState(null);
  const [mti, setMti] = useState(MTIS[0]);
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState(null);

  const { data: profiles } = useApi(getProfiles);

  useEffect(() => {
    if (profileId === null && profiles) {
      const list = Array.isArray(profiles) ? profiles : (profiles?.content || []);
      if (list.length > 0) setProfileId(String(list[0].id));
    }
  }, [profiles, profileId]);

  const { data, loading, error, refetch } = useApi(
    () => profileId ? getRules({ profileId, mti }) : Promise.resolve(null),
    [profileId, mti, page]
  );

  const { mutate: doDelete } = useMutation(deleteRule);
  const { mutate: doToggle } = useMutation((id) => toggleRule(id));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    await doDelete(id); refetch();
  };

  const handleToggle = async (id) => {
    await doToggle(id); refetch();
  };

  const handleExport = async () => {
    const exportData = await exportRules(profileId, mti);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rules.json"; a.click();
  };

  const SL = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };

  const profileList = Array.isArray(profiles) ? profiles : (profiles?.content || []);
  const rules = Array.isArray(data) ? data : (data?.content || []);
  const totalElements = Array.isArray(data) ? data.length : (data?.totalElements || 0);
  const currentPage = Array.isArray(data) ? 0 : (data?.page || 0);
  const totalPages = Array.isArray(data) ? 1 : (data?.totalPages || 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Rules Manager" sub="Per-profile, per-MTI validation rules — stored in DB, hot-reloadable" />
      {!can.edit && <RoleBanner roleNeeded="ADMIN" action="add or edit rules" />}

      {/* Filters */}
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Profile dropdown */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 5, fontWeight: 600 }}>Message Profile</div>
            <select
              value={profileId || ""}
              onChange={e => { setProfileId(e.target.value); setPage(0); }}
              style={SL}
            >
              {profileList.map(p => (
                <option key={p.id} value={p.id}>{p.profileName}</option>
              ))}
            </select>
          </div>

          {/* MTI pills — wrap */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "start" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 5, fontWeight: 600 }}>MTI</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MTIS.map(m => (
                <button
                  key={m}
                  onClick={() => { setMti(m); setPage(0); }}
                  style={{
                    background: mti === m ? T.accent + "22" : T.surface2,
                    border: `1px solid ${mti === m ? T.accent : T.border}`,
                    color: mti === m ? T.accent : T.muted,
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontFamily: "inherit",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: mti === m ? 700 : 400,
                    transition: "all 0.15s",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 13, color: T.muted }}>
          <span style={{ color: T.text, fontWeight: 700 }}>{totalElements}</span> rules
        </span>
        <div style={{ flex: 1 }} />
        {can.add && <Btn primary onClick={() => { setEditRule(null); setShowModal(true); }}>+ Add Rule</Btn>}
        {/* {can.edit && <SmBtn>⬆ Import JSON</SmBtn>} */}
        <SmBtn onClick={handleExport}>⬇ Export JSON</SmBtn>
      </div>

      {/* Stats */}
      {rules.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          <StatCard label="Total Rules" value={totalElements} color={T.accent} />
          <StatCard label="Active" value={rules.filter(r => r.active).length} color={T.green} />
          <StatCard label="Mandatory Fields" value={rules.filter(r => r.isMandatory).length} color={T.yellow} />
          <StatCard label="Critical Rules" value={rules.filter(r => r.severity === "CRITICAL").length} color={T.red} />
        </div>
      )}

      {loading && <LoadingBar text="Loading rules…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      <Card>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["#", "DE", "Field Name", "Mandatory", "Min", "Max", "Type", "Severity", "Pattern", "Allowed Values", "Active", "Eff. From", "Eff. To", "Updated", ...(can.edit ? ["Actions"] : [])].map(h => <Th key={h}>{h}</Th>)}
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}22`, opacity: r.active ? 1 : 0.5 }}>
                  <td style={{ padding: "8px 8px", color: T.faint, textAlign: "center" }}>{r.priority}</td>
                  <td style={{ padding: "8px 8px", color: T.accent, fontWeight: 700 }}>{r.deNumber}</td>
                  <td style={{ padding: "8px 8px", color: T.muted, fontSize: 10, maxWidth: 130 }}>{r.fieldName}</td>
                  <td style={{ padding: "8px 8px", textAlign: "center" }}><span style={{ color: r.isMandatory ? T.green : T.faint }}>{r.isMandatory ? "✓" : "✗"}</span></td>
                  <td style={{ padding: "8px 8px", textAlign: "center" }}>{r.minLength}</td>
                  <td style={{ padding: "8px 8px", textAlign: "center" }}>{r.maxLength}</td>
                  <td style={{ padding: "8px 8px" }}><Tag color={T.blue} small>{r.dataType}</Tag></td>
                  <td style={{ padding: "8px 8px" }}><Tag color={SEV[r.severity]?.text || T.muted} small>{r.severity}</Tag></td>
                  <td style={{ padding: "8px 8px", color: T.faint, fontSize: 10 }}>{r.patternRegex || "—"}</td>
                  <td style={{ padding: "8px 8px", fontSize: 9 }}>
                    {r.allowedValues?.length
                      ? <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{r.allowedValues.map(v => <span key={v} style={{ background: T.accent + "15", color: T.accent, padding: "1px 5px", borderRadius: 3 }}>{v}</span>)}</div>
                      : <span style={{ color: T.faint }}>Any</span>}
                  </td>
                  <td style={{ padding: "8px 8px", textAlign: "center" }}>
                    {can.edit
                      ? <div onClick={() => handleToggle(r.id)} style={{ width: 28, height: 15, borderRadius: 8, background: r.active ? T.green + "44" : T.faint + "44", border: `1px solid ${r.active ? T.green : T.faint}`, display: "inline-flex", alignItems: "center", padding: "0 2px", cursor: "pointer" }}>
                          <div style={{ width: 11, height: 11, borderRadius: "50%", background: r.active ? T.green : T.faint, marginLeft: r.active ? 12 : 0, transition: "margin 0.15s" }} />
                        </div>
                      : <span style={{ color: r.active ? T.green : T.faint }}>{r.active ? "✓" : "✗"}</span>}
                  </td>
                  <td style={{ padding: "8px 8px", color: T.muted, fontSize: 10 }}>{r.effectiveFrom || "—"}</td>
                  <td style={{ padding: "8px 8px", color: r.effectiveTo ? T.yellow : T.faint, fontSize: 10 }}>{r.effectiveTo || "∞"}</td>
                  <td style={{ padding: "8px 8px", fontSize: 9, color: T.faint }}><div>{r.updatedByName}</div><div>{r.updatedAt?.split("T")[0]}</div></td>
                  {can.edit && (
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <SmBtn onClick={() => { setEditRule(r); setShowModal(true); }}>Edit</SmBtn>
                        <SmBtn danger onClick={() => handleDelete(r.id)}>Del</SmBtn>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {rules.length === 0 && !loading && (
                <tr><td colSpan={15} style={{ padding: "24px", textAlign: "center", color: T.faint, fontSize: 12 }}>No rules for {mti} on this profile</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {showModal && (
        <RuleModal
          rule={editRule}
          profileId={profileId}
          mti={mti}
          profiles={profileList}
          onClose={() => setShowModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}