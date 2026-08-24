import { useState, useEffect } from "react";
import { T } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi, useMutation } from "../hooks/useApi";
import { getFieldDefinitions, deleteFieldDef, updateFieldDef } from "../api/rules";
import { getProfiles, getFormatMtis } from "../api/profiles";
import { PageHeader, Card, Tag, SmBtn, Btn, LoadingBar, ErrorBanner, Th, Toggle } from "../components/shared";
import FieldDefModal from "./modals/FieldDefModal";


export default function FieldDefinitions() {
  const { can } = useAuth();
  const [profileId, setProfileId] = useState("");
  const [mti, setMti] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editDef, setEditDef] = useState(null);

  const { data: profiles } = useApi(getProfiles);

  useEffect(() => {
    const list = Array.isArray(profiles)
      ? profiles
      : profiles?.content || [];

    if (!profileId && list.length > 0) {
      setProfileId(String(list[0].id));
    }
  }, [profiles, profileId]);

  const { data: availableMtis } = useApi(
    () => (profileId ? getFormatMtis(profileId) : Promise.resolve([])),
    [profileId]
  );
  const mtiList = availableMtis || [];

  useEffect(() => {
    if (mtiList.length > 0 && !mtiList.includes(mti)) {
      setMti(mtiList[0]);
    } else if (mtiList.length === 0) {
      setMti(null);
    }
  }, [mtiList]); 

  const { data: defs, loading, error, refetch } = useApi(
    () =>
      profileId && mti
        ? getFieldDefinitions({ profileId, mti })
        : Promise.resolve([]),
    [profileId, mti]
  );

  const { mutate: doDelete } = useMutation(deleteFieldDef);
  const { mutate: doUpdate } = useMutation((id, d) => updateFieldDef(id, d));

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this field definition?")) return;
    await doDelete(id); refetch();
  };

  const handleToggleVisible = async (d) => {
    await doUpdate(d.id, { isBuilderVisible: !d.isBuilderVisible });
    refetch();
  };

  const SL = { background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Field Definitions" sub="DE catalog per profile + MTI — drives the Message Builder form dynamically. Replaces hardcoded PROFILE_DE_CATALOG." />

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Profile dropdown */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>Message Profile</div>
            <select value={profileId} onChange={e => setProfileId(e.target.value)} style={{ ...SL }}>
              {(Array.isArray(profiles)
                ? profiles
                : profiles?.content || []
              ).map(p => (
                <option key={p.id} value={p.id}>
                  {p.profileName}
                </option>
              ))}
            </select>
          </div>

          {/* MTI pills — now sourced from actual uploaded Message Formats for this profile */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "start" }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>MTI</div>
            {mtiList.length === 0 ? (
              <div style={{ fontSize: 11, color: T.faint }}>
                No message formats uploaded for this profile yet — upload one on the Formats page first.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mtiList.map(m => (
                  <button key={m} onClick={() => setMti(m)}
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
                  >{m}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {/* {can.add && <Btn primary onClick={() => { setEditDef(null); setShowModal(true); }}>+ Add Field</Btn>} */}
        {/* {can.add && <SmBtn>⬆ Bulk Import</SmBtn>} */}
      </div>

      {loading && <LoadingBar text="Loading field definitions…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      <Card title={`Field Definitions`} badge={`${defs?.length || 0} fields`}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              {["Order", "DE", "Field Name", "Type", "Max Len", "LLVAR", "Mandatory", "Placeholder", "Builder Visible", "Active", ...(can.edit ? ["Actions"] : [])].map(h => <Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {(defs || []).map(d => (
              <tr key={d.id} style={{ borderBottom: `1px solid ${T.border}22`, opacity: d.isActive ? 1 : 0.5 }}>
                <td style={{ padding: "8px 8px", color: T.cement, textAlign: "center" }}>{d.displayOrder}</td>
                <td style={{ padding: "8px 8px", color: T.accent, fontWeight: 700 }}>{d.deNumber}</td>
                <td style={{ padding: "8px 8px", color: T.text }}>{d.fieldName}</td>
                <td style={{ padding: "8px 8px" }}><Tag color={T.blue} small>{d.dataType}</Tag></td>
                <td style={{ padding: "8px 8px", textAlign: "center", color: T.text }}>{d.maxLength}</td>
                <td style={{ padding: "8px 8px", textAlign: "center" }}>
                  {(d.isLlvar || d.isLllvar) && <Tag color={T.purple} small>{d.isLllvar ? "LLLVAR" : "LLVAR"}</Tag>}
                </td>
                <td style={{ padding: "8px 8px", textAlign: "center", color: d.isMandatory ? T.green : T.red }}>{d.isMandatory ? "✓" : "✗"}</td>
                <td style={{ padding: "8px 8px", color: T.text, fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.placeholderValue || "—"}</td>
                <td style={{ padding: "8px 8px", textAlign: "center" }}>
                  <Toggle label="" active={d.isBuilderVisible} onClick={() => can.edit && handleToggleVisible(d)} />
                </td>
                <td style={{ padding: "8px 8px", textAlign: "center", color: d.isActive ? T.green : T.red }}>{d.isActive ? "✓" : "✗"}</td>
                {can.edit && (
                  <td style={{ padding: "8px 8px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <SmBtn onClick={() => { setEditDef(d); setShowModal(true); }}>Edit</SmBtn>
                      {/* <SmBtn danger onClick={() => handleDelete(d.id)}>Del</SmBtn> */}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!defs?.length && !loading && (
              <tr><td colSpan={11} style={{ padding: "24px", textAlign: "center", color: T.faint, fontSize: 12 }}>
                {mti ? `No field definitions for ${mti}. Add fields to enable the Message Builder for this profile + MTI.` : "Select a profile with an uploaded Message Format to see field definitions."}
              </td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {showModal && (
        <FieldDefModal
          def={editDef}
          profileId={profileId}
          mti={mti}
          profiles={
            Array.isArray(profiles)
              ? profiles
              : profiles?.content || []
          }
          onClose={() => setShowModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}