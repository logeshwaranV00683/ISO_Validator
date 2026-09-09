// 


import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { T } from "../constants/theme";
import { PageHeader, Card, Btn, SmBtn, Tag, Label, LoadingBar, ProgressBar, ErrorBanner } from "../components/shared";
import { uploadBrd, getBrdById, getBrdPreview, updateBrdPreview, confirmBrd, deleteBrd } from "../api/brd";
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

const getProgressMessage = (percentage) => {
  if (percentage >= 100) return "Completed";
  if (percentage >= 66) return "Analyzing with AI…";
  if (percentage >= 45) return "Understanding context…";
  if (percentage >= 31) return "Generating embeddings…";
  return "Extracting text…";
};

function StepIndicator({ step, unlockedSteps, onStepClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {STEPS.map((s, i) => {
        const unlocked = unlockedSteps.has(s.n);
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              onClick={() => unlocked && onStepClick(s.n)}
              title={unlocked ? `Go to ${s.label}` : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: unlocked ? "pointer" : "default",
                opacity: unlocked ? 1 : 0.5,
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: step >= s.n ? T.accent : T.surface2,
                color: step >= s.n ? "#fff" : T.text,
                border: `1px solid ${step >= s.n ? T.accent : T.blue}`,
                fontSize: 11, fontWeight: 700,
              }}>{s.n}</div>
              <span style={{ fontSize: 11, color: step === s.n ? T.text : T.text, fontWeight: step === s.n ? 700 : 400 }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 30, height: 1, background: step > s.n ? T.accent : T.border }} />}
          </div>
        );
      })}
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

  const BRD_STORAGE_KEY = "iso_brdimport_draft_v1";
  const [saved] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(BRD_STORAGE_KEY)) || {}; }
    catch { return {}; }
  });

  const [step, setStep] = useState(saved.step ?? 1);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileQueue, setFileQueue] = useState([]);
  const [uploading, setUploading] = useState(saved.uploading ?? false);
  const [pollMsgIdx, setPollMsgIdx] = useState(0);
  const [progressPercent, setProgressPercent] = useState(saved.progressPercent ?? 0);
  const [error, setError] = useState(null);

  const [brdId, setBrdId] = useState(saved.brdId ?? null);
  const [config, setConfig] = useState(saved.config ?? null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(saved.confirmResult ?? null);
  const [cancelling, setCancelling] = useState(false);

  const pollTimerRef = useRef(null);
  const msgTimerRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(BRD_STORAGE_KEY, JSON.stringify({
        step, uploading, progressPercent, brdId, config, confirmResult
      }));
    } catch {}
  }, [step, uploading, progressPercent, brdId, config, confirmResult]);

  useEffect(() => {
    if (step === 1 && uploading && brdId) {
      startPolling(brdId);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

   const resetWizard = () => {
    setStep(1);
    setUploading(false);
    setError(null);
    setBrdId(null);
    setConfig(null);
    setConfirmResult(null);
    setProgressPercent(0);

    setFileQueue(prev => {
      const [next, ...rest] = prev;
      setSelectedFile(next || null);
      return rest;
    });
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

  
  const pickFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const valid = [];
    for (const file of files) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "docx", "txt"].includes(ext)) {
        setError(`Unsupported file type: ${file.name}`);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;

    setError(null);
    if (!selectedFile) {
      setSelectedFile(valid[0]);
      setFileQueue(prev => [...prev, ...valid.slice(1)]);
    } else {
      setFileQueue(prev => [...prev, ...valid]);
    }
  };

    const removeQueuedFile = (index) => {
    setFileQueue(prev => prev.filter((_, i) => i !== index));
  };

  const removeSelectedFile = () => {
    // pull the next queued file into the active slot, same as resetWizard does
    setFileQueue(prev => {
      const [next, ...rest] = prev;
      setSelectedFile(next || null);
      return rest;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFiles(e.dataTransfer.files);
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
        if (typeof doc.progressPercent === "number") {
          setProgressPercent(doc.progressPercent);
        }
        if (doc.status === "COMPLETED") {
          clearInterval(pollTimerRef.current);
          clearInterval(msgTimerRef.current);
          setProgressPercent(100);
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

  const handleCancel = async () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (msgTimerRef.current) clearInterval(msgTimerRef.current);

    const idToCancel = brdId;
    setCancelling(true);
    try {
      if (idToCancel) {
        await deleteBrd(idToCancel);
      }
    } catch (err) {
      console.warn("Failed to cancel BRD document on server:", err);
    } finally {
      setCancelling(false);
      resetWizard();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setProgressPercent(0);
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

  
  
  // const handleUploadMerged = async () => {
  //   const allFiles = [selectedFile, ...fileQueue].filter(Boolean);
  //   if (!allFiles.length) return;
  //   setUploading(true);
  //   setError(null);
  //   setProgressPercent(0);
  //   try {
  //     const doc = await uploadBrdMulti(allFiles);
  //     setBrdId(doc.id);
  //     setFileQueue([]); 
  //     if (doc.status === "COMPLETED") {
  //       const preview = await getBrdPreview(doc.id);
  //       setConfig(preview);
  //       setUploading(false);
  //       setStep(2);
  //     } else if (doc.status === "FAILED") {
  //       setUploading(false);
  //       setError(doc.errorMessage || "BRD extraction failed. Please try again.");
  //     } else {
  //       startPolling(doc.id);
  //     }
  //   } catch (err) {
  //     setUploading(false);
  //     setError(err?.response?.data?.message || err.message || "Merged upload failed");
  //   }
  // };

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
      if (!result) {
        console.error("[BRD] confirmBrd resolved without a usable result. Check Network tab for the raw /ai/brd/{id}/confirm response.");
        setError("Confirm failed: server responded but returned no confirmation data. Check the Network tab or backend logs for details.");
        return;
      }
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

  const unlockedSteps = new Set([1]);
  if (config) unlockedSteps.add(2);
  if (confirmResult) unlockedSteps.add(3);
  if (uploading || confirming) unlockedSteps.clear();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Scoutie+Sans:ital,wght@0,200..800;1,200..800&display=swap');`}</style>

      <PageHeader title="BRD Import" sub="Upload a Business Requirements Document — AI extracts a switch profile, field definitions, and rules" />

      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
        <StepIndicator
          step={step}
          unlockedSteps={unlockedSteps}
          onStepClick={(n) => setStep(n)}
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={step === 1 ? handleUpload : undefined} />}

      {step === 1 && (
        <Card title="Upload BRD Document">
          <div
            onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { if (!uploading) handleDrop(e); else e.preventDefault(); }}
            style={{
              border: `2px dashed ${dragOver ? T.accent : T.border}`,
              borderRadius: 10, padding: "40px 20px", textAlign: "center",
              cursor:  uploading ? "default" : "pointer",
              background: dragOver ? T.accent + "0c" : T.surface2, transition: "all 0.15s",
            }}
          >
            <input
              ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" multiple style={{ display: "none" }}
              onChange={(e) => pickFiles(e.target.files)}
            />
            {/* <div style={{ fontSize: 28, marginBottom: 10, color: T.text }}> */}
            <img src="src/assets/upload-img.png" alt="" />
            {/* </div> */}
                        {selectedFile ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>{selectedFile.name}</div>
                  {!uploading && (
                    <span
                      onClick={(e) => { e.stopPropagation(); removeSelectedFile(); }}
                      style={{ cursor: "pointer", color: T.red, fontWeight: 700 }}
                      title="Remove this file"
                    >✕</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: T.text }}>Drag & drop a BRD document here, or click to browse</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Supports PDF, DOCX, TXT</div>
              </div>
            )}
          </div>

          
          {fileQueue.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, color: T.muted }}>
                Queued — will be processed after the current file:
              </div>
              {fileQueue.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 6,
                    padding: "6px 10px", fontSize: 11.5, color: T.text,
                  }}
                >
                  <span>{f.name} <span style={{ color: T.muted, fontSize: 10.5 }}>({(f.size / 1024).toFixed(1)} KB)</span></span>
                  {!uploading && (
                    <span
                      onClick={() => removeQueuedFile(i)}
                      style={{ cursor: "pointer", color: T.red, fontWeight: 700, marginLeft: 8 }}
                      title="Remove this file"
                    >✕</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                        {(selectedFile || fileQueue.length > 0) && (
              <SmBtn
                onClick={() => { setSelectedFile(null); setFileQueue([]); }}
                disabled={uploading}
              >
                ✕ Clear All{fileQueue.length > 0 ? ` (${fileQueue.length + 1})` : ""}
              </SmBtn>
            )}
            {uploading && (
              <SmBtn onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel"}
              </SmBtn>
            )}
                        {/* {fileQueue.length > 0 ? (
              <Btn primary onClick={handleUploadMerged} disabled={!selectedFile || uploading}>
                {uploading ? "Processing…" : `Merge & Extract (${fileQueue.length + 1} files)`}
              </Btn>
            ) : ( */}
              <Btn primary onClick={handleUpload} disabled={!selectedFile || uploading}>
                {uploading ? "Processing…" : "Upload & Extract"}
              </Btn>
            {/* )} */}
          </div>

                    {fileQueue.length > 0 && (
            <div style={{ fontSize: 10.5, color: T.text, marginTop: 6, textAlign: "right" }}>
              After this file finishes, the next queued file will load automatically for its own upload.
            </div>
          )}

          {uploading && (
            <div style={{ marginTop: 16 }}>
              <ProgressBar percent={progressPercent} text={getProgressMessage(progressPercent)} />
            </div>
          )}
        </Card>
      )}

      {step === 2 && config && (
        <>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <ConfidenceBadge confidence={config.confidence} />
              {config.warnings?.length > 0 && config.warnings.map((w, i) => (
                <Tag key={i} color={T.yellow} small>{w}</Tag>
              ))}
              <small style={{ fontSize: 13, color: T.blue, fontWeight: 420, fontFamily: "Scoutie Sans" }}>AI can make mistakes, Please verify once before proceeding to next step</small>
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

          <Card title="Packager XML" badge={config.embeddedPackagerXml ? "Found in document" : "Will be generated"}>
            {config.embeddedPackagerXml ? (
              <>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
                  This XML was found already written inside the uploaded BRD document and will be imported
                  as-is — it takes priority over the reconstructed XML that would otherwise be built from the
                  Field Definitions table below.
                </div>
                <textarea
                  readOnly
                  value={config.embeddedPackagerXml}
                  style={{
                    width: "100%", boxSizing: "border-box", minHeight: 260, resize: "vertical",
                    background: T.bg, border: `1px solid ${T.border}`, color: T.text,
                    padding: 10, borderRadius: 4, fontFamily: "monospace", fontSize: 11, lineHeight: 1.5,
                  }}
                />
              </>
            ) : (
              <div style={{ fontSize: 11, color: T.muted }}>
                No packager XML was found pasted inside this document, so one will be generated automatically
                from the Field Definitions table below when you confirm.
              </div>
            )}
          </Card>

          <Card title="Field Definitions" badge={`${config.fieldDefinitions?.length || 0} fields`}
            extra={<SmBtn onClick={addFieldDefRow}>+ Add Row</SmBtn>}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["DE Number", "Field Name", "Data Type", "Max Length", "Mandatory", "LLVAR", "LLLVAR", ""].map(h => (
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
                    <td style={{ padding: "4px 6px", width: 70, textAlign: "center" }}>
                      <input type="checkbox" checked={!!f.isLllvar} onChange={e => updateFieldDefRow(i, "isLllvar", e.target.checked)} />
                    </td>
                    <td style={{ padding: "4px 6px", width: 50 }}>
                      <SmBtn danger onClick={() => deleteFieldDefRow(i)} style={{color:T.text}}>Del</SmBtn>
                    </td>
                  </tr>
                ))}
                {!config.fieldDefinitions?.length && (
                  <tr><td colSpan={8} style={{ padding: 16, textAlign: "center", color: T.faint }}>No field definitions extracted</td></tr>
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

      {step === 3 && !confirmResult && (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 0", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 32, color: T.red }}>⚠</div>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>
              Something went wrong confirming this import — no confirmation details were returned.
            </div>
            <div style={{ fontSize: 12, color: T.faint }}>
              Check the audit log or try confirming again. If this keeps happening, the BRD's extracted data may be conflicting with an existing switch profile.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn onClick={() => setStep(2)}>Back to Review</Btn>
              <Btn onClick={resetWizard}>Start Over</Btn>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}