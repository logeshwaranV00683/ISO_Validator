import { useState } from "react";
import { T } from "../constants/theme";
import { Card, Toggle } from "./shared";

function bitColor(state) {
  switch (state) {
    case "mandatory-filled": return T.green;
    case "mandatory-empty":  return T.red;
    case "optional-filled":  return T.accent;
    case "optional-empty":  return   T.accent2;
    case "custom-filled":    return T.purple;
    case "custom-empty":     return T.yellow;
    default:                 return T.faint;
  }
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: color + "33", border: `1px solid ${color}`, flexShrink: 0 }} />
      <span>{label}</span>
    </span>
  );
}

export function BitmapVisualizer({ catalogByDe, fieldValues, extraFields, onSelectCatalog, onToggleCustom }) {
  const [showExtended, setShowExtended] = useState(false);

  const normalizedCatalog = {};

Object.entries(catalogByDe || {}).forEach(([key, value]) => {
  const match = String(key).match(/\d+/);

  if (match) {
    normalizedCatalog[Number(match[0])] = value;
  }
});

  const range = showExtended
    ? Array.from({ length: 63 }, (_, i) => i + 66)
    : Array.from({ length: 63 }, (_, i) => i + 2);

  return (
    <Card
      title="Bitmap Visualizer"
      badge={<span style={{ fontSize: 9, color: T.faint }}>click bit → jump to field</span>}
      extra={
        <Toggle
          label={showExtended ? "Primary (2–64)" : "Extended (66–128)"}
          active={showExtended}
          onClick={() => setShowExtended(s => !s)}
        />
      }
    >
      {/* Compact grid: 8 cols, small cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
        {range.map(de => {
          const key = `DE${de}`;
          const fd = normalizedCatalog[de];
          const value =
  fieldValues?.[de] ??
  fieldValues?.[key] ??
  fieldValues?.[`DE ${de}`] ??
  "";

const customValue =
  extraFields?.[de] ??
  extraFields?.[key] ??
  extraFields?.[`DE ${de}`] ??
  "";

const hasVal = fd
  ? String(value).trim().length > 0
  : String(customValue).trim().length > 0;
          //const hasVal = fd ? !!fieldValues[key]?.trim() : !!extraFields[de]?.trim();
          const isCustomOpen = !fd && extraFields[de] !== undefined;

          let state;
          if (fd) {
            state = fd.isMandatory
              ? (hasVal ? "mandatory-filled" : "mandatory-empty")
              : (hasVal ? "optional-filled" : "optional-empty");
          } else {
            state = hasVal ? "custom-filled" : isCustomOpen ? "custom-empty" : "unset";
          }

          const color = bitColor(state);

          return (
            <button
              key={de}
              onClick={() => fd ? onSelectCatalog(key) : onToggleCustom(de)}
              title={fd
                ? `DE${de} · ${fd.fieldName}${fd.isMandatory ? " (mandatory)" : ""}`
                : `DE${de} — click to ${isCustomOpen ? "remove" : "add"} custom field`
              }
              style={{
                position: "relative",
                /* fixed small size to match validator panel proportions */
                height: 28,
                background: state === "unset" ? T.surface2 : color + "18",
                border: `1px solid ${state === "unset" ? T.border : color + "99"}`,
                borderRadius: 4,
                color,
                fontSize: 8,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.12s, background 0.15s, border-color 0.15s",
                animation: hasVal ? "bitGlow 2.2s ease-in-out infinite" : "none",
                padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.18)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              {de}
              {isCustomOpen && (
                <span style={{
                  position: "absolute", top: -2, right: -2, width: 5, height: 5,
                  borderRadius: "50%", background: T.yellow,
                  boxShadow: `0 0 0 1px ${T.surface}`,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend — compact single row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8, fontSize: 9, color: T.muted }}>
        <LegendDot color={T.green}   label="Mand·set" />
        <LegendDot color={T.red}     label="Mand·empty" />
        <LegendDot color={T.accent}  label="Opt·set" />
        <LegendDot color={T.accent2} label="Opt·empty" />
        <LegendDot color={T.purple}  label="Custom·set" />
        <LegendDot color={T.yellow}  label="Custom·open" />
        <LegendDot color={T.faint}   label="Unused" />
      </div>
    </Card>
  );
}