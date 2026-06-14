import { useState } from "react";
import { T, ROLES } from "../constants/theme";
import { useApi, useMutation } from "../hooks/useApi";
import { getUsers, deleteUser, toggleUserStatus,
         changeUserRole, revokeUserSessions } from "../api/users";
import { PageHeader, Card, Tag, SmBtn, Btn, LoadingBar,
         ErrorBanner, StatCard, Th, Pagination } from "../components/shared";
import UserModal from "./modals/UserModal";

export default function Users() {
  const [page, setPage]         = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");

  const { data, loading, error, refetch } = useApi(
    () => getUsers({ role: roleFilter, page, size: 20 }),
    [roleFilter, page]
  );
  const { mutate: doDelete  } = useMutation(deleteUser);
  const { mutate: doToggle  } = useMutation((id,v) => toggleUserStatus(id,v));
  const { mutate: doRole    } = useMutation((id,r) => changeUserRole(id,r));
  const { mutate: doRevoke  } = useMutation(revokeUserSessions);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await doDelete(id); refetch();
  };

  const handleToggle = async (id, current) => {
    await doToggle(id, !current); refetch();
  };

  const handleRoleChange = async (id, role) => {
    if (!window.confirm(`Change role to ${role}?`)) return;
    await doRole(id, role); refetch();
  };

  const users = data?.content || [];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <PageHeader title="Users" sub="User accounts, roles and session management" />

      {/* Stats */}
      {data && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <StatCard label="Total Users" value={data.totalElements}                                    color={T.accent} />
          <StatCard label="Admins"      value={users.filter(u=>u.role==="ADMIN").length}              color={T.red}    />
          <StatCard label="Analysts"    value={users.filter(u=>u.role==="ANALYST").length}            color={T.yellow} />
          <StatCard label="Active"      value={users.filter(u=>u.active).length}                    color={T.green}  />
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          {["","ADMIN","ANALYST","VIEWER"].map(r => (
            <button key={r} onClick={()=>{ setRoleFilter(r); setPage(0); }}
              style={{ background:roleFilter===r?T.accent+"22":"transparent", border:`1px solid ${roleFilter===r?T.accent:T.border}`, color:roleFilter===r?T.accent:T.muted, padding:"5px 12px", borderRadius:5, fontFamily:"inherit", fontSize:10, cursor:"pointer" }}>
              {r||"ALL"}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }} />
        <Btn primary onClick={()=>{ setEditUser(null); setShowModal(true); }}>+ New User</Btn>
      </div>

      {loading && <LoadingBar text="Loading users…" />}
      {error   && <ErrorBanner message={error} onRetry={refetch} />}

      <Card>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${T.border}` }}>
              {["Avatar","Username","Full Name","Email","Role","Status","Created","Actions"].map(h=><Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const r = ROLES[u.role] || ROLES.VIEWER;
              return (
                <tr key={u.id} style={{ borderBottom:`1px solid ${T.border}22`, opacity:u.active?1:0.5 }}>
                  <td style={{ padding:"8px 8px" }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:r.color+"22", border:`1px solid ${r.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:r.color }}>
                      {u.avatarInitials||u.username?.slice(0,2).toUpperCase()}
                    </div>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.accent, fontWeight:700 }}>{u.username}</td>
                  <td style={{ padding:"8px 8px", color:T.text }}>{u.fullName}</td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 }}>{u.email}</td>
                  <td style={{ padding:"8px 8px" }}>
                    <select value={u.role} onChange={e=>handleRoleChange(u.id,e.target.value)}
                      style={{ background:"transparent", border:`1px solid ${r.color}44`, color:r.color, padding:"3px 6px", borderRadius:4, fontFamily:"inherit", fontSize:9, cursor:"pointer" }}>
                      {["ADMIN","ANALYST","VIEWER"].map(role => <option key={role} value={role} style={{ background:"#0d1117", color:"#e6edf3" }}>{role}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"8px 8px" }}>
                    <Tag color={u.active?T.green:T.faint} small>{u.active?"ACTIVE":"INACTIVE"}</Tag>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding:"8px 8px" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      <SmBtn onClick={()=>{ setEditUser(u); setShowModal(true); }}>Edit</SmBtn>
                      <SmBtn onClick={()=>handleToggle(u.id,u.active)}>{u.active?"Disable":"Enable"}</SmBtn>
                      <SmBtn onClick={()=>doRevoke(u.id)}>Revoke Sessions</SmBtn>
                      <SmBtn danger onClick={()=>handleDelete(u.id)}>Del</SmBtn>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length===0 && !loading && (
              <tr><td colSpan={8} style={{ padding:"24px", textAlign:"center", color:T.faint, fontSize:12 }}>No users found</td></tr>
            )}
          </tbody>
        </table>
        <Pagination page={data?.number||0} totalPages={data?.totalPages||1} onPageChange={setPage} />
      </Card>

      {showModal && <UserModal user={editUser} onClose={()=>setShowModal(false)} onSaved={refetch} />}
    </div>
  );
}