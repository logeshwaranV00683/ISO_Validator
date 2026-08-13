import { useState } from "react";
import { T } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useApi, useMutation } from "../hooks/useApi";
import { getProfiles } from "../api/profiles";
import {
  getAiConfig, updateAiConfig, updateAiConfigBulk, getAvailableModels,
  getGlobalPrompt, updateGlobalPrompt, testPrompt,
  getPromptVersions, rollbackPrompt, getAiLogs,
  getProfilePrompt, upsertProfilePrompt, deleteProfilePrompt,
  getTemplatesByScope, createTemplate, updateTemplate,
  getTemplateVersions, rollbackTemplate
} from "../api/ai";
import {
  PageHeader, Card, Tag, SmBtn, Btn, RoleBanner,
  LoadingBar, ErrorBanner, Label, Th
} from "../components/shared";

const CONFIG_KEY_MAP = {
  "ollama.host": "ollamaHost",
  "ollama.model": "activeModel",
  "ollama.temperature": "temperature",
  "ollama.max.tokens": "maxTokens",
  "ollama.timeout.ms": "timeoutMs",
  "ollama.retry.count": "retryCount",
  "ollama.fallback": "fallbackBehavior",
};

const REVERSE_CONFIG_KEY_MAP = {
  ollamaHost: "ollama.host",
  activeModel: "ollama.model",
  temperature: "ollama.temperature",
  maxTokens: "ollama.max.tokens",
  timeoutMs: "ollama.timeout.ms",
  retryCount: "ollama.retry.count",
  fallbackBehavior: "ollama.fallback",
};

