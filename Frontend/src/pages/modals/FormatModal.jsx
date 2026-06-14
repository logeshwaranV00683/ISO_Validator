import { useState } from "react";
import { createFormat } from "../../api/profiles";
import { T } from "../../constants/theme";
import { Btn } from "../../components/shared";
import { Modal, ModalFooter } from "./ProfileModal";

const ENCODINGS = ["ASCII", "EBCDIC", "BCD"];
const inputStyle = (err) => ({
  width: "100%", boxSizing: "border-box", background: "#070a0f",
  border: `1px solid ${err ? T.red : T.border}`, color: T.text,
  padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none",
});
const SL = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };

function Field({ label, required, error, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 5, fontWeight: 600 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </div>
      {children}
      {error && <div style={{ fontSize: 10, color: T.red, marginTop: 3 }}>{error}</div>}
    </div>
  );
}

export default function FormatModal({ profiles = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    profileId: "",
    formatName: "",
    isoVersion: "ISO 8583-1:1987",
    encoding: "ASCII",
    mti: "0800",
    totalFields: 128,
    description: "",
    xmlContent: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [xmlFileName, setXmlFileName] = useState("");

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    set("xmlContent", text);
    setXmlFileName(file.name);
  };

  const validate = () => {
    const e = {};
    if (!form.profileId) e.profileId = "Required";
    if (!form.formatName.trim()) e.formatName = "Required";
    if (!form.xmlContent.trim()) e.xmlContent = "Required — upload an XML file";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await createFormat({ ...form, profileId: Number(form.profileId), totalFields: Number(form.totalFields) });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setErrors({ _form: err?.message || "Failed to create format" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="New Message Format" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        <Field label="Switch Profile" required error={errors.profileId}>
          <select value={form.profileId} onChange={e => set("profileId", e.target.value)} style={SL}>
            <option value="">Select Profile</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.profileName}</option>
            ))}
          </select>
        </Field>

        <Field label="Format Name" required error={errors.formatName}>
          <input value={form.formatName} onChange={e => set("formatName", e.target.value)} placeholder="e.g. Visa ISO 8583" style={inputStyle(errors.formatName)} />
        </Field>

        <Field label="ISO Version">
          <input value={form.isoVersion} onChange={e => set("isoVersion", e.target.value)} placeholder="ISO 8583-1:1987" style={inputStyle()} />
        </Field>

        <Field label="Encoding">
          <select value={form.encoding} onChange={e => set("encoding", e.target.value)} style={SL}>
            {ENCODINGS.map(enc => <option key={enc}>{enc}</option>)}
          </select>
        </Field>

        <Field label="MTI">
          <input value={form.mti} onChange={e => set("mti", e.target.value)} placeholder="0800" maxLength={4} style={inputStyle()} />
        </Field>

        <Field label="Total Fields">
          <input type="number" value={form.totalFields} onChange={e => set("totalFields", e.target.value)} min={64} max={192} style={inputStyle()} />
        </Field>

        <Field label="Description" style={{ gridColumn: "1/-1" }}>
          <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" style={inputStyle()} />
        </Field>

        <Field label="XML Config File" required error={errors.xmlContent} style={{ gridColumn: "1/-1" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", border: `1px dashed ${errors.xmlContent ? T.red : T.border}`, borderRadius: 6, fontSize: 11, color: T.muted }}>
            <span style={{ color: T.accent }}>📎 Choose XML</span>
            <span>{xmlFileName || "No file selected"}</span>
            <input type="file" accept=".xml" onChange={handleFile} style={{ display: "none" }} />
          </label>
          {form.xmlContent && (
            <div style={{ marginTop: 6, fontSize: 10, color: T.green }}>✓ XML loaded — {form.xmlContent.length} chars</div>
          )}
        </Field>

      </div>

      {errors._form && (
        <div style={{ marginTop: 10, background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>
          ✕ {errors._form}
        </div>
      )}

      <ModalFooter>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "💾 Save Format"}</Btn>
      </ModalFooter>
    </Modal>
  );
}