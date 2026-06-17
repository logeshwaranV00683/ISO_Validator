import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import { T } from "./constants/theme";

// Pages
import Login             from "./pages/Login";
import Dashboard         from "./pages/Dashboard";
import Validator         from "./pages/Validator";
import Builder           from "./pages/Builder";
import History           from "./pages/History";
import Profiles          from "./pages/Profiles";
import Formats           from "./pages/Formats";
import Rules             from "./pages/Rules";
import FieldDefinitions  from "./pages/FieldDefinitions";
import AI                from "./pages/AI";
import Users             from "./pages/Users";
import AuditLog          from "./pages/AuditLog";
import SystemConfig      from "./pages/SystemConfig";

// ── Protected route wrapper ──────────────────────────────────────────────────
function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// ── Admin-only route wrapper ──────────────────────────────────────────────────
function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}

// ── Main layout (TopBar + Sidebar + Content) ─────────────────────────────────
function AppLayout() {
  return (
    <div style={{ fontFamily:"'JetBrains Mono','Fira Code',monospace", background:T.bg, color:T.text, height:"100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <TopBar />
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        <Sidebar />
        <main style={{ flex:1, overflow:"auto", padding:24, display:"flex", flexDirection:"column", gap:16 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/validator"         element={<Validator />} />
          <Route path="/builder"           element={<Builder />} />
          <Route path="/history"           element={<History />} />
          <Route path="/profiles"          element={<Profiles />} />
          <Route path="/formats"           element={<Formats />} />
          <Route path="/rules"             element={<Rules />} />

          {/* Admin only */}
          <Route element={<RequireAdmin />}>
            <Route path="/field-definitions" element={<FieldDefinitions />} />
            <Route path="/ai"                element={<AI />} />
            <Route path="/users"             element={<Users />} />
            <Route path="/audit"             element={<AuditLog />} />
            <Route path="/config"            element={<SystemConfig />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}