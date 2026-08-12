import { useState } from "react";
import { T, MTIS } from "../../constants/theme";
import { useMutation } from "../../hooks/useApi";
import { createFieldDef, updateFieldDef } from "../../api/rules";
import { Btn } from "../../components/shared";
import { Modal, ModalFooter } from "./ProfileModal";

const TYPES = ["numeric", "alpha", "alphanumeric", "binary", "special"];
const inp = (err) => ({ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${err ? T.red : T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" });
const SL = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };

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

function ToggleSm({ label, active, onClick, disabled = false }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${active ? T.accent + "55" : T.border}`, borderRadius: 5, padding: "5px 10px", cursor: disabled ? "default" : "pointer",
opacity: disabled ? 0.7 : 1, fontFamily: "inherit", color: active ? T.accent : T.muted, fontSize: 11 }}>
      <div style={{ width: 14, height: 8, borderRadius: 4, background: active ? T.accent + "44" : T.surface2, border: `1px solid ${active ? T.accent : T.faint}`, display: "flex", alignItems: "center", padding: "0 1px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? T.accent : T.faint, marginLeft: active ? 6 : 0, transition: "margin 0.15s" }} />
      </div>
      {label}
    </button>
  );
}

export default function FieldDefModal({ def, profileId, mti, profiles = [], onClose, onSaved }) {
  const isEdit = !!def;

  const [form, setForm] = useState({
    profileId: def?.profileId || profileId || "",
    mti: def?.mti || mti || "0200",
    deNumber: def?.deNumber || "",
    fieldName: def?.fieldName || "",
    dataType: def?.dataType || "numeric",
    maxLength: def?.maxLength || "",
    isLlvar: def?.isLlvar ?? false,
    isLllvar: def?.isLllvar ?? false,
    isMandatory: def?.isMandatory ?? false,
    placeholderValue: def?.placeholderValue || "",
    displayOrder: def?.displayOrder ?? 0,
    isBuilderVisible: def?.isBuilderVisible ?? true,
    isActive: def?.isActive ?? true,
    description: def?.description || "",
  });

  const [errors, setErrors] = useState({});
  const { mutate: doCreate, loading: creating } = useMutation(createFieldDef);
  const { mutate: doUpdate, loading: updating } = useMutation(d => updateFieldDef(def?.id, d));
  const loading = creating || updating;

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.profileId) e.profileId = "Required";
    if (!form.deNumber.trim()) e.deNumber = "Required";
    if (!form.fieldName.trim()) e.fieldName = "Required";
    if (!form.maxLength) e.maxLength = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (isEdit) {
        await doUpdate({
          fieldName: form.fieldName,
          dataType: form.dataType,
          maxLength: Number(form.maxLength),
          isLlvar: form.isLlvar,
          isLllvar: form.isLllvar,
          isMandatory: form.isMandatory,
          placeholderValue: form.placeholderValue || null,
          displayOrder: form.displayOrder,
          isBuilderVisible: form.isBuilderVisible,
          isActive: form.isActive,
          description: form.description || null,
        });
      } else {
        const selectedProfile = profiles.find(p => p.id === +form.profileId || p.id === form.profileId);
        await doCreate({
          profileId: Number(form.profileId),
          profileName: selectedProfile?.profileName || "",
          mti: form.mti,
          deNumber: form.deNumber,
          fieldName: form.fieldName,
          dataType: form.dataType,
          maxLength: Number(form.maxLength),
          isLlvar: form.isLlvar,
          isLllvar: form.isLllvar,
          isMandatory: form.isMandatory,
          placeholderValue: form.placeholderValue || null,
          displayOrder: form.displayOrder,
          isBuilderVisible: form.isBuilderVisible,
          isActive: form.isActive,
          description: form.description || null,
        });
      }
      onSaved(); onClose();
    } catch (err) {
      setErrors({ _form: err.message });
    }
  };

  return (
    <Modal title={isEdit ? `Edit Field — ${def.deNumber}` : "Add Field Definition"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        <Field label="Message Profile" required error={errors.profileId}>
          {/* <select value={form.profileId} onChange={e => set("profileId", e.target.value)} style={SL} disabled={isEdit}>
            <option value="">Select profile…</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.profileName}</option>)}
          </select> */}
          <select
            value={form.profileId}
            style={SL}
            disabled
          >
            <option value="">Select profile…</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.profileName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="MTI" required>
          {/* <select value={form.mti} onChange={e => set("mti", e.target.value)} style={{ ...SL, maxHeight: 120, overflowY: "auto" }} size={1}> */}
          <select
  value={form.mti}
  style={{ ...SL, maxHeight: 120, overflowY: "auto" }}
  size={1}
  disabled
>
            {MTIS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>

        <Field label="DE Number (e.g. DE7)" required error={errors.deNumber}>
          {/* <input value={form.deNumber} onChange={e => set("deNumber", e.target.value)} placeholder="DE7"
            style={inp(errors.deNumber)} readOnly={isEdit} /> */}
            <input
  value={form.deNumber}
  placeholder="DE7"
  style={inp(errors.deNumber)}
  readOnly
/>
        </Field>

        <Field label="Display Order">
          <input type="number" value={form.displayOrder} onChange={e => set("displayOrder", +e.target.value)} min={0} style={inp()} />
          {/* <input
  type="number"
  value={form.displayOrder}
  min={0}
  style={inp()}
  readOnly
/> */}
        </Field>

        <Field label="Field Name" required error={errors.fieldName} style={{ gridColumn: "1/-1" }}>
          {/* <input value={form.fieldName} onChange={e => set("fieldName", e.target.value)} placeholder="Primary Account Number" style={inp(errors.fieldName)} /> */}
          <input
  value={form.fieldName}
  placeholder="Primary Account Number"
  style={inp(errors.fieldName)}
  readOnly
/>
        </Field>

        <Field label="Data Type">
          {/* <select value={form.dataType} onChange={e => set("dataType", e.target.value)} style={SL}> */}
          <select
  value={form.dataType}
  style={SL}
  disabled
>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Max Length" required error={errors.maxLength}>
          {/* <input type="number" value={form.maxLength} onChange={e => set("maxLength", e.target.value)} min={1} style={inp(errors.maxLength)} /> */}
          <input
  type="number"
  value={form.maxLength}
  min={1}
  style={inp(errors.maxLength)}
  readOnly
/>
        </Field>

        <Field label="Placeholder Value">
          <input value={form.placeholderValue} onChange={e => set("placeholderValue", e.target.value)} placeholder="e.g. 4111111111111111" style={inp()} />
        </Field>

        <Field label="Description" style={{ gridColumn: "1/-1" }}>
          <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" style={inp()} />
        </Field>

        <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, flexWrap: "wrap" }}>
         <ToggleSm
  label="LLVAR"
  active={form.isLlvar}
  onClick={() => {
    set("isLlvar", !form.isLlvar);

    if (!form.isLlvar) {
      set("isLllvar", false);
    }
  }}
/>

<ToggleSm
  label="LLLVAR"
  active={form.isLllvar}
  onClick={() => {
    set("isLllvar", !form.isLllvar);

    if (!form.isLllvar) {
      set("isLlvar", false);
    }
  }}
/>
          <ToggleSm label="Mandatory" active={form.isMandatory} onClick={() => set("isMandatory", !form.isMandatory)} />
          <ToggleSm label="Builder Visible" active={form.isBuilderVisible} onClick={() => set("isBuilderVisible", !form.isBuilderVisible)} />
          <ToggleSm label="Active" active={form.isActive} onClick={() => set("isActive", !form.isActive)} />
        </div>

      </div>

      {errors._form && (
        <div style={{ background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>
          ✕ {errors._form}
        </div>
      )}

      <ModalFooter>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save Field"}</Btn>
      </ModalFooter>
    </Modal>
  );
}