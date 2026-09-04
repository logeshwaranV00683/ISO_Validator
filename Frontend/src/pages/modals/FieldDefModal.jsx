import { useState } from "react";
import { T,MTIS } from "../../constants/theme";
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

function ToggleSm({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${active ? T.accent + "55" : T.border}`, borderRadius: 5, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit", color: active ? T.accent : T.muted, fontSize: 11 }}>
      <div style={{ width: 14, height: 8, borderRadius: 4, background: active ? T.accent + "44" : T.surface2, border: `1px solid ${active ? T.accent : T.faint}`, display: "flex", alignItems: "center", padding: "0 1px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? T.accent : T.faint, marginLeft: active ? 6 : 0, transition: "margin 0.15s" }} />
      </div>
      {label}
    </button>
  );
}

const SEV_COLOR = { CRITICAL: T.red, WARNING: T.amber || "#c97a1a", INFO: T.blue };

function RuleReadOnlyCard({ rule }) {
  const sevColor = SEV_COLOR[rule.severity] || T.muted;
  return (
    <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
      <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ color: T.muted, padding: "3px 0", width: "38%" }}>Min / Max length</td>
            <td style={{ padding: "3px 0", color: T.text }}>
              {rule.minLength ?? "—"} – {rule.maxLength ?? rule.exactLength ?? "—"}
            </td>
          </tr>
          <tr>
            <td style={{ color: T.muted, padding: "3px 0" }}>Pattern</td>
            <td style={{ padding: "3px 0", color: T.text, fontFamily: "monospace" }}>
              {rule.patternRegex || "—"}
            </td>
          </tr>
          <tr>
            <td style={{ color: T.muted, padding: "3px 0" }}>Allowed values</td>
            <td style={{ padding: "3px 0", color: T.text }}>
              {rule.allowedValues?.length ? rule.allowedValues.join(", ") : "Any (no enum set)"}
            </td>
          </tr>
          <tr>
            <td style={{ color: T.muted, padding: "3px 0" }}>Severity</td>
            <td style={{ padding: "3px 0" }}>
              <span style={{ background: sevColor + "22", color: sevColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
                {rule.severity}
              </span>
            </td>
          </tr>
          <tr>
            <td style={{ color: T.muted, padding: "3px 0" }}>Effective</td>
            <td style={{ padding: "3px 0", color: T.text }}>
              {rule.effectiveFrom || "—"} → {rule.effectiveTo || "no expiry"}
            </td>
          </tr>
          <tr>
            <td style={{ color: T.muted, padding: "3px 0" }}>Active</td>
            <td style={{ padding: "3px 0", color: rule.active ? T.green : T.faint }}>
              {rule.active ? "✓ Active" : "✗ Inactive"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function FieldDefModal({ def, rules = [], profileId, mti, profiles = [], onClose, onSaved }) {
  const isEdit = !!def;

  const [form, setForm] = useState({
    profileId:       def?.profileId   || profileId || "",
    mti:             def?.mti         || mti       || "0200",
    deNumber:        def?.deNumber    || "",
    fieldName:       def?.fieldName   || "",
    dataType:        def?.dataType    || "numeric",
    maxLength:       def?.maxLength   || "",
    isLlvar:         def?.isLlvar     ?? false,
    isLllvar:        def?.isLllvar    ?? false,
    isMandatory:     def?.isMandatory ?? false,
    placeholderValue:def?.placeholderValue || "",
    displayOrder:    def?.displayOrder ?? 0,
    isBuilderVisible:def?.isBuilderVisible ?? true,
    isActive:        def?.isActive    ?? true,
    description:     def?.description || "",
  });

  const [errors, setErrors] = useState({});
  const { mutate: doCreate, loading: creating } = useMutation(createFieldDef);
  const { mutate: doUpdate, loading: updating } = useMutation(d => updateFieldDef(def?.id, d));
  const loading = creating || updating;

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.profileId)          e.profileId  = "Required";
    if (!form.deNumber.trim())    e.deNumber   = "Required";
    if (!form.fieldName.trim())   e.fieldName  = "Required";
    if (!form.maxLength)          e.maxLength  = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (isEdit) {
        await doUpdate({
          fieldName:        form.fieldName,
          dataType:         form.dataType,
          maxLength:        Number(form.maxLength),
          isLlvar:          form.isLlvar,
          isLllvar:         form.isLllvar,
          isMandatory:      form.isMandatory,
          placeholderValue: form.placeholderValue || null,
          displayOrder:     form.displayOrder,
          isBuilderVisible: form.isBuilderVisible,
          isActive:         form.isActive,
          description:      form.description || null,
        });
      } else {
        const selectedProfile = profiles.find(p => p.id === +form.profileId || p.id === form.profileId);
        await doCreate({
          profileId:        Number(form.profileId),
          profileName:      selectedProfile?.profileName || "",
          mti:              form.mti,
          deNumber:         form.deNumber,
          fieldName:        form.fieldName,
          dataType:         form.dataType,
          maxLength:        Number(form.maxLength),
          isLlvar:          form.isLlvar,
          isLllvar:         form.isLllvar,
          isMandatory:      form.isMandatory,
          placeholderValue: form.placeholderValue || null,
          displayOrder:     form.displayOrder,
          isBuilderVisible: form.isBuilderVisible,
          isActive:         form.isActive,
          description:      form.description || null,
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
          <select value={form.profileId} onChange={e => set("profileId", e.target.value)} style={SL} disabled={isEdit}>
            <option value="">Select profile…</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.profileName}</option>)}
          </select>
        </Field>

        <Field label="MTI" required>
                  <select value={form.mti} onChange={e => set("mti", e.target.value)} style={{ ...SL, maxHeight: 120, overflowY: "auto" }} size={1}>
                    {MTIS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </Field>

        <Field label="DE Number (e.g. DE7)" required error={errors.deNumber}>
          <input value={form.deNumber} onChange={e => set("deNumber", e.target.value)} placeholder="DE7"
            style={inp(errors.deNumber)} readOnly={isEdit} />
        </Field>

        <Field label="Display Order">
          <input type="number" value={form.displayOrder} onChange={e => set("displayOrder", +e.target.value)} min={0} style={inp()} />
        </Field>

        <Field label="Field Name" required error={errors.fieldName} style={{ gridColumn: "1/-1" }}>
          <input value={form.fieldName} onChange={e => set("fieldName", e.target.value)} placeholder="Primary Account Number" style={inp(errors.fieldName)} />
        </Field>

        <Field label="Data Type">
          <select value={form.dataType} onChange={e => set("dataType", e.target.value)} style={SL}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Max Length" required error={errors.maxLength}>
          <input type="number" value={form.maxLength} onChange={e => set("maxLength", e.target.value)} min={1} style={inp(errors.maxLength)} />
        </Field>

        <Field label="Placeholder Value">
          <input value={form.placeholderValue} onChange={e => set("placeholderValue", e.target.value)} placeholder="e.g. 4111111111111111" style={inp()} />
        </Field>

        <Field label="Description" style={{ gridColumn: "1/-1" }}>
          <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" style={inp()} />
        </Field>

        <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ToggleSm label="LLVAR"           active={form.isLlvar}          onClick={() => set("isLlvar", !form.isLlvar)} />
          <ToggleSm label="LLLVAR"          active={form.isLllvar}         onClick={() => set("isLllvar", !form.isLllvar)} />
          <ToggleSm label="Mandatory"       active={form.isMandatory}      onClick={() => set("isMandatory", !form.isMandatory)} />
          <ToggleSm label="Builder Visible" active={form.isBuilderVisible} onClick={() => set("isBuilderVisible", !form.isBuilderVisible)} />
          <ToggleSm label="Active"          active={form.isActive}         onClick={() => set("isActive", !form.isActive)} />
        </div>

      </div>

      {isEdit && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: `1px solid ${T.border}`, paddingTop: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text }}>Validation rules</span>
            <span style={{ fontSize: 10, color: T.faint }}>read-only, managed in Rules Manager</span>
          </div>

          {rules.length === 0 && (
            <div style={{ fontSize: 11, color: T.faint, padding: "6px 0" }}>
              No validation rules configured for this field.
            </div>
          )}

          {rules.map(r => <RuleReadOnlyCard key={r.id} rule={r} />)}
        </div>
      )}

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