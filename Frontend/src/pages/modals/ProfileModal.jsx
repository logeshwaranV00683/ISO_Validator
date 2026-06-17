import { useState } from "react";
import { T } from "../../constants/theme";
import { useMutation } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { createProfile, updateProfile } from "../../api/profiles";
import { Btn, SmBtn, Label, Tag } from "../../components/shared";

const TIMEZONES = ["Asia/Kolkata", "UTC", "Asia/Singapore", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"];
const inputStyle = (err, disabled) => ({
  width: "100%", boxSizing: "border-box", background: disabled ? T.surface : T.bg,
  border: `1px solid ${err ? T.red : T.border}`, color: disabled ? T.muted : T.text,
  padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none",
  cursor: disabled ? "not-allowed" : "text", opacity: disabled ? 0.6 : 1,
});
const SL = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };

export default function ProfileModal({ profile, onClose, onSaved }) {
  const isEdit = !!profile;
  const { user } = useAuth();
  const username = user?.username ?? "system";

  const [form, setForm] = useState({
    profileName: profile?.profileName || "",
    description: profile?.description || "",
    host: profile?.host || "127.0.0.1",
    port: profile?.port || 8583,
    timezone: profile?.timezone || "Asia/Kolkata",
    connectionTimeoutMs: profile?.connectionTimeoutMs || 30000,
    tpduEnabled: profile?.tpduEnabled || false,
    tpduValue: profile?.tpduValue || "",
    isActive: profile?.isActive ?? profile?.active ?? true,
    isDefault: profile?.isDefault ?? false,
  });
  const [errors, setErrors] = useState({});
  const { mutate: doCreate, loading: creating } = useMutation(createProfile);
  const { mutate: doUpdate, loading: updating } = useMutation((d) => updateProfile(profile.id, d));
  const loading = creating || updating;

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(e => ({ ...e, [key]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.profileName.trim()) e.profileName = "Required";
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
        profileName: form.profileName,
        description: form.description,
        environment: "PROD",
        host: form.host,
        port: Number(form.port),
        timezone: form.timezone,
        connectionTimeoutMs: form.connectionTimeoutMs,
        tpduEnabled: form.tpduEnabled,
        tpduValue: form.tpduEnabled ? form.tpduValue : null,
        isActive: form.isActive,
        isDefault: form.isDefault,
      };
      console.log("Profile Payload:", payload);
      isEdit ? await doUpdate(payload) : await doCreate(payload);
      onSaved(); onClose();
    } catch (err) {
      setErrors({ _form: err.message });
    }
  };

  return (
    <Modal title={isEdit ? `Edit — ${profile.profileName}` : "New Message Profile"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Profile Name" required error={errors.profileName}>
          <input value={form.profileName} onChange={e => set("profileName", e.target.value)} placeholder="e.g. Visa Production" style={inputStyle(errors.profileName, false)} />
        </Field>

        <Field label="Description">
          <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" style={inputStyle(false, false)} />
        </Field>

        <Field label="Timezone">
          <select value={form.timezone} onChange={e => set("timezone", e.target.value)} style={SL}>
            {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
          </select>
        </Field>

        <Field label="Host / IP" required error={errors.host}>
            <div style={{ position: "relative" }}>
              <input
                value={form.host}
                placeholder="127.0.0.1"
                disabled
                style={{ ...inputStyle(errors.host, true), cursor: "not-allowed" }}
              />
              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: T.faint }}>locked</span>
            </div>
          </Field>

          <Field label="Port" required error={errors.port}>
            <div style={{ position: "relative" }}>
              <input
                value={form.port}
                placeholder="8583"
                disabled
                style={{ ...inputStyle(errors.port, true), cursor: "not-allowed" }}
              />
              <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: T.faint }}>locked</span>
            </div>
          </Field>

        <Field label="Connection Timeout (ms)">
          <input type="number" value={form.connectionTimeoutMs} onChange={e => set("connectionTimeoutMs", +e.target.value)} min={1000} step={1000} style={inputStyle()} />
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
          <ToggleRow label="Active" active={form.isActive} onClick={() => set("isActive", !form.isActive)} />
          <ToggleRow label="Default" active={form.isDefault} onClick={() => set("isDefault", !form.isDefault)} />
          <ToggleRow
            label="TPDU / Header"
            active={form.tpduEnabled}
            onClick={() => {
              const enabled = !form.tpduEnabled;
              set("tpduEnabled", enabled);
              if (!enabled) set("tpduValue", "");
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