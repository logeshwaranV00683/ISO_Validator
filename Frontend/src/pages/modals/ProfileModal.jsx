import { useState } from "react";
import { T, ENV_COLORS } from "../../constants/theme";
import { useMutation } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { createProfile, updateProfile } from "../../api/profiles";
import { Btn, SmBtn, Label, Tag } from "../../components/shared";

const TIMEZONES = ["Asia/Kolkata", "UTC", "Asia/Singapore", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"];
const ENVS = ["PROD", "UAT", "DEV"];
const inputStyle = (err) => ({
  width: "100%", boxSizing: "border-box", background: "#070a0f",
  border: `1px solid ${err ? T.red : T.border}`, color: T.text,
  padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none",
});
const SL = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };

export default function ProfileModal({ profile, formats, onClose, onSaved }) {
  const isEdit = !!profile;
  const { user } = useAuth();
  const username = user?.username ?? "system";

  const [form, setForm] = useState({
    profileName: profile?.profileName || "",
    formatId: profile?.formatId || "",
    environment: profile?.environment || "UAT",
    host: profile?.host || "",
    port: profile?.port || "8583",
    timezone: profile?.timezone || "Asia/Kolkata",
    connectionTimeoutMs: profile?.connectionTimeoutMs || 30000,
    tpduEnabled: profile?.tpduEnabled || false,
    tpduValue: profile?.tpduValue || "",
    active: profile?.active ?? true,   // ✅ was isActive
    isDefault: profile?.isDefault ?? false,
  });
  const [errors, setErrors] = useState({});
  const { mutate: doCreate, loading: creating } = useMutation(createProfile);
  const { mutate: doUpdate, loading: updating } = useMutation((d) => updateProfile(profile.id, d)); // ✅ was profile.profileId
  const loading = creating || updating;

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.profileName.trim()) e.profileName = "Required";
    if (!form.formatId) e.formatId = "Required";
    if (!form.host.trim()) e.host = "Required";
    if (!form.port) e.port = "Required";
    if (form.tpduEnabled && !form.tpduValue.trim()) e.tpduValue = "Required when TPDU enabled";
    setErrors(e);
    return Object.keys(e).length === 0;
  };



  const handleSave = async () => {
    if (!validate()) return;
    try {
      const payload = {
        ...form,
        tpduValue: form.tpduEnabled
          ? form.tpduValue
          : null,
      };
      console.log("Profile Payload:", payload);
      isEdit ? await doUpdate(payload) : await doCreate(payload);
      onSaved(); onClose();
    } catch (err) {
      setErrors({ _form: err.message });
    }
  };



  return (
    <Modal title={isEdit ? `Edit — ${profile.profileName}` : "New Switch Profile"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Profile Name" required error={errors.profileName}>
          <input value={form.profileName} onChange={e => set("profileName", e.target.value)} placeholder="e.g. Visa Switch" style={inputStyle(errors.profileName)} />
        </Field>

        <Field label="Message Format" required error={errors.formatId}>
          <select
            value={form.formatId}
            onChange={(e) => set("formatId", Number(e.target.value))}
            style={SL}
          >
            <option value="">Select Format</option>

            {formats?.map((fmt) => (
              <option
                key={fmt.id || fmt.formatId}
                value={fmt.id || fmt.formatId}
              >
                {fmt.formatName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Environment" required>
          <div style={{ display: "flex", gap: 6 }}>
            {ENVS.map(env => (
              <button key={env} onClick={() => set("environment", env)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 5, fontFamily: "inherit", fontSize: 11, cursor: "pointer", border: `1px solid ${form.environment === env ? ENV_COLORS[env] : T.border}`, background: form.environment === env ? ENV_COLORS[env] + "22" : "transparent", color: form.environment === env ? ENV_COLORS[env] : T.muted }}>
                {env}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Timezone">
          <select value={form.timezone} onChange={e => set("timezone", e.target.value)} style={SL}>
            {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
          </select>
        </Field>

        <Field label="Host / IP" required error={errors.host}>
          <input value={form.host} onChange={e => set("host", e.target.value)} placeholder="10.0.1.10" style={inputStyle(errors.host)} />
        </Field>

        <Field label="Port" required error={errors.port}>
          <input value={form.port} onChange={e => set("port", e.target.value)} placeholder="8583" style={inputStyle(errors.port)} />
        </Field>

        <Field label="Connection Timeout (ms)">
          <input type="number" value={form.connectionTimeoutMs} onChange={e => set("connectionTimeoutMs", +e.target.value)} min={1000} step={1000} style={inputStyle()} />
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <ToggleRow label="Active" active={form.active} onClick={() => set("active", !form.active)} />
          <ToggleRow label="Default" active={form.isDefault} onClick={() => set("isDefault", !form.isDefault)} />
          <ToggleRow
            label="TPDU / Header"
            active={form.tpduEnabled}
            onClick={() => {
              const enabled = !form.tpduEnabled;

              set("tpduEnabled", enabled);

              if (!enabled) {
                set("tpduValue", "");
              }
            }}
          />
        </div>

        {form.tpduEnabled && (
          <Field label="TPDU Value (10 digits)" error={errors.tpduValue} style={{ gridColumn: "1/-1" }}>
            <input value={form.tpduValue} onChange={e => set("tpduValue", e.target.value)} placeholder="6000000000" maxLength={10} style={inputStyle(errors.tpduValue)} />
            <div style={{ fontSize: 9, color: T.faint, marginTop: 3 }}>10-digit header prefixed to every message on this connection</div>
          </Field>
        )}
      </div>

      {errors._form && <div style={{ marginTop: 10, background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>✕ {errors._form}</div>}

      <ModalFooter>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "💾 Save Profile"}</Btn>
      </ModalFooter>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, required, error, children, style: s }) {
  return (
    <div style={s}>
      <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 5, fontWeight: 600 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </div>
      {children}
      {error && <div style={{ fontSize: 10, color: T.red, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function ToggleRow({ label, active, onClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
      <span style={{ color: T.muted }}>{label}</span>
      <div onClick={onClick} style={{ width: 32, height: 17, borderRadius: 9, background: active ? T.green + "44" : T.faint + "44", border: `1px solid ${active ? T.green : T.faint}`, display: "flex", alignItems: "center", padding: "0 2px", cursor: "pointer" }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: active ? T.green : T.faint, marginLeft: active ? 14 : 0, transition: "margin 0.15s" }} />
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, width: 580, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({ children }) {
  return <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>{children}</div>;
}