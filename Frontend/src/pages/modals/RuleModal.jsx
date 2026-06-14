import { useState } from "react";
import { T, SEV, MTIS } from "../../constants/theme";
import { useMutation } from "../../hooks/useApi";
import { createRule, updateRule } from "../../api/rules";
import { Btn } from "../../components/shared";
import { Modal, ModalFooter } from "./ProfileModal";

const SL = { width: "100%", background: T.surface2, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" };
const inp = (err) => ({ width: "100%", boxSizing: "border-box", background: "#070a0f", border: `1px solid ${err ? T.red : T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none" });

export default function RuleModal({ rule, profileId, mti, profiles, onClose, onSaved }) {
  const isEdit = !!rule;
  const [form, setForm] = useState({
    profileId: rule?.profileId || profileId || "",
    mti: rule?.mti || mti || "0200",
    deNumber: rule?.deNumber || "",
    fieldName: rule?.fieldName || "",
    isMandatory: rule?.isMandatory ?? false,
    minLength: rule?.minLength || "",
    maxLength: rule?.maxLength || "",
    dataType: rule?.dataType || "numeric",
    patternRegex: rule?.patternRegex || "",
    severity: rule?.severity || "CRITICAL",
    priority: rule?.priority || 1,
    // FIX: backend RuleDto returns `active`, not `isActive` — read from correct field
    isActive: rule?.active ?? true,
    effectiveFrom: rule?.effectiveFrom || new Date().toISOString().split("T")[0],
    effectiveTo: rule?.effectiveTo || "",
    description: rule?.description || "",
    allowedValues: rule?.allowedValues || [],
  });
  const [newVal, setNewVal] = useState("");
  const [errors, setErrors] = useState({});

  const { mutate: doCreate, loading: creating } = useMutation(createRule);
  // FIX: backend RuleDto uses `id`, not `ruleId`
  const { mutate: doUpdate, loading: updating } = useMutation(d => updateRule(rule.id, d));
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
        // UpdateRuleRequest — only editable fields, no profileId/mti/deNumber
        const updatePayload = {
          fieldName: form.fieldName,
          isMandatory: form.isMandatory,
          minLength: form.minLength || null,
          maxLength: form.maxLength || null,
          exactLength: form.exactLength || null,
          dataType: form.dataType,
          patternRegex: form.patternRegex || null,
          severity: form.severity,
          priority: form.priority,
          active: form.isActive,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          description: form.description || null,
          allowedValues: form.allowedValues,
        };
        await doUpdate(updatePayload);
      } else {
        // FIX: CreateRuleRequest requires profileName — look it up from profiles list
        const selectedProfile = profiles.find(
          p => p.id === +form.profileId || p.id === form.profileId
        );
        const createPayload = {
          profileId: +form.profileId,
          profileName: selectedProfile?.profileName || "",
          mti: form.mti,
          deNumber: form.deNumber,
          fieldName: form.fieldName,
          isMandatory: form.isMandatory,
          minLength: form.minLength || null,
          maxLength: form.maxLength || null,
          exactLength: form.exactLength || null,
          dataType: form.dataType,
          patternRegex: form.patternRegex || null,
          severity: form.severity,
          priority: form.priority,
          isActive: form.isActive,
          effectiveFrom: form.effectiveFrom || null,
          effectiveTo: form.effectiveTo || null,
          description: form.description || null,
          allowedValues: form.allowedValues,
        };
        await doCreate(createPayload);
      }
      onSaved(); onClose();
    } catch (err) { setErrors({ _form: err.message }); }
  };

  const addAllowed = () => {
    if (newVal.trim() && !form.allowedValues.includes(newVal.trim())) {
      set("allowedValues", [...form.allowedValues, newVal.trim()]);
      setNewVal("");
    }
  };

  const TYPES = ["numeric", "alpha", "alphanumeric", "binary", "special"];

  return (
    <Modal title={isEdit ? `Edit Rule — ${rule.deNumber}` : "Add Validation Rule"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        <Field label="Switch Profile" required error={errors.profileId}>
          <select value={form.profileId} onChange={e => set("profileId", +e.target.value)} style={SL}>
            <option value="">Select profile…</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.profileName}
              </option>
            ))}
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
            style={inp(errors.deNumber)}
            // FIX: deNumber cannot be changed on edit (it's part of the unique key)
            readOnly={isEdit} />
        </Field>

        <Field label="Priority / Order">
          <input type="number" value={form.priority} onChange={e => set("priority", +e.target.value)} min={1} style={inp()} />
        </Field>

        <Field label="Field Name" required error={errors.fieldName} style={{ gridColumn: "1/-1" }}>
          <input value={form.fieldName} onChange={e => set("fieldName", e.target.value)} placeholder="Transmission Date & Time" style={inp(errors.fieldName)} />
        </Field>

        <Field label="Min Length">
          <input type="number" value={form.minLength} onChange={e => set("minLength", +e.target.value)} min={0} style={inp()} />
        </Field>

        <Field label="Max Length" required error={errors.maxLength}>
          <input type="number" value={form.maxLength} onChange={e => set("maxLength", +e.target.value)} min={1} style={inp(errors.maxLength)} />
        </Field>

        <Field label="Data Type">
          <select value={form.dataType} onChange={e => set("dataType", e.target.value)} style={SL}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Severity">
          <select value={form.severity} onChange={e => set("severity", e.target.value)} style={SL}>
            {["CRITICAL", "WARNING", "INFO"].map(s => (
              <option key={s} value={s} style={{ color: SEV[s]?.text }}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Pattern / Regex" style={{ gridColumn: "1/-1" }}>
          <input value={form.patternRegex} onChange={e => set("patternRegex", e.target.value)} placeholder="^[0-9]{10}$" style={inp()} />
        </Field>

        <Field label="Effective From">
          <input type="date" value={form.effectiveFrom} onChange={e => set("effectiveFrom", e.target.value)} style={inp()} />
        </Field>

        <Field label="Effective To (leave blank = no expiry)">
          <input type="date" value={form.effectiveTo} onChange={e => set("effectiveTo", e.target.value)} style={inp()} />
        </Field>

        <Field label="Allowed Values (enum)" style={{ gridColumn: "1/-1" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && addAllowed()} placeholder="e.g. 000000"
              style={{ flex: 1, background: "#070a0f", border: `1px solid ${T.border}`, color: T.text, padding: "7px 10px", borderRadius: 5, fontFamily: "inherit", fontSize: 11, outline: "none" }} />
            <button onClick={addAllowed} style={{ background: T.surface2, border: `1px solid ${T.border}`, color: T.muted, padding: "7px 14px", borderRadius: 5, fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}>+ Add</button>
          </div>
          {form.allowedValues.length > 0
            ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "8px 10px", background: "#070a0f", border: `1px solid ${T.border}`, borderRadius: 5 }}>
              {form.allowedValues.map(v => (
                <span key={v} style={{ display: "flex", alignItems: "center", gap: 5, background: T.accent + "15", color: T.accent, padding: "3px 8px", borderRadius: 4, fontSize: 11 }}>
                  {v}
                  <button onClick={() => set("allowedValues", form.allowedValues.filter(x => x !== v))} style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            : <div style={{ fontSize: 10, color: T.faint }}>No values added — any value will be accepted</div>}
        </Field>

        <Field label="Description" style={{ gridColumn: "1/-1" }}>
          <textarea rows={2} value={form.description} onChange={e => set("description", e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", background: "#070a0f", border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 5, fontFamily: "inherit", fontSize: 11, outline: "none", resize: "vertical" }} />
        </Field>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ToggleSm label="Mandatory" active={form.isMandatory} onClick={() => set("isMandatory", !form.isMandatory)} />
          <ToggleSm label="Active" active={form.isActive} onClick={() => set("isActive", !form.isActive)} />
        </div>
      </div>

      {errors._form && <div style={{ background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>✕ {errors._form}</div>}

      <ModalFooter>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "💾 Save Rule"}</Btn>
      </ModalFooter>
    </Modal>
  );
}

function Field({ label, required, error, children, style: s }) {
  return (
    <div style={s}>
      <div style={{ fontSize: 10.5, color: T.muted, marginBottom: 5, fontWeight: 600 }}>{label}{required && <span style={{ color: T.red }}> *</span>}</div>
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