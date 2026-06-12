import { useState } from "react";
import { createFormat } from "../../api/profiles";
import { T } from "../../constants/theme";

export default function FormatModal({ onClose, onSaved }) {
    const [form, setForm] = useState({
        formatName: "",
        isoVersion: "ISO 8583-1:1987",
        encoding: "ASCII",
        totalFields: 128,
        description: "",
        xmlContent: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const set = (k, v) =>
        setForm((p) => ({
            ...p,
            [k]: v,
        }));

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const text = await file.text();

        set("xmlContent", text);
    };

    const handleSave = async () => {
        try {
            console.log("FORMAT PAYLOAD", form);
            console.log("createFormat function", createFormat);
            setLoading(true);
            setError("");

            await createFormat(form);

            onSaved?.();
            onClose?.();
        } catch (err) {
            console.error(err);
            setError(err?.message || "Failed to create format");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.7)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    width: 700,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: 20,
                }}
            >
                <h2>Create Format</h2>

                <input
                    placeholder="Format Name"
                    value={form.formatName}
                    onChange={(e) => set("formatName", e.target.value)}
                    style={{ width: "100%", marginBottom: 10 }}
                />

                <input
                    placeholder="ISO Version"
                    value={form.isoVersion}
                    onChange={(e) => set("isoVersion", e.target.value)}
                    style={{ width: "100%", marginBottom: 10 }}
                />

                <input
                    placeholder="Encoding"
                    value={form.encoding}
                    onChange={(e) => set("encoding", e.target.value)}
                    style={{ width: "100%", marginBottom: 10 }}
                />

                <input
                    type="number"
                    value={form.totalFields}
                    onChange={(e) => set("totalFields", Number(e.target.value))}
                    style={{ width: "100%", marginBottom: 10 }}
                />

                <textarea
                    rows={3}
                    placeholder="Description"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    style={{ width: "100%", marginBottom: 10 }}
                />

                <input
                    type="file"
                    accept=".xml"
                    onChange={handleFile}
                />

                <div style={{ marginTop: 8, color: T.muted }}>
                    {form.xmlContent
                        ? "XML loaded successfully"
                        : "Select XML file"}
                </div>

                {error && (
                    <div style={{ color: "red", marginTop: 10 }}>
                        {error}
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 20,
                    }}
                >
                    <button onClick={onClose}>Cancel</button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}