export default function AI() {
  const { can } = useAuth();
  const [tab, setTab] = useState("config");
  const [testOutput, setTestOutput] = useState(null);
  const [testing, setTesting] = useState(false);
  const [versions, setVersions] = useState(null);
  const [globalContent, setGlobalContent] = useState(null);
  const [configForm, setConfigForm] = useState(null);

  const { data: cfg, loading: cfgLoad, error: cfgErr, refetch: cfgRefetch } = useApi(getAiConfig);
  const { data: models, loading: modLoad } = useApi(getAvailableModels);

  const modelList = Array.isArray(models)
    ? models
    : models?.content || models?.models || [];

  const { data: prompt, loading: pLoad, refetch: pRefetch } = useApi(getGlobalPrompt);
  const { data: profiles } = useApi(getProfiles);
  const { data: logs, loading: logLoad } = useApi(() => getAiLogs({ page: 0, size: 20 }));

  const { mutate: doUpdatePrompt } = useMutation((c, n) => updateGlobalPrompt(c, n));
  const { mutate: doTestPrompt } = useMutation(testPrompt);
  const { mutate: doRollback } = useMutation((id, v) => rollbackPrompt(id, v));

  if (cfg && !configForm && Array.isArray(cfg)) {
    const flat = {};
    cfg.forEach(item => {
      const formKey = CONFIG_KEY_MAP[item.key];
      if (formKey) flat[formKey] = item.value;
    });
    setConfigForm(flat);
  }

  const handleSaveConfig = async () => {
    try {
      const payload = Object.entries(REVERSE_CONFIG_KEY_MAP)
        .filter(([formKey]) => configForm[formKey] !== undefined)
        .map(([formKey, configKey]) => ({ key: configKey, value: String(configForm[formKey]) }));

      await updateAiConfigBulk(payload);
      cfgRefetch();
      alert("Config saved!");
    } catch (e) {
      alert("Failed to save config: " + (e?.response?.data?.message || e.message));
    }
  };

  function formatBytes(bytes) {
    if (!bytes) return "—";
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return gb.toFixed(2) + " GB";
    const mb = bytes / (1024 ** 2);
    return mb.toFixed(1) + " MB";
  }

  const handleSavePrompt = async () => {
  const content = globalContent !== null ? globalContent : (prompt?.promptTemplate || "");
  await doUpdatePrompt(content, "Updated via UI");
  await pRefetch();
  setGlobalContent(null);
    if (versions) {
      const v = await getPromptVersions(prompt.id);
      setVersions(v);
    }
    alert("Prompt saved!");
  };

  const handleTestPrompt = async () => {
    setTesting(true); setTestOutput(null);
    try {
      const res = await doTestPrompt({ templateContent: globalContent || prompt?.promptTemplate, sampleMti: "0200", sampleProfileName: "Visa Switch", sampleErrors: ["DE7 missing", "DE4 length error"] });
      setTestOutput(res);
    } finally { setTesting(false); }
  };

 const loadVersions = async () => {
  if (versions) { setVersions(null); return; } 
  if (!prompt?.id) return;
  const v = await getPromptVersions(prompt.id);
  setVersions(v);
};

  const TABS = [["config", "Global Config"], ["profiles", "Per-Profile Prompts"], ["brd", "BRD Parser"], ["logs", "AI Logs"]];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="AI Settings" sub="Ollama config, prompt templates, fallback behavior — all stored in DB" />
      {!can.edit && <RoleBanner roleNeeded="ADMIN" action="edit AI settings" />}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: "none", border: "none", borderBottom: `2px solid ${tab === id ? T.accent : "transparent"}`, color: tab === id ? T.accent : T.muted, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, cursor: "pointer", marginBottom: -1 }}>{label}</button>
        ))}
      </div>

      {/* Config tab */}
      {tab === "config" && (<>
        {cfgLoad && <LoadingBar text="Loading AI config…" />}
        {cfgErr && <ErrorBanner message={cfgErr} onRetry={cfgRefetch} />}

        {configForm && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card title="Model Configuration">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { key: "ollamaHost", label: "Ollama Host", type: "text" },
                  { key: "activeModel", label: "Active Model", type: "text" },
                  { key: "temperature", label: "Temperature", type: "number" },
                  { key: "maxTokens", label: "Max Tokens", type: "number" },
                  { key: "timeoutMs", label: "Timeout (ms)", type: "number" },
                  { key: "retryCount", label: "Retry Count", type: "number" },
                ].map(f => (
                  <div key={f.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ width: 140, color: T.muted, fontSize: 11, flexShrink: 0 }}>{f.label}</span>
                    <input type={f.type} value={configForm[f.key] || ""} disabled={!can.edit}
                      onChange={e => setConfigForm(x => ({ ...x, [f.key]: e.target.value }))}
                      style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "6px 10px", borderRadius: 4, fontFamily: "inherit", fontSize: 11, outline: "none", opacity: can.edit ? 1 : 0.6 }} />
                  </div>
                ))}
                <div>
                  <Label>Fallback Behavior</Label>
                  <select value={configForm.fallbackBehavior || ""} disabled={!can.edit}
                    onChange={e => setConfigForm(x => ({ ...x, fallbackBehavior: e.target.value }))}
                    style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "8px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 11, outline: "none", opacity: can.edit ? 1 : 0.6 }}>
                    <option value="SKIP_AI">SKIP_AI — return validation only</option>
                    <option value="RETURN_ERROR">RETURN_ERROR — fail the request</option>
                    <option value="RETRY">RETRY — retry N times then skip</option>
                  </select>
                </div>
                {can.edit && <Btn primary onClick={handleSaveConfig}>Save Config</Btn>}
              </div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Card title="Available Models" badge="Ollama local">
                {modLoad && <LoadingBar text="Fetching models…" />}
                {modelList.map((m, i) => (
                  <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < modelList.length - 1 ? `1px solid ${T.border}22` : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: m.name === configForm?.activeModel ? T.accent : T.text }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: T.faint }}>{formatBytes(m.size)}</div>
                    </div>
                    {m.name === configForm?.activeModel
                      ? <span style={{ fontSize: 10, color: T.green }}>● Active</span>
                      : can.edit && <SmBtn>To Active change in the config</SmBtn>}
                  </div>
                ))}
              </Card>

              <Card title="Global Prompt Template" badge="Stored in DB">
                {pLoad && <LoadingBar text="Loading prompt…" />}
                {prompt && (<>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
                    Variables: {["{mti}", "{profile}", "{fields}", "{errors}"].map(v => <Tag key={v} color={T.accent} small style={{ marginLeft: 4 }}>{v}</Tag>)}
                  </div>
                  <textarea rows={8} disabled={!can.edit}
                     value={globalContent !== null ? globalContent : (prompt.promptTemplate || "")}
                    onChange={e => setGlobalContent(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "10px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none", opacity: can.edit ? 1 : 0.6 }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {can.edit && <Btn primary onClick={handleSavePrompt}>Save</Btn>}
                    <Btn onClick={handleTestPrompt}>{testing ? "Testing…" : "▶ Test Prompt"}</Btn>
                    <SmBtn onClick={loadVersions}>Version History</SmBtn>
                  </div>
                  {testOutput && (
                    <div style={{ marginTop: 12, background: T.bg, border: `1px solid ${T.green}33`, borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: T.green, marginBottom: 6 }}>✓ AI Response ({testOutput.durationMs}ms · {testOutput.modelUsed})</div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.7 }}>{testOutput.response}</div>
                    </div>
                  )}
                  {versions && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Version", "By", "Date", "Note", ""].map(h => <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: T.text, fontWeight: 800, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                        <tbody>
                          {versions.map(v => (
                            <tr key={v.versionNumber} style={{ borderBottom: `1px solid ${T.border}22` }}>
                              <td style={{ padding: "6px 8px", color: T.accent }}>v{v.versionNumber}</td>
                              <td style={{ padding: "6px 8px", color: T.text }}>{v.createdBy}</td>
                              <td style={{ padding: "6px 8px", color: T.muted }}>{new Date(v.createdAt).toLocaleString()}</td>
                              <td style={{ padding: "6px 8px", color: T.muted }}>{v.changeNote}</td>
                              <td style={{ padding: "6px 8px" }}>
                                {can.edit && v.versionNumber !== prompt.currentVersion && (
                                  <SmBtn onClick={async () => {
                                    await doRollback(prompt.id, v.versionNumber);
                                    await pRefetch();
                                    const updated = await getPromptVersions(prompt.id);
                                    setVersions(updated);
                                  }}>Rollback</SmBtn>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>)}
              </Card>
            </div>
          </div>
        )}
      </>)}

      {/* Per-profile prompts */}
      {tab === "profiles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: T.muted }}>Override the global prompt per connection. Leave blank to inherit global template.</div>
          {(Array.isArray(profiles)
            ? profiles
            : profiles?.content || []
          ).map(p => <ProfilePromptCard key={p.id} profile={p} canEdit={can.edit} />)}
        </div>
      )}

      {/* BRD Parser prompt */}
      {tab === "brd" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12, color: T.muted }}>
            Prompt used by the BRD Import feature to extract switch profiles, field definitions, and rules from uploaded BRD documents.
          </div>
          <BrdPromptCard canEdit={can.edit} />
        </div>
      )}

      {/* Logs */}
      {tab === "logs" && (
        <Card title="AI Run Logs">
          {logLoad && <LoadingBar text="Loading logs…" />}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Run Reference", "Status", "Model", "Duration", "Error"].map(h => <Th key={h}>{h}</Th>)}</tr></thead>
            <tbody>
              {logs?.content?.map(l => (
                <tr key={l.logId} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "8px 8px", color: T.accent }}>{l.runReference}</td>
                  <td style={{ padding: "8px 8px" }}><Tag color={l.status === "SUCCESS" ? T.green : T.red} small>{l.status}</Tag></td>
                  <td style={{ padding: "8px 8px", color: T.muted }}>{l.modelUsed}</td>
                  <td style={{ padding: "8px 8px", color: T.purple }}>{l.durationMs}ms</td>
                  <td style={{ padding: "8px 8px", color: T.red, fontSize: 10 }}>{l.errorMessage || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function BrdPromptCard({ canEdit }) {
  const [content, setContent] = useState(null);
  const [versions, setVersions] = useState(null);
  const [saving, setSaving] = useState(false);
  const [versionsError, setVersionsError] = useState(null); // NEW
  const { data: templates, loading, error, refetch } = useApi(() => getTemplatesByScope("BRD_PARSE"));

  const template = Array.isArray(templates) ? templates[0] : templates;

  const { mutate: doCreate } = useMutation((body) => createTemplate(body));
  const { mutate: doUpdate } = useMutation((id, body) => updateTemplate(id, body));
  const { mutate: doRollback } = useMutation((id, v) => rollbackTemplate(id, v));

  const loadVersions = async () => {
    if (versions) { setVersions(null); return; }
    if (!template?.id) return;
    try {
      setVersionsError(null);
      const v = await getTemplateVersions(template.id);
      setVersions(v);
    } catch (e) {
      setVersionsError(e.message); 
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promptTemplate = content !== null ? content : (template?.promptTemplate || "");
      if (template?.id) {
        await doUpdate(template.id, { ...template, promptTemplate });
      } else {
        await doCreate({
          templateName: "brd-parse-default",
          scope: "BRD_PARSE",
          promptTemplate,
        });
      }
      await refetch();
      setContent(null);
      if (versions) {
        const v = await getTemplateVersions(template.id);
        setVersions(v);
      }
      alert("BRD parser prompt saved!"); 
    } catch (e) {
      alert("Failed to save BRD prompt: " + (e?.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="BRD Parser Prompt"
      badge={template?.currentVersion ? <Tag color={T.purple} small>v{template.currentVersion}</Tag> : <Tag color={T.muted} small>not set</Tag>}
    >
      {loading && <LoadingBar text="Loading BRD parser prompt…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
        Variables: <Tag color={T.accent} small style={{ marginLeft: 4 }}>{"{brd_text}"}</Tag>
      </div>
      <textarea rows={16} disabled={!canEdit}
  placeholder="No BRD_PARSE template exists yet — paste the extraction prompt here and Save to create one…"
  value={content !== null ? content : (template?.promptTemplate || "")}
  onChange={e => setContent(e.target.value)}

        style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "10px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none", opacity: canEdit ? 1 : 0.6 }} />
     <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
  {canEdit && <Btn primary onClick={handleSave}>{saving ? "Saving…" : "Save"}</Btn>}
  <SmBtn onClick={loadVersions} style={{ opacity: template?.id ? 1 : 0.35 }}>🕓 Version History</SmBtn>
</div>
{versionsError && (
  <div style={{ marginTop: 8, background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>
    ✕ {versionsError}
  </div>
)}

      {versions && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Version", "By", "Date", "Note", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: T.text, fontWeight: 800, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.versionNumber} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "6px 8px", color: T.accent }}>
                    v{v.versionNumber}
                    {v.versionNumber === template?.currentVersion && (
                      <Tag color={T.green} small style={{ marginLeft: 4 }}>current</Tag>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", color: T.text }}>{v.createdBy}</td>
                  <td style={{ padding: "6px 8px", color: T.muted }}>{new Date(v.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "6px 8px", color: T.muted }}>{v.changeNote}</td>
                  <td style={{ padding: "6px 8px" }}>
                    {canEdit && v.versionNumber !== template?.currentVersion && (
                      <SmBtn onClick={async () => {
                        await doRollback(template.id, v.versionNumber);
                        await refetch();
                        const updated = await getTemplateVersions(template.id);
                        setVersions(updated);
                      }}>Rollback</SmBtn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ProfilePromptCard({ profile, canEdit }) {
  const [content, setContent] = useState(null);
  const [versions, setVersions] = useState(null);
    const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null); 
  const { data, refetch } = useApi(() => getProfilePrompt(profile.id), [profile.id]);
  const { mutate: doUpsert } = useMutation((c, n) => upsertProfilePrompt(profile.id, c, n));
  const { mutate: doDelete } = useMutation(() => deleteProfilePrompt(profile.id));
  const { mutate: doRollback } = useMutation((id, v) => rollbackPrompt(id, v));

   const loadVersions = async () => {
    if (versions) { setVersions(null); return; }
    if (!data?.id) return;
    try {
      const v = await getPromptVersions(data.id);
      setVersions(v);
    } catch (e) {
      setError(e.message);
    }
  };
  const handleSaveOverride = async () => {
    setSaving(true);
    setError(null);
    try {
      const valueToSave = content !== null ? content : (data?.promptTemplate || "");
      await doUpsert(valueToSave, "Updated via UI");
      await refetch();
      setContent(null);
      if (versions) {
        const v = await getPromptVersions(data.id);
        setVersions(v);
      }
      alert("Profile prompt override saved!");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const envColor = { PROD: "#ff2d55", UAT: "#ff9f0a", DEV: "#3fb950" }[profile.environment] || "#888";

  return (
    <Card
      title={profile.profileName}
      badge={
        data?.currentVersion
          ? <Tag color={T.purple} small>v{data.currentVersion}</Tag>
          : null
      }
    >
      <textarea rows={3} disabled={!canEdit} placeholder="Leave blank to use global template…"
  value={content !== null ? content : (data?.promptTemplate || "")}
  onChange={e => setContent(e.target.value)}
  style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, color: T.text, padding: "10px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none" }} />

{canEdit && (
  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
    <Btn primary onClick={handleSaveOverride} disabled={saving}>
      {saving ? "Saving…" : "Save Override"}
    </Btn>
    {data && <Btn onClick={async () => { await doDelete(); refetch(); setContent(null); setVersions(null); }}>↺ Clear</Btn>}
    <SmBtn onClick={loadVersions} style={{ opacity: data?.id ? 1 : 0.35 }}>🕓 Version History</SmBtn>
  </div>
)}
{error && (
  <div style={{ marginTop: 8, background: T.red + "12", border: `1px solid ${T.red}44`, borderRadius: 5, padding: "8px 12px", fontSize: 11, color: T.red }}>
    ✕ {error}
  </div>
)}
{!canEdit && (
  <div style={{ marginTop: 8 }}>
    <SmBtn onClick={loadVersions} style={{ opacity: data?.id ? 1 : 0.35 }}>🕓 Version History</SmBtn>
  </div>
)}

      {/* Version history table */}
      {versions && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {["Version", "By", "Date", "Note", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "5px 8px", color: T.text, fontWeight: 800, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.versionNumber} style={{ borderBottom: `1px solid ${T.border}22` }}>
                  <td style={{ padding: "6px 8px", color: T.accent }}>
                    v{v.versionNumber}
                    {v.versionNumber === data?.currentVersion && (
                      <Tag color={T.green} small style={{ marginLeft: 4 }}>current</Tag>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", color: T.text }}>{v.createdBy}</td>
                  <td style={{ padding: "6px 8px", color: T.muted }}>{new Date(v.createdAt || v.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: "6px 8px", color: T.muted }}>{v.changeNote}</td>
                  <td style={{ padding: "6px 8px" }}>
                    {canEdit && v.versionNumber !== data?.currentVersion && (
                      <SmBtn onClick={async () => {
                        await doRollback(data.id, v.versionNumber);
                        await refetch();
                        const updated = await getPromptVersions(data.id);
                        setVersions(updated);
                      }}>Rollback</SmBtn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}