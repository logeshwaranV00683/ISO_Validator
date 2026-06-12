import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { T, ENV_COLORS, MTI_DESCRIPTIONS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { getProfiles } from "../api/profiles";
import { getFieldDefinitions } from "../api/rules";
import { buildMessage } from "../api/validation";
import {
  PageHeader, Card, RoleBanner, LoadingBar, ErrorBanner,
  Btn, SmBtn, Tag, Toggle, Label
} from "../components/shared";

const MTIS = [["0200", "Auth Req"], ["0210", "Auth Resp"], ["0420", "Reversal"], ["0800", "Net Mgmt"], ["0810", "Net Resp"]];

function FieldInput({ field, value, onChange }) {
  const hasVal = value?.trim().length > 0;
  const lenOk = !hasVal || value.length <= field.maxLength;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 10, alignItems: "start" }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.accent }}>{field.deNumber}</div>
        <div style={{ fontSize: 8.5, color: T.faint, lineHeight: 1.5 }}>{field.dataType}<br />max {field.maxLength}</div>
      </div>
      <div>
        <div style={{ fontSize: 9.5, color: T.muted, marginBottom: 3 }}>
          {field.fieldName}{field.isMandatory && <span style={{ color: T.red }}> *</span>}
        </div>
        <div style={{ position: "relative" }}>
          <input value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholderValue || ""} maxLength={field.maxLength}
            style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${hasVal && lenOk ? T.green : hasVal && !lenOk ? T.red : T.border}`, color: T.text, padding: "7px 40px 7px 10px", borderRadius: 5, fontFamily: "inherit", fontSize: 11, outline: "none", transition: "border-color 0.15s" }} />
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 8.5, color: hasVal && !lenOk ? T.red : T.faint }}>
            {value.length}/{field.maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Builder() {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [profileId, setProfileId] = useState(null);
  const [mti, setMti] = useState("0200");
  const [fieldValues, setFieldValues] = useState({});
  const [showOptional, setShowOptional] = useState(true);
  const [built, setBuilt] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState(null);
  const [copied, setCopied] = useState(false);

  const { data: profiles } = useApi(getProfiles);

  // Set default profile
  useEffect(() => {
    const list = Array.isArray(profiles)
      ? profiles
      : profiles?.content || [];

    if (list.length > 0 && !profileId) {
      const def = list.find(p => p.isDefault) || list[0];
      setProfileId(def.id);
    }
  }, [profiles, profileId]);

  // Fetch field definitions dynamically when profile or MTI changes
  const { data: fieldDefs, loading: defsLoading } = useApi(
    () => profileId ? getFieldDefinitions({ profileId, mti }) : Promise.resolve([]),
    [profileId, mti]
  );

  const catalog = fieldDefs || [];
  const mandatory = catalog.filter(f => f.isMandatory && f.isBuilderVisible !== false);
  const optional = catalog.filter(f => !f.isMandatory && f.isBuilderVisible !== false);

  const profileList = Array.isArray(profiles)
    ? profiles
    : profiles?.content || [];

  const profile = profileList.find(p => p.id === profileId);
  const progress = mandatory.length > 0
    ? Math.round(mandatory.filter(f => fieldValues[f.deNumber]?.trim()).length / mandatory.length * 100)
    : 0;

  const resetAll = () => { setFieldValues({}); setBuilt(null); setBuildError(null); };

  const handleBuild = async () => {
    setBuildError(null);
    const missing = mandatory.filter(f => !fieldValues[f.deNumber]?.trim());
    if (missing.length > 0) { setBuildError(`Missing mandatory: ${missing.map(f => f.deNumber).join(", ")}`); return; }
    setBuilding(true);
    try {
      setBuilt(await buildMessage(profileId, mti, fieldValues));
    } catch (err) {
      setBuildError(err?.response?.data?.error?.message || err.message);
    } finally { setBuilding(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Message Builder" sub="Construct well-formed ISO8583 messages — fields driven dynamically from Field Definitions DB" />
      {!can.build && <RoleBanner roleNeeded="ANALYST or ADMIN" action="build messages" />}

      {/* Profile + MTI selector */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "end" }}>
          <div>
            <Label>Switch Profile</Label>
            <select value={profileId || ""} onChange={e => { setProfileId(+e.target.value); resetAll(); }}
              style={{ width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" }}>
              {!profiles && <option>Loading…</option>}
              {profileList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.profileName}
                </option>
              ))}
            </select>
            {profile && (
              <div style={{ fontSize: 10, color: T.muted, marginTop: 4, display: "flex", gap: 6, alignItems: "center" }}>
                <span>Format: <span style={{ color: T.accent }}>{profile.formatName}</span></span>
                <Tag color={ENV_COLORS[profile.environment] || T.muted} small>{profile.environment}</Tag>
                {profile.tpduEnabled && <Tag color={T.yellow} small>TPDU</Tag>}
              </div>
            )}
          </div>
          <div>
            <Label>MTI</Label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MTIS.map(([m, sub]) => (
                <button key={m} onClick={() => { setMti(m); resetAll(); }}
                  style={{ background: mti === m ? T.accent + "22" : T.surface2, border: `1px solid ${mti === m ? T.accent : T.border}`, color: mti === m ? T.accent : T.muted, padding: "7px 16px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}>
                  {m}<span style={{ fontSize: 9, color: mti === m ? T.accent : T.faint, display: "block", marginTop: 1 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Info bar */}
      <div style={{ background: T.accent + "10", border: `1px solid ${T.accent}33`, borderRadius: 6, padding: "8px 14px", fontSize: 11, color: T.accent, display: "flex", gap: 8, alignItems: "center" }}>
        {defsLoading
          ? <><span>⬡</span><span>Loading fields from DB…</span></>
          : <><span>⬡</span><span>Fields loaded for <strong>{profile?.profileName}</strong> · MTI <strong>{mti}</strong> — <strong>{mandatory.length}</strong> mandatory, <strong>{optional.length}</strong> optional</span>
            {catalog.length === 0 && <span style={{ color: T.yellow }}>⚠ No fields configured for this MTI on this profile</span>}
          </>
        }
      </div>

      {/* Progress bar */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: T.muted }}>
            Mandatory: <span style={{ color: progress === 100 ? T.green : T.yellow, fontWeight: 700 }}>{mandatory.filter(f => fieldValues[f.deNumber]?.trim()).length}/{mandatory.length}</span>
            <span style={{ color: T.faint }}> · Optional: {optional.filter(f => fieldValues[f.deNumber]?.trim()).length}/{optional.length}</span>
          </span>
          <span style={{ fontSize: 10, color: progress === 100 ? T.green : T.muted }}>{progress}% ready</span>
        </div>
        <div style={{ height: 4, background: T.surface2, borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: progress === 100 ? T.green : T.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      </div>

      {defsLoading && <LoadingBar text="Loading field definitions from DB…" />}

      {!defsLoading && catalog.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14 }}>
          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="Mandatory Fields" badge={<Tag color={T.red} small>REQUIRED</Tag>}>
              {mandatory.length === 0
                ? <div style={{ textAlign: "center", color: T.faint, fontSize: 12, padding: "12px 0" }}>No mandatory fields for {mti}</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mandatory.map(f => <FieldInput key={f.deNumber} field={f} value={fieldValues[f.deNumber] || ""} onChange={v => setFieldValues(x => ({ ...x, [f.deNumber]: v }))} />)}
                </div>
              }
            </Card>
            <Card title="Optional Fields" badge={<Tag color={T.blue} small>OPTIONAL</Tag>} extra={<Toggle label={showOptional ? "Hide" : "Show"} active={showOptional} onClick={() => setShowOptional(x => !x)} />}>
              {showOptional
                ? <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {optional.map(f => <FieldInput key={f.deNumber} field={f} value={fieldValues[f.deNumber] || ""} onChange={v => setFieldValues(x => ({ ...x, [f.deNumber]: v }))} />)}
                </div>
                : <div style={{ textAlign: "center", color: T.faint, fontSize: 11, padding: "8px 0" }}>{optional.length} optional fields hidden</div>
              }
            </Card>
          </div>

          {/* Summary + actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card title="Live Field Summary">
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 320, overflowY: "auto" }}>
                {catalog.map(f => {
                  const val = fieldValues[f.deNumber]?.trim();
                  return (
                    <div key={f.deNumber} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.border}22` }}>
                      <span style={{ color: T.accent, fontSize: 10, fontWeight: 700, width: 40 }}>{f.deNumber}</span>
                      <span style={{ color: T.muted, fontSize: 9.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fieldName}</span>
                      {f.isMandatory && <span style={{ fontSize: 8, color: T.red }}>*</span>}
                      <span style={{ fontSize: 10, color: val ? T.text : T.faint, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val || "—"}</span>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: val ? T.green : f.isMandatory ? T.red : T.faint, flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </Card>

            {buildError && <div style={{ background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>✕ {buildError}</div>}
            <Btn primary onClick={handleBuild} disabled={building || !can.build} style={{ width: "100%", textAlign: "center" }}>
              {building ? "Building…" : "⊞ Build Raw Message"}
            </Btn>
            <Btn onClick={resetAll} style={{ width: "100%", textAlign: "center" }}>↺ Reset All Fields</Btn>
          </div>
        </div>
      )}

      {/* Result */}
      {built && (
        <Card title="Generated Raw Message" badge={<Tag color={T.green} small>READY</Tag>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: T.bg, border: `1px solid ${T.green}44`, borderRadius: 6, padding: "12px 14px", fontSize: 11, wordBreak: "break-all", lineHeight: 2.2 }}>
              <span title="MTI" style={{ color: T.yellow, background: T.yellow + "18", padding: "2px 3px", borderRadius: 3 }}>{built.rawMessage?.substring(0, 4)}</span>
              <span title="Bitmap" style={{ color: T.accent, background: T.accent + "18", padding: "2px 3px", borderRadius: 3 }}>{built.bitmapHex}</span>
              <span style={{ color: T.text }}>{built.rawMessage?.substring(20)}</span>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 10, flexWrap: "wrap" }}>
              <span>MTI: <span style={{ color: T.yellow }}>{mti}</span> · {MTI_DESCRIPTIONS[mti]}</span>
              <span>Bitmap: <span style={{ color: T.accent }}>{built.bitmapHex}</span> · {built.bitsSet?.length} DEs</span>
              <span style={{ color: T.muted }}>Length: <span style={{ color: T.text }}>{built.totalLength} chars</span></span>
            </div>
            {/* Field breakdown */}
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, marginBottom: 8 }}>Field Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 60px", gap: 8, fontSize: 9, color: T.faint, borderBottom: `1px solid ${T.border}`, paddingBottom: 4, marginBottom: 4 }}>
                <span>DE</span><span>Name</span><span>Value</span><span>Encoding</span>
              </div>
              {built.fieldBreakdown?.map(p => (
                <div key={p.deNumber} style={{ display: "grid", gridTemplateColumns: "40px 1fr 160px 60px", gap: 8, fontSize: 10, padding: "3px 0", borderBottom: `1px solid ${T.border}11` }}>
                  <span style={{ color: T.accent, fontWeight: 700 }}>{p.deNumber}</span>
                  <span style={{ color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.fieldName}</span>
                  <span style={{ color: T.text }}>{p.rawValue}</span>
                  <span style={{ color: T.faint, fontSize: 9 }}>{p.encoding}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn primary onClick={() => navigate("/validator", { state: { rawMsg: built.rawMessage } })}>▶ Send to Validator</Btn>
              <Btn onClick={() => { navigator.clipboard?.writeText(built.rawMessage); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? "✓ Copied" : "⎘ Copy Raw"}
              </Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}