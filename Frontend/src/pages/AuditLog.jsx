// import React, { useState } from "react";
// import { T } from "../constants/theme";
// import { useApi } from "../hooks/useApi";
// import { getAuditLogs } from "../api/history";
// import {
//   PageHeader,
//   Card,
//   Tag,
//   LoadingBar,
//   ErrorBanner,
//   Th,
//   Pagination
// } from "../components/shared";
import React, { useState, useEffect } from "react";
import { T } from "../constants/theme";
import { useApi } from "../hooks/useApi";
import { getAuditLogs } from "../api/history";
import { getConfigValue } from "../api/config";
import {
  PageHeader,
  Card,
  Tag,
  LoadingBar,
  ErrorBanner,
  Th,
  Pagination
} from "../components/shared";

const DEFAULT_SIZE = 30;

const formatAuditValue = (value) => {
  if (!value) return "—";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

export default function AuditLog() {
  // const [page, setPage] = useState(0);
  // const [filters, setFilters] = useState({});
  // const [expanded, setExpanded] = useState(null);

  // const { data, loading, error, refetch } = useApi(
  //   () =>
  //     getAuditLogs({
  //       ...filters,
  //       page,
  //       size: 30
  //     }),
  //   [filters, page]
  // );
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [filters, setFilters] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const configured = await getConfigValue("pagination.default.size", DEFAULT_SIZE);
      const parsed = parseInt(configured, 10);
      if (!cancelled && !isNaN(parsed) && parsed > 0) setSize(parsed);
    })();
    return () => { cancelled = true; };
  }, []);

  const { data, loading, error, refetch } = useApi(
    () =>
      getAuditLogs({
        ...filters,
        page,
        size
      }),
    [filters, page, size]
  );

  const updateFilter = (key, value) => {
  setFilters((f) => ({ ...f, [key]: value || undefined }));
  setPage(0);
};

  const SL = {
    background: T.surface2,
    border: `1px solid ${T.border}`,
    color: T.text,
    padding: "7px 10px",
    borderRadius: 6,
    fontFamily: "inherit",
    fontSize: 11,
    outline: "none"
  };

  const logs = data?.content || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Audit Log"
        sub="Immutable audit trail of all system actions across all services"
      />

      <Card>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 160px 160px 160px 140px 140px",
            gap: 10,
            alignItems: "end"
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.muted,
                marginBottom: 5,
                fontWeight: 600
              }}
            >
              Entity ID
            </div>

            <input
              placeholder="Search entity..."
             onChange={(e) => updateFilter("entityId", e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: T.bg,
                border: `1px solid ${T.border}`,
                color: T.text,
                padding: "8px 12px",
                borderRadius: 6,
                fontFamily: "inherit",
                fontSize: 11,
                outline: "none"
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.muted,
                marginBottom: 5,
                fontWeight: 600
              }}
            >
              Service
            </div>

            <select
             onChange={(e) => updateFilter("sourceService", e.target.value === "ALL" ? undefined : e.target.value)}
              style={SL}
            >
              {[
                "ALL",
                "profile-service",
                "format-service",
                "rules-service",
                "validation-service",
                "auth-service",
                "user-service",
                "config-service",
                "ai-service"
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.muted,
                marginBottom: 5,
                fontWeight: 600
              }}
            >
              Action
            </div>

            <select
           onChange={(e) => updateFilter("action", e.target.value === "ALL" ? undefined : e.target.value)}
              style={SL}
            >
              {[
                "ALL",
                "CREATE",
                "UPDATE",
                "DELETE",
                "LOGIN",
                "LOGOUT",
                "VALIDATE",
                "RULE_RELOAD"
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.muted,
                marginBottom: 5,
                fontWeight: 600
              }}
            >
              Entity Type
            </div>

            <select
             onChange={(e) => updateFilter("entityType", e.target.value === "ALL" ? undefined : e.target.value)}
              style={SL}
            >
              {[
                "ALL",
                "PROFILE",
                "FORMAT",
                "RULE",
                "FIELD_DEFINITION",
                "USER",
                "PROMPT",
                "CONFIG",
                "SYSTEM_CONFIG",
                "AI_CONFIG"
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.muted,
                marginBottom: 5,
                fontWeight: 600
              }}
            >
              From
            </div>

            <input
              type="date"
              // onChange={(e) =>
              //   setFilters((f) => ({
              //     ...f,
              //     fromDate: e.target.value || undefined
              //   }))
              // }
              onChange={(e) => updateFilter("fromDate", e.target.value)}
              style={{
                ...SL,
                width: "100%",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                color: T.muted,
                marginBottom: 5,
                fontWeight: 600
              }}
            >
              To
            </div>

            <input
              type="date"
              // onChange={(e) =>
              //   setFilters((f) => ({
              //     ...f,
              //     toDate: e.target.value || undefined
              //   }))
              // }
              onChange={(e) => updateFilter("toDate", e.target.value)}
              style={{
                ...SL,
                width: "100%",
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>
      </Card>

      {loading && <LoadingBar text="Loading audit logs…" />}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={refetch}
        />
      )}

      <Card
        title="Audit Trail"
        badge={`${data?.totalElements || 0} entries`}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 11
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${T.border}`
              }}
            >
              {[
                "",
                "Timestamp",
                "Service",
                "Action",
                "Entity Type",
                "Entity",
                "User",
                // "IP",
                "Description"
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>

          <tbody>
            {logs.map((l) => {
              const open = expanded === l.auditId;

              const ACTION_COLOR = {
                CREATE: T.green,
                UPDATE: T.yellow,
                DELETE: T.red,
                LOGIN: T.accent,
                LOGOUT: T.red,
                VALIDATE: T.blue
              };

              return (
                <React.Fragment key={l.auditId}>
                  <tr
                    style={{
                      borderBottom: open
                        ? "none"
                        : `1px solid ${T.border}22`,
                      background: open
                        ? T.surface2
                        : "transparent"
                    }}
                  >
                    <td style={{ padding: "8px 6px" }}>
                      <button
                        onClick={() =>
                          setExpanded(
                            open ? null : l.auditId
                          )
                        }
                        style={{
                          background: "none",
                          border: `1px solid ${T.border}`,
                          color: T.muted,
                          width: 20,
                          height: 20,
                          borderRadius: 3,
                          cursor: "pointer",
                          fontSize: 10
                        }}
                      >
                        {open ? "▲" : "▼"}
                      </button>
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        color: T.muted,
                        fontSize: 10,
                        whiteSpace: "nowrap"
                      }}
                    >
                      {new Date(
                        l.createdAt
                      ).toLocaleString()}
                    </td>

                    <td style={{ padding: "8px" }}>
                      <Tag color={T.blue} small>
                        {l.sourceService}
                      </Tag>
                    </td>

                    <td style={{ padding: "8px" }}>
                      <Tag
                        color={
                          ACTION_COLOR[l.action] ||
                          T.muted
                        }
                        small
                      >
                        {l.action}
                      </Tag>
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        color: T.muted
                      }}
                    >
                      {l.entityType || "—"}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        color: T.accent
                      }}
                    >
                      {l.entityId ||
                        l.entityName ||
                        "—"}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        color: T.text
                      }}
                    >
                      {l.usernameSnapshot ||
                        "System"}
                    </td>

                  {/*  <td
                      style={{
                        padding: "8px",
                        color: T.cadbury,
                        fontSize: 10
                      }}
                    >
                      {l.ipAddress || "—"}
                    </td> */}
                    

                    <td
                      style={{
                        padding: "8px",
                        color: T.muted,
                        fontSize: 10
                      }}
                    >
                      {l.description || "—"}
                    </td>
                  </tr>

                  {open && (
                    <tr
                      style={{
                        borderBottom: `1px solid ${T.border}22`,
                        background: T.surface2
                      }}
                    >
                      <td
                        colSpan={9}
                        style={{
                          padding: "10px 14px"
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "1fr 1fr",
                            gap: 12,
                            fontSize: 11
                          }}
                        >
                          <div>
                            <div
                              style={{
                                color: T.faint,
                                marginBottom: 6,
                                fontSize: 10,
                                fontWeight: 700
                              }}
                            >
                              BEFORE
                            </div>

                            <pre
                              style={{
                                background: T.bg,
                                border: `1px solid ${T.border}`,
                                borderRadius: 4,
                                padding: "8px 10px",
                                fontSize: 10,
                                color: T.muted,
                                margin: 0,
                                overflowX: "auto"
                              }}
                            >
                              {formatAuditValue(
                                l.oldValue
                              )}
                            </pre>
                          </div>

                          <div>
                            <div
                              style={{
                                color: T.green,
                                marginBottom: 6,
                                fontSize: 10,
                                fontWeight: 700
                              }}
                            >
                              AFTER
                            </div>

                            <pre
                              style={{
                                background: T.bg,
                                border: `1px solid ${T.green}33`,
                                borderRadius: 4,
                                padding: "8px 10px",
                                fontSize: 10,
                                color: T.text,
                                margin: 0,
                                overflowX: "auto"
                              }}
                            >
                              {formatAuditValue(
                                l.newValue
                              )}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {logs.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: T.faint,
                    fontSize: 12
                  }}
                >
                  No audit entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={data?.number || 0}
          totalPages={data?.totalPages || 1}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}