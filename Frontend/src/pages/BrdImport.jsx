import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../constants/theme";
import { PageHeader, Card, Btn, SmBtn, Tag, Label, LoadingBar, ErrorBanner } from "../components/shared";
import { uploadBrd, getBrdById, getBrdPreview, updateBrdPreview, confirmBrd } from "../api/brd";

const STEPS = [
  { n: 1, label: "Upload" },
  { n: 2, label: "Review" },
  { n: 3, label: "Done" },
];

const POLL_MESSAGES = [
  "Extracting text…",
  "Generating embeddings…",
  "Analyzing with AI…",
];

function StepIndicator({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {STEPS.map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: step >= s.n ? T.accent : T.surface2,
            color: step >= s.n ? "#fff" : T.faint,
            border: `1px solid ${step >= s.n ? T.accent : T.border}`,
            fontSize: 11, fontWeight: 700,
          }}>{s.n}</div>
          <span style={{ fontSize: 11, color: step === s.n ? T.text : T.faint, fontWeight: step === s.n ? 700 : 400 }}>{s.label}</span>
          {i < STEPS.length - 1 && <div style={{ width: 30, height: 1, background: step > s.n ? T.accent : T.border }} />}
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence }) {
  if (confidence === null || confidence === undefined) return null;
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? T.green : confidence >= 0.6 ? T.yellow : T.red;
  return <Tag color={color}>Confidence: {pct}%</Tag>;
}

