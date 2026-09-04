import FormatModal from "./modals/FormatModal";
import { useState } from "react";
import { T } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi, useMutation } from "../hooks/useApi";
import {
  getFormats, getProfiles, validateXml, updateFormat, reloadFormat,
  getFormatVersions, rollbackFormat, deleteFormat, toggleFormatStatus
} from "../api/profiles";
import {
  PageHeader, Card, Tag, SmBtn, Btn, RoleBanner,
  LoadingBar, ErrorBanner, Label
} from "../components/shared";

export default function Formats() {
  const { can, user } = useAuth();
  const username = user?.username ?? "system";

  const { data: rawFormats, loading, error, refetch } = useApi(getFormats);
  const { data: rawProfiles } = useApi(getProfiles);

  const profiles = Array.isArray(rawProfiles) ? rawProfiles : rawProfiles?.content ?? [];
  const allFormats = Array.isArray(rawFormats) ? rawFormats : rawFormats?.content ?? [];

  const [filterProfileId, setFilterProfileId] = useState("ALL");
  const formats = filterProfileId === "ALL"
    ? allFormats
    : allFormats.filter(f => String(f.profileId) === String(filterProfileId));

  const [editingId, setEditingId]   = useState(null);
  const [xmlContent, setXmlContent] = useState({});
  const [xmlResult, setXmlResult]   = useState({});
  const [versions, setVersions]     = useState({});
  const [showModal, setShowModal]   = useState(false);

  const { mutate: doValidate } = useMutation(validateXml);
  const { mutate: doUpdate   } = useMutation((id, d) => updateFormat(id, d));
  const { mutate: doReload   } = useMutation(reloadFormat);
  const { mutate: doRollback } = useMutation((id, v) => rollbackFormat(id, v));
  const { mutate: doDelete   } = useMutation(deleteFormat);
  const { mutate: doToggle   } = useMutation((id, active) => toggleFormatStatus(id, active));

    const handleValidate = async (id) => {
      try {
        await doValidate(xmlContent[id]);
        setXmlResult(x => ({ ...x, [id]: { valid: true } }));
      } catch (err) {
        // err.message now correctly = "Invalid jPOS XML: org.xml.sax.SAXParseException..."
        setXmlResult(x => ({ ...x, [id]: { valid: false, parseError: err.message } }));
      }
    };

  const handleSave = async (id) => {
    await doUpdate(id, { xmlContent: xmlContent[id], changeNote: "Updated via UI" });
    // versions cache clear + reload
    setVersions(x => ({ ...x, [id]: undefined }));
    setEditingId(null);
    refetch();
    // if versions panel was open, reload it
    const v = await getFormatVersions(id);
    setVersions(x => ({ ...x, [id]: v }));
  };

  const loadVersions = async (id) => {
    if (versions[id]) {
    setVersions(x => {
      const updated = { ...x };
      delete updated[id];
      return updated;
    });
    return;
  }
  const v = await getFormatVersions(id);
  setVersions(x => ({ ...x, [id]: v }));
  };

  const handleReload = async (id) => {
    await doReload(id);
    alert("Reload signal sent!");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete format?")) return;
    await doDelete(id);
    refetch();
  };

  // FIX: backend expects ?active=true/false (boolean), not { status: "active" }
  const handleToggle = async (id, currentStatus) => {
    const isActive = currentStatus === "active";
    await doToggle(id, !isActive);
    refetch();
  };

  const profileName = (profileId) =>
    profiles.find(p => String(p.id) === String(profileId))?.profileName ?? `Profile #${profileId}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Message Formats" sub="Raw Message format XML definitions — stored in DB, hot-reloadable without restart" />
      {!can.edit && <RoleBanner roleNeeded="ADMIN" action="edit formats" />}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        {/* Profile filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Filter by profile:</span>
          <select
            value={filterProfileId}
            onChange={e => setFilterProfileId(e.target.value)}
            style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "5px 10px", borderRadius: 6, fontSize: 11, outline: "none" }}
          >
            <option value="ALL">All Profiles</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.profileName}</option>
            ))}
          </select>
        </div>
        {can.add && <Btn primary onClick={() => setShowModal(true)}>+ New Format</Btn>}
      </div>

      {loading && <LoadingBar text="Loading formats…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      {/* FIX: use f.id everywhere, not f.formatId */}
      {formats.map(f => {
        const isEditing = editingId === f.id;
        const vr = xmlResult[f.id];
        const vs = versions[f.id];

        return (
          <div key={f.id} style={{ background: T.surface, border: `1px solid ${isEditing ? T.accent : T.border}`, borderLeft: `3px solid ${f.status === "active" ? T.green : T.faint}`, borderRadius: 6, padding: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{f.formatName}</span>
                  <Tag color={f.status === "active" ? T.green : T.faint} small>{f.status?.toUpperCase()}</Tag>
                  <Tag color={T.muted} small>v{f.currentVersion}</Tag>
                  <Tag color={T.accent} small>{profileName(f.profileId)}</Tag>
                </div>
                <div style={{ fontSize: 11, color: T.muted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span>{f.isoVersion}</span>
                  <span>{f.encoding} encoding</span>
                  <span>{f.fieldCount ?? f.totalFields} DEs</span>
                  <span>Checksum: <span style={{ color: T.accent }}>{f.checksum}</span></span>
                  <span>Updated by <span style={{ color: T.text }}>{f.updatedBy}</span> · {new Date(f.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {can.edit && (
                  <SmBtn onClick={() => {
                    setEditingId(isEditing ? null : f.id);
                    if (!xmlContent[f.id]) setXmlContent(x => ({ ...x, [f.id]: f.xmlContent || "" }));
                  }}>{isEditing ? "▲ Close" : "▼ Edit XML"}</SmBtn>
                )}
                {can.edit && <SmBtn onClick={() => handleReload(f.id)}>🔄 Reload</SmBtn>}
                {/* {can.edit && (
                  <SmBtn onClick={() => handleToggle(f.id, f.status)}>
                    {f.status === "active" ? "Disable" : "Enable"}
                  </SmBtn>
                )} */}
                <SmBtn onClick={() => loadVersions(f.id)}>Versions</SmBtn>
                {can.delete && <SmBtn danger onClick={() => handleDelete(f.id)} style={{color:T.text}}>🗑 Delete</SmBtn>}
              </div>
            </div>

            {/* XML editor */}
            {isEditing && can.edit && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                {vr && (
                    <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 5, fontSize: 11, background: vr.valid ? T.green + "12" : T.red + "12", color: vr.valid ? T.green : T.red, border: `1px solid ${vr.valid ? T.green + "33" : T.red + "33"}` }}>
                      {vr.valid ? `✓ Valid XML — jPOS packager loaded successfully` : `✗ ${vr.parseError}`}
                    </div>
                  )}
                <Label>XML Config — {f.formatName}</Label>
                <textarea
                  rows={10}
                  value={xmlContent[f.id] || ""}
                  onChange={e => setXmlContent(x => ({ ...x, [f.id]: e.target.value }))}
                  style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "10px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none" }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn primary onClick={() => handleValidate(f.id)}>✓ Validate XML</Btn>
                  <Btn primary onClick={() => handleSave(f.id)}>Save to DB</Btn>
                  <Btn onClick={() => handleReload(f.id)}>🔄 Hot Reload</Btn>
                  <Btn onClick={() => setXmlContent(x => ({ ...x, [f.id]: f.xmlContent || "" }))}>↺ Reset</Btn>
                </div>
              </div>
            )}

            {/* Versions */}
            {vs && (
              <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 8 }}>Version History</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Version", "Updated By", "Date", "Change Note", "Valid", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: T.faint, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vs.map(v => (
                      <tr key={v.versionNumber} style={{ borderBottom: `1px solid ${T.border}22` }}>
                        <td style={{ padding: "6px 8px", color: T.accent }}>
                          v{v.versionNumber} {v.isCurrent && <Tag color={T.green} small>current</Tag>}
                        </td>
                        <td style={{ padding: "6px 8px", color: T.text }}>{v.createdBy}</td>
                        <td style={{ padding: "6px 8px", color: T.muted }}>{new Date(v.createdAt).toLocaleString()}</td>
                        <td style={{ padding: "6px 8px", color: T.muted }}>{v.changeNote}</td>
                        <td style={{ padding: "6px 8px", color: v.validatedOk ? T.green : T.faint }}>{v.validatedOk ? "✓" : "✗"}</td>
                        <td style={{ padding: "6px 8px" }}>
                          {can.edit && !v.isCurrent && (
                            <SmBtn onClick={async () => {
                              await doRollback(f.id, v.versionNumber);
                              refetch();
                              // versions panel refresh
                              const updated = await getFormatVersions(f.id);
                              setVersions(x => ({ ...x, [f.id]: updated }));
                            }}>Rollback</SmBtn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {showModal && (
        <FormatModal
          profiles={profiles}
          onClose={() => setShowModal(false)}
          onSaved={refetch}
        />
      )}
    </div>
  );
}