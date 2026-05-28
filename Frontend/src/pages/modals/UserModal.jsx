import { useState } from "react";
import { T, ROLES } from "../../constants/theme";
import { useMutation } from "../../hooks/useApi";
import { createUser, updateUser, adminResetPassword } from "../../api/users";
import { Btn } from "../../components/shared";
import { Modal, ModalFooter } from "./ProfileModal";

const inp = (err) => ({ width:"100%", boxSizing:"border-box", background:"#070a0f", border:`1px solid ${err?T.red:T.border}`, color:T.text, padding:"8px 10px", borderRadius:6, fontFamily:"inherit", fontSize:11, outline:"none" });

export default function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username: user?.username || "",
    fullName: user?.fullName || "",
    email:    user?.email    || "",
    role:     user?.role     || "ANALYST",
    password: "",
    confirmPassword: "",
  });
  const [resetMode, setResetMode] = useState(false);
  const [newPass, setNewPass]     = useState("");
  const [errors, setErrors]       = useState({});
  const [showPass, setShowPass]   = useState(false);

  const { mutate: doCreate, loading:creating } = useMutation(createUser);
  const { mutate: doUpdate, loading:updating } = useMutation(d => updateUser(user.userId, d));
  const { mutate: doReset,  loading:resetting } = useMutation(p => adminResetPassword(user.userId, p));
  const loading = creating || updating || resetting;

  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:""})); };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Required";
    if (!form.email.trim())    e.email    = "Required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!isEdit) {
      if (!form.username.trim()) e.username = "Required";
      if (form.username.includes(" ")) e.username = "No spaces allowed";
      if (!form.password)        e.password = "Required";
      if (form.password.length < 8) e.password = "Minimum 8 characters";
      if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      if (isEdit) {
        await doUpdate({ fullName: form.fullName, email: form.email });
      } else {
        await doCreate({ username: form.username, password: form.password, fullName: form.fullName, email: form.email, role: form.role });
      }
      onSaved(); onClose();
    } catch (err) { setErrors({ _form: err.message }); }
  };

  const handleReset = async () => {
    if (newPass.length < 8) { setErrors({ _reset:"Minimum 8 characters" }); return; }
    try { await doReset(newPass); setResetMode(false); setNewPass(""); alert("Password reset successfully!"); }
    catch (err) { setErrors({ _reset: err.message }); }
  };

  return (
    <Modal title={isEdit ? `Edit User — ${user.username}` : "New User"} onClose={onClose}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

        {/* Role selector */}
        <div>
          <div style={{ fontSize:10.5, color:T.muted, marginBottom:8, fontWeight:600 }}>Role</div>
          <div style={{ display:"flex", gap:8 }}>
            {Object.entries(ROLES).map(([key, r]) => (
              <button key={key} onClick={()=>set("role",key)} style={{ flex:1, padding:"10px 0", borderRadius:7, fontFamily:"inherit", fontSize:11, cursor:"pointer", border:`2px solid ${form.role===key?r.color:T.border}`, background:form.role===key?r.color+"18":"transparent", color:form.role===key?r.color:T.muted, transition:"all 0.15s" }}>
                <div style={{ fontWeight:700 }}>{r.label}</div>
                <div style={{ fontSize:9, marginTop:3, color:form.role===key?r.color:T.faint }}>
                  {key==="ADMIN"?"Full access":key==="ANALYST"?"Validate + build":"Read only"}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {!isEdit && (
            <Field label="Username" required error={errors.username}>
              <input value={form.username} onChange={e=>set("username",e.target.value.toLowerCase())} placeholder="priya.s" style={inp(errors.username)} />
            </Field>
          )}

          <Field label="Full Name" required error={errors.fullName} style={isEdit ? { gridColumn:"1/-1" } : {}}>
            <input value={form.fullName} onChange={e=>set("fullName",e.target.value)} placeholder="Priya Singh" style={inp(errors.fullName)} />
          </Field>

          <Field label="Email" required error={errors.email} style={{ gridColumn:"1/-1" }}>
            <input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="priya@company.com" style={inp(errors.email)} />
          </Field>

          {!isEdit && (<>
            <Field label="Password" required error={errors.password}>
              <div style={{ position:"relative" }}>
                <input type={showPass?"text":"password"} value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 8 characters" style={{ ...inp(errors.password), paddingRight:36 }} />
                <button onClick={()=>setShowPass(x=>!x)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:T.faint, cursor:"pointer", fontSize:12, padding:0 }}>
                  {showPass?"🙈":"👁"}
                </button>
              </div>
            </Field>

            <Field label="Confirm Password" required error={errors.confirmPassword}>
              <input type="password" value={form.confirmPassword} onChange={e=>set("confirmPassword",e.target.value)} placeholder="Re-enter password" style={inp(errors.confirmPassword)} />
            </Field>
          </>)}
        </div>

        {/* Password reset section (edit mode only) */}
        {isEdit && (
          <div style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:6, padding:12 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: resetMode?10:0 }}>
              <span style={{ fontSize:11, color:T.muted }}>Reset Password</span>
              <button onClick={()=>setResetMode(x=>!x)} style={{ background:"none", border:`1px solid ${T.border}`, color:T.muted, padding:"3px 10px", borderRadius:4, fontFamily:"inherit", fontSize:10, cursor:"pointer" }}>
                {resetMode?"Cancel":"Change Password"}
              </button>
            </div>
            {resetMode && (
              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <div style={{ flex:1 }}>
                  <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password (min 8 chars)"
                    style={{ ...inp(errors._reset), marginBottom:0 }} />
                  {errors._reset && <div style={{ fontSize:10, color:T.red, marginTop:3 }}>{errors._reset}</div>}
                </div>
                <Btn primary onClick={handleReset} disabled={resetting}>{resetting?"Resetting…":"Reset"}</Btn>
              </div>
            )}
          </div>
        )}

        {errors._form && <div style={{ background:T.red+"12", border:`1px solid ${T.red}44`, borderRadius:5, padding:"8px 12px", fontSize:11, color:T.red }}>✕ {errors._form}</div>}
      </div>

      <ModalFooter>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn primary onClick={handleSave} disabled={loading}>{loading?"Saving…":`💾 ${isEdit?"Save Changes":"Create User"}`}</Btn>
      </ModalFooter>
    </Modal>
  );
}

function Field({ label, required, error, children, style:s }) {
  return (
    <div style={s}>
      <div style={{ fontSize:10.5, color:T.muted, marginBottom:5, fontWeight:600 }}>{label}{required&&<span style={{ color:T.red }}> *</span>}</div>
      {children}
      {error && <div style={{ fontSize:10, color:T.red, marginTop:3 }}>{error}</div>}
    </div>
  );
}