export default function BrdImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pollMsgIdx, setPollMsgIdx] = useState(0);
  const [error, setError] = useState(null);

  const [brdId, setBrdId] = useState(null);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);

  const pollTimerRef = useRef(null);
  const msgTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  const resetWizard = () => {
    setStep(1);
    setSelectedFile(null);
    setUploading(false);
    setError(null);
    setBrdId(null);
    setConfig(null);
    setConfirmResult(null);
  };

  const pickFile = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx", "txt"].includes(ext)) {
      setError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const startPolling = useCallback((id) => {
    let idx = 0;
    setPollMsgIdx(0);
    msgTimerRef.current = setInterval(() => {
      idx = (idx + 1) % POLL_MESSAGES.length;
      setPollMsgIdx(idx);
    }, 2000);

    pollTimerRef.current = setInterval(async () => {
      try {
        const doc = await getBrdById(id);
        if (doc.status === "COMPLETED") {
          clearInterval(pollTimerRef.current);
          clearInterval(msgTimerRef.current);
          setUploading(false);
          const preview = await getBrdPreview(id);
          setConfig(preview);
          setStep(2);
        } else if (doc.status === "FAILED") {
          clearInterval(pollTimerRef.current);
          clearInterval(msgTimerRef.current);
          setUploading(false);
          setError(doc.errorMessage || "BRD extraction failed. Please try again.");
        }
      } catch (err) {
        clearInterval(pollTimerRef.current);
        clearInterval(msgTimerRef.current);
        setUploading(false);
        setError(err?.response?.data?.message || err.message || "Failed to check BRD status");
      }
    }, 3000);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const doc = await uploadBrd(selectedFile);
      setBrdId(doc.id);
      if (doc.status === "COMPLETED") {
        const preview = await getBrdPreview(doc.id);
        setConfig(preview);
        setUploading(false);
        setStep(2);
      } else if (doc.status === "FAILED") {
        setUploading(false);
        setError(doc.errorMessage || "BRD extraction failed. Please try again.");
      } else {
        startPolling(doc.id);
      }
    } catch (err) {
      setUploading(false);
      setError(err?.response?.data?.message || err.message || "Upload failed");
    }
  };

  // ── Step 2 edit helpers ─────────────────────────────────────────────────
  const updateProfileField = (field, value) => {
    setConfig(c => ({ ...c, switchProfile: { ...c.switchProfile, [field]: value } }));
  };

  const updateMti = (value) => setConfig(c => ({ ...c, mti: value }));

  const updateFieldDefRow = (idx, field, value) => {
    setConfig(c => {
      const rows = [...(c.fieldDefinitions || [])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...c, fieldDefinitions: rows };
    });
  };
  const addFieldDefRow = () => {
    setConfig(c => ({
      ...c,
      fieldDefinitions: [...(c.fieldDefinitions || []), {
        deNumber: "", fieldName: "", dataType: "numeric", maxLength: 1,
        isMandatory: false, isLlvar: false, isLllvar: false,
      }],
    }));
  };
  const deleteFieldDefRow = (idx) => {
    setConfig(c => ({ ...c, fieldDefinitions: (c.fieldDefinitions || []).filter((_, i) => i !== idx) }));
  };

  const updateRuleRow = (idx, field, value) => {
    setConfig(c => {
      const rows = [...(c.rules || [])];
      rows[idx] = { ...rows[idx], [field]: value };
      return { ...c, rules: rows };
    });
  };
  const addRuleRow = () => {
    setConfig(c => ({
      ...c,
      rules: [...(c.rules || []), {
        deNumber: "", fieldName: "", dataType: "numeric", severity: "WARNING",
        isMandatory: false, maxLength: 1,
      }],
    }));
  };
  const deleteRuleRow = (idx) => {
    setConfig(c => ({ ...c, rules: (c.rules || []).filter((_, i) => i !== idx) }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateBrdPreview(brdId, config);
      setConfig(saved);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      const result = await confirmBrd(brdId);
      setConfirmResult(result);
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Confirm failed");
    } finally {
      setConfirming(false);
    }
  };

  const cellInputStyle = {
    width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`,
    color: T.text, padding: "5px 7px", borderRadius: 4, fontFamily: "inherit", fontSize: 10.5, outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="BRD Import" sub="Upload a Business Requirements Document — AI extracts a switch profile, field definitions, and rules" />

      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
        <StepIndicator step={step} />
      </div>

      {error && <ErrorBanner message={error} onRetry={step === 1 ? handleUpload : undefined} />}

      {/* ── STEP 1: UPLOAD ───────────────────────────────────────────────── */}
      {step === 1 && (
        <Card title="Upload BRD Document">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? T.accent : T.border}`,
              borderRadius: 10, padding: "40px 20px", textAlign: "center", cursor: "pointer",
              background: dragOver ? T.accent + "0c" : T.surface2, transition: "all 0.15s",
            }}
          >
            <input
              ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <div style={{ fontSize: 28, marginBottom: 10, color: T.faint }}>⬆</div>
            {selectedFile ? (
              <div>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{selectedFile.name}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: T.text }}>Drag & drop a BRD document here, or click to browse</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Supports PDF, DOCX, TXT</div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            {selectedFile && !uploading && (
              <SmBtn onClick={() => setSelectedFile(null)}>✕ Clear</SmBtn>
            )}
            <Btn primary onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? "Processing…" : "Upload & Extract"}
            </Btn>
          </div>

          {uploading && (
            <div style={{ marginTop: 16 }}>
              <LoadingBar text={POLL_MESSAGES[pollMsgIdx]} />
            </div>
          )}
        </Card>
      )}

      {/* ── STEP 2: REVIEW ───────────────────────────────────────────────── */}
      {step === 2 && config && (
        <>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <ConfidenceBadge confidence={config.confidence} />
              {config.warnings?.length > 0 && config.warnings.map((w, i) => (
                <Tag key={i} color={T.yellow} small>{w}</Tag>
              ))}
            </div>
          </Card>

          <Card title="Switch Profile">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 12 }}>
              <div>
                <Label>Profile Name</Label>
                <input style={cellInputStyle} value={config.switchProfile?.profileName || ""}
                  onChange={e => updateProfileField("profileName", e.target.value)} />
              </div>
              <div>
                <Label>Description</Label>
                <input style={cellInputStyle} value={config.switchProfile?.description || ""}
                  onChange={e => updateProfileField("description", e.target.value)} />
              </div>
              <div>
                <Label>Environment</Label>
                <select style={cellInputStyle} value={config.switchProfile?.environment || "DEV"}
                  onChange={e => updateProfileField("environment", e.target.value)}>
                  <option value="DEV">DEV</option>
                  <option value="UAT">UAT</option>
                  <option value="PROD">PROD</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 12, width: 160 }}>
              <Label>MTI</Label>
              <input style={cellInputStyle} maxLength={4} value={config.mti || ""}
                onChange={e => updateMti(e.target.value)} placeholder="0200" />
            </div>
          </Card>

          <Card title="Field Definitions" badge={`${config.fieldDefinitions?.length || 0} fields`}
            extra={<SmBtn onClick={addFieldDefRow}>+ Add Row</SmBtn>}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["DE Number", "Field Name", "Data Type", "Max Length", "Mandatory", "LLVAR", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 6px", color: T.muted, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(config.fieldDefinitions || []).map((f, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                    <td style={{ padding: "4px 6px", width: 90 }}>
                      <input style={cellInputStyle} value={f.deNumber || ""} onChange={e => updateFieldDefRow(i, "deNumber", e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px" }}>
                      <input style={cellInputStyle} value={f.fieldName || ""} onChange={e => updateFieldDefRow(i, "fieldName", e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 130 }}>
                      <select style={cellInputStyle} value={f.dataType || "numeric"} onChange={e => updateFieldDefRow(i, "dataType", e.target.value)}>
                        <option value="numeric">numeric</option>
                        <option value="alpha">alpha</option>
                        <option value="alphanumeric">alphanumeric</option>
                        <option value="binary">binary</option>
                        <option value="special">special</option>
                      </select>
                    </td>
                    <td style={{ padding: "4px 6px", width: 90 }}>
                      <input type="number" style={cellInputStyle} value={f.maxLength ?? ""} onChange={e => updateFieldDefRow(i, "maxLength", +e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 70, textAlign: "center" }}>
                      <input type="checkbox" checked={!!f.isMandatory} onChange={e => updateFieldDefRow(i, "isMandatory", e.target.checked)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 70, textAlign: "center" }}>
                      <input type="checkbox" checked={!!f.isLlvar} onChange={e => updateFieldDefRow(i, "isLlvar", e.target.checked)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 50 }}>
                      <SmBtn danger onClick={() => deleteFieldDefRow(i)}>Del</SmBtn>
                    </td>
                  </tr>
                ))}
                {!config.fieldDefinitions?.length && (
                  <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: T.faint }}>No field definitions extracted</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card title="Rules" badge={`${config.rules?.length || 0} rules`}
            extra={<SmBtn onClick={addRuleRow}>+ Add Row</SmBtn>}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["DE Number", "Field Name", "Severity", "Mandatory", "Max Length", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 6px", color: T.muted, fontSize: 10, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(config.rules || []).map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}22` }}>
                    <td style={{ padding: "4px 6px", width: 90 }}>
                      <input style={cellInputStyle} value={r.deNumber || ""} onChange={e => updateRuleRow(i, "deNumber", e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px" }}>
                      <input style={cellInputStyle} value={r.fieldName || ""} onChange={e => updateRuleRow(i, "fieldName", e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 120 }}>
                      <select style={cellInputStyle} value={r.severity || "WARNING"} onChange={e => updateRuleRow(i, "severity", e.target.value)}>
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="WARNING">WARNING</option>
                        <option value="INFO">INFO</option>
                      </select>
                    </td>
                    <td style={{ padding: "4px 6px", width: 70, textAlign: "center" }}>
                      <input type="checkbox" checked={!!r.isMandatory} onChange={e => updateRuleRow(i, "isMandatory", e.target.checked)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 90 }}>
                      <input type="number" style={cellInputStyle} value={r.maxLength ?? ""} onChange={e => updateRuleRow(i, "maxLength", +e.target.value)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 50 }}>
                      <SmBtn danger onClick={() => deleteRuleRow(i)}>Del</SmBtn>
                    </td>
                  </tr>
                ))}
                {!config.rules?.length && (
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: T.faint }}>No rules extracted</td></tr>
                )}
              </tbody>
            </table>
          </Card>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <SmBtn onClick={() => { resetWizard(); }}>✕ Cancel</SmBtn>
            <Btn onClick={handleSaveChanges} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Btn>
            <Btn primary onClick={handleConfirm} disabled={confirming}>{confirming ? "Importing…" : "Confirm & Import"}</Btn>
          </div>
        </>
      )}

      {/* ── STEP 3: SUCCESS ──────────────────────────────────────────────── */}
      {step === 3 && confirmResult && (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 32, color: T.green }}>✓</div>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>
              Switch profile "{confirmResult.profileName}" created, {confirmResult.fieldDefinitionsImported} field definitions imported, {confirmResult.rulesImported} rules imported
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn primary onClick={() => navigate("/profiles")}>Go to Profiles</Btn>
              <Btn onClick={resetWizard}>Import Another</Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}