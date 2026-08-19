// import { useState } from "react";
// import { T, ROLES } from "../constants/theme";
// import { useApi, useMutation } from "../hooks/useApi";
// import { getUsers, deleteUser, toggleUserStatus,
//          changeUserRole, revokeUserSessions } from "../api/users";
// import { PageHeader, Card, Tag, SmBtn, Btn, LoadingBar,
//          ErrorBanner, StatCard, Th, Pagination } from "../components/shared";
// import UserModal from "./modals/UserModal";

// export default function Users() {
//   const [page, setPage]         = useState(0);
//   const [showModal, setShowModal] = useState(false);
//   const [editUser, setEditUser] = useState(null);
//   const [roleFilter, setRoleFilter] = useState("");

//   const { data, loading, error, refetch } = useApi(
//     () => getUsers({ role: roleFilter, page, size: 20 }),
//     [roleFilter, page]
//   );
import { useState, useEffect } from "react";
import { T, ROLES } from "../constants/theme";
import { useApi, useMutation } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { getUsers, deleteUser, toggleUserStatus,
         changeUserRole, revokeUserSessions } from "../api/users";
import { PageHeader, Card, Tag, SmBtn, Btn, LoadingBar,
         ErrorBanner, StatCard, Th, Pagination } from "../components/shared";
import { getConfigValue } from "../api/config";
import UserModal from "./modals/UserModal";

const DEFAULT_SIZE = 20;

export default function Users() {
   const { user: currentUser } = useAuth();
  const [page, setPage]         = useState(0);
  const [size, setSize]         = useState(DEFAULT_SIZE);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");

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
    () => getUsers({ role: roleFilter, page, size }),
    [roleFilter, page, size]
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

  //const users = data?.content || [];
  const allUsers = data?.content || [];
const users = roleFilter ? allUsers.filter(u => u.role === roleFilter) : allUsers;

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
              {["Avatar","Username","Full Name","Email","Role","Status","Createdby","Actions"].map(h=><Th key={h}>{h}</Th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const r = ROLES[u.role] || ROLES.VIEWER;
               const isSelf = currentUser && (
                (u.id != null && u.id === currentUser.userId) ||
                (u.username && u.username === currentUser.username)
              );
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
                    <select value={u.role} disabled={isSelf} onChange={e=>handleRoleChange(u.id,e.target.value)}
                     title={isSelf ? "You can't change your own role while logged in" : undefined}
                      style={{ background:"transparent", border:`1px solid ${r.color}44`, color:r.color, padding:"3px 6px", borderRadius:4, fontFamily:"inherit", fontSize:9, cursor:isSelf?"not-allowed":"pointer", opacity:isSelf?0.5:1 }}>
                      {["ADMIN","ANALYST","VIEWER"].map(role => <option key={role} value={role} style={{ background:T.surface, color:T.text }}>{role}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"8px 8px" }}>
                    <Tag color={u.active?T.green:T.faint} small>{u.active?"ACTIVE":"INACTIVE"}</Tag>
                  </td>
                  <td style={{ padding:"8px 8px", color:T.muted, fontSize:10 ,whiteSpace:"nowrap" }}>
                      {u.createdBy || "—" }
                    {/* {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"} */}
                  </td>
                  <td style={{ padding:"8px 8px" }}>
                    <div style={{ display:"flex", gap:4,alignItems:"center" }}>
                      <SmBtn onClick={()=>{ setEditUser(u); setShowModal(true); }}>Edit</SmBtn>
                      <SmBtn disabled={isSelf} onClick={()=>!isSelf && handleToggle(u.id,u.active)}>{u.active?"Disable":"Enable"}</SmBtn>
                      <SmBtn disabled={isSelf} onClick={()=>!isSelf && doRevoke(u.id)}>Revoke Sessions</SmBtn>
                      <SmBtn danger disabled={isSelf} onClick={()=>!isSelf && handleDelete(u.id)}>Del</SmBtn>
                      {isSelf && <span style={{ fontSize:9, color:T.faint, marginLeft:2 }} title="You can't disable, revoke, or delete your own account while logged in">(you)</span>}
                      
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