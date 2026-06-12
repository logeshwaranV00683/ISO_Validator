import { useState } from "react";
import { T, ENV_COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { useMutation } from "../hooks/useApi";
import { getProfiles, getFormats, testConnection, toggleProfileStatus,
         setProfileDefault, cloneProfile, deleteProfile } from "../api/profiles";
import { PageHeader, Card, Tag, SmBtn, Btn, RoleBanner,
         LoadingBar, ErrorBanner, Row } from "../components/shared";
import ProfileModal from "./modals/ProfileModal";

export default function Profiles() {
  const { can, user } = useAuth();
  const { data, loading, error, refetch } = useApi(getProfiles);
  const { data: formats } = useApi(getFormats);
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting]         = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const { mutate: doDelete } = useMutation(deleteProfile);
  const { mutate: doClone  } = useMutation(cloneProfile);

  const username = user?.username ?? "system";

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const res = await testConnection(id);
      setTestResults(x => ({ ...x, [id]: res }));
    } catch { setTestResults(x => ({ ...x, [id]: { result: "FAILED", message: "Connection error" } })); }
    finally { setTesting(null); }
  };

  const handleToggle = async (id, current) => {
    await toggleProfileStatus(id, !current, username); refetch();
  };

  const handleSetDefault = async (id) => {
    await setProfileDefault(id, username); refetch();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this profile?")) return;
    await doDelete(id, username); refetch();
  };

  const handleClone = async (id, name) => {
    await doClone(id, `${name} (Copy)`); refetch();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Switch Profiles" sub="Each profile binds a message format + validation rules + switch host" />
      {!can.edit && <RoleBanner roleNeeded="ADMIN" action="edit profiles" />}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {can.add && <Btn primary onClick={() => { setEditProfile(null); setShowModal(true); }}>+ New Profile</Btn>}
      </div>

      {loading && <LoadingBar text="Loading profiles…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {(Array.isArray(data) ? data : data?.content ?? []).map(p => {
          // ✅ Backend returns: p.id, p.active, p.isDefault (not profileId/isActive)
          const conn = testResults[p.id];
          const fmt = formats?.find(f => (f.id || f.formatId) === p.formatId);
          return (
            <div key={p.id} style={{ background: T.surface, borderRadius: 8, border: `1px solid ${p.isDefault ? T.accent : T.border}`, borderTop: `2px solid ${p.active ? ENV_COLORS[p.environment] : T.faint}`, padding: 16, opacity: p.active ? 1 : 0.65 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{p.profileName}</span>
                    {p.isDefault && <Tag color={T.accent} small>DEFAULT</Tag>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Tag color={ENV_COLORS[p.environment] || T.muted} small>{p.environment}</Tag>
                    <Tag color={p.active ? T.green : T.faint} small>{p.active ? "ACTIVE" : "INACTIVE"}</Tag>
                  </div>
                </div>
                {can.edit && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: T.muted }}>
                    Active
                    <div onClick={() => handleToggle(p.id, p.active)} style={{ width: 32, height: 17, borderRadius: 9, background: p.active ? T.green + "44" : T.faint + "44", border: `1px solid ${p.active ? T.green : T.faint}`, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer" }}>
                      <div style={{ width: 13, height: 13, borderRadius: "50%", background: p.active ? T.green : T.faint, marginLeft: p.active ? 14 : 0, transition: "margin 0.15s" }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 11, color: T.muted, display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                <Row><span>Format:</span><span style={{ color: T.accent }}>{fmt?.formatName ?? "—"}</span></Row>
                <Row><span>Host:</span><span style={{ color: T.text }}>{p.host}:{p.port}</span></Row>
                <Row><span>Timezone:</span><span style={{ color: T.text }}>{p.timezone}</span></Row>
                <Row><span>Timeout:</span><span style={{ color: T.text }}>{p.connectionTimeoutMs / 1000}s</span></Row>
                <Row><span>TPDU:</span><span style={{ color: p.tpduEnabled ? T.yellow : T.faint }}>{p.tpduEnabled ? `Enabled · ${p.tpduValue}` : "Disabled"}</span></Row>
              </div>

              {conn && (
                <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: 4, fontSize: 11, background: conn.result === "OK" ? T.green + "12" : T.red + "12", color: conn.result === "OK" ? T.green : T.red, border: `1px solid ${conn.result === "OK" ? T.green + "33" : T.red + "33"}` }}>
                  {conn.result === "OK" ? `✓ Connected · ${conn.latencyMs}ms` : ` ✗ ${conn.message}`}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <SmBtn onClick={() => handleTest(p.id)}>{testing === p.id ? "Testing…" : "⚡ Test Conn"}</SmBtn>
                {can.edit && <SmBtn onClick={() => { setEditProfile(p); setShowModal(true); }}>✎ Edit</SmBtn>}
                {can.add  && <SmBtn onClick={() => handleClone(p.id, p.profileName)}>⎘ Clone</SmBtn>}
                {can.edit && !p.isDefault && <SmBtn onClick={() => handleSetDefault(p.id)}>★ Set Default</SmBtn>}
                {can.delete && !p.isDefault && <SmBtn danger onClick={() => handleDelete(p.id)}>Delete</SmBtn>}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && <ProfileModal profile={editProfile} formats={Array.isArray(formats) ? formats : formats?.content || []} onClose={() => setShowModal(false)} onSaved={refetch} />}
    </div>
  );
}