import { FormEvent, ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { AlignJustify, ArrowUpRight, Bell, LayoutGrid, List, LogOut, Sparkles, Target, Users, X } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { api, Project, Role, Status, Task, User, Department, AuditLog } from '@/lib/api';
import AuditPage from '@/pages/AuditPage';
import Dashboard from '@/pages/Dashboard';
import DepartmentsPage from '@/pages/DepartmentsPage';
import ProjectsPage from '@/pages/ProjectsPage';
import StaffPage from '@/pages/StaffPage';
import TasksPage from '@/pages/TasksPage';
import LeavesPage from '@/pages/LeavesPage';
import VouchersPage from '@/pages/VouchersPage';

type View = 'dashboard' | 'tasks' | 'projects' | 'staff' | 'departments' | 'audit' | 'leaves' | 'vouchers';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthLogin />} />
        <Route path="/*" element={<AppRouter />} />
      </Routes>
    </BrowserRouter>
  );
}

function AuthLogin() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('taskhub-token') || '');
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('taskhub-user');
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const handleLogin = (nextToken: string, nextUser: User) => {
    localStorage.setItem('taskhub-token', nextToken);
    localStorage.setItem('taskhub-user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    navigate('/');
  };
  if (token && user) return <Navigate to="/" />;
  return <Login onLogin={handleLogin} />;
}

function AppRouter() {
  const [token, setToken] = useState(() => localStorage.getItem('taskhub-token') || '');
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('taskhub-user');
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const navigate = useNavigate();

  const handleLogin = (nextToken: string, nextUser: User) => {
    localStorage.setItem('taskhub-token', nextToken);
    localStorage.setItem('taskhub-user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('taskhub-token');
    localStorage.removeItem('taskhub-user');
    setToken('');
    setUser(null);
    navigate('/login');
  };

  if (!token || !user) return <Navigate to="/login" />;

  return <Workspace token={token} user={user} onLogout={handleLogout} onUserChange={setUser} setToken={setToken} />;
}

function Login({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('admin@taskhub.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login(email, password);
      onLogin(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-art">
        <div className="brand-row">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span className="font-display text-xl font-semibold text-white">
            Task<span className="text-coral">hub</span>
          </span>
        </div>
        <div className="login-copy">
          <p className="eyebrow text-coral">A calmer way to work</p>
          <h1>
            Make room for
            <br />
            <span>better work.</span>
          </h1>
          <p>Bring projects, people, and progress together in one focused workspace.</p>
        </div>
        <div className="login-art-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Team momentum</span>
            <span className="text-xs text-sage">+18.4%</span>
          </div>
          <div className="mt-5 flex items-end gap-2">
            <div className="chart-bar h-10" />
            <div className="chart-bar h-16" />
            <div className="chart-bar h-12" />
            <div className="chart-bar h-24" />
            <div className="chart-bar h-20" />
            <div className="chart-bar h-32 bg-coral" />
            <div className="chart-bar h-28" />
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="w-full max-w-[390px]">
          <div className="brand-row mb-12 lg:hidden">
            <span className="brand-mark"><Sparkles size={17} /></span>
            <span className="font-display text-xl font-semibold">Task<span className="text-coral">hub</span></span>
          </div>
          <p className="eyebrow">Welcome back</p>
          <h2 className="mt-3 font-display text-[34px] font-semibold tracking-tight">Sign in to your hub</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Your team's next great thing is waiting.</p>
          <form onSubmit={submit} className="mt-9 space-y-5">
            <label className="field-label">
              Work email
              <input className="input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field-label">
              Password
              <input className="input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="rounded-lg bg-coral-pale px-3 py-2 text-xs text-coral-deep">{error}</p>}
            <button disabled={loading} className="primary-button w-full py-3">
              {loading ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Workspace({ token, user, onLogout, onUserChange, setToken }: { token: string; user: User; onLogout: () => void; onUserChange: (user: User) => void; setToken: (t: string) => void }) {
  // inactivity lock state
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [showReauth, setShowReauth] = useState(false);
  const inactivityTimer = useRef<number | null>(null);
  const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

  const resetInactivity = () => {
    if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
    inactivityTimer.current = window.setTimeout(() => {
      // lock the session
      setLockedEmail(user.email);
      setShowReauth(true);
      // clear token to force reauth
      localStorage.removeItem('taskhub-token');
      setToken('');
    }, INACTIVITY_MS) as unknown as number;
  };

  useEffect(() => {
    // activity listeners
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handler = () => resetInactivity();
    events.forEach((e) => window.addEventListener(e, handler));
    resetInactivity();
    return () => {
      if (inactivityTimer.current) window.clearTimeout(inactivityTimer.current);
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [user]);

  const handleReauth = async (password: string) => {
    try {
      if (!lockedEmail) throw new Error('No locked user email');
      const result = await api.login(lockedEmail, password);
      localStorage.setItem('taskhub-token', result.token);
      localStorage.setItem('taskhub-user', JSON.stringify(result.user));
      onUserChange(result.user);
      setShowReauth(false);
      setLockedEmail(null);
      setToken(result.token);
      resetInactivity();
    } catch (err) {
      throw err;
    }
  };
  const [view, setView] = useState<View>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isAdmin = user.role === 'super_admin' || user.role === 'admin';
  const canAssign = isAdmin || user.role === 'manager';
  const canViewAudit = isAdmin;
  const canManageStaff = isAdmin;
  const canManageDepartments = isAdmin || user.role === 'manager';
  const canManageUsers = isAdmin || user.role === 'manager';
  const [showProfile, setShowProfile] = useState(false);
  const [profileFullName, setProfileFullName] = useState(user.fullName || '');
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextTasks, nextProjects, nextDepartments] = await Promise.all([
        api.tasks(token),
        api.projects(token),
        api.departments(token),
      ]);
      setTasks(nextTasks);
      setProjects(nextProjects);
      setDepartments(nextDepartments);

      if (canManageUsers) {
        const nextUsers = await api.users(token);
        setUsers(nextUsers);
      }

      if (canViewAudit) {
        const nextAuditLogs = await api.auditLogs(token);
        setAuditLogs(nextAuditLogs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  const handleCreateTask = async (data: Partial<Task> & { title: string }) => {
    try {
      const created = await api.createTask(token, data);
      setTasks((current) => [created, ...current]);
      setNotice('Task created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create task');
    }
  };

  const handleUpdateTask = async (id: string, data: Partial<Task>) => {
    try {
      const updated = await api.updateTask(token, id, data);
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
      setNotice('Task updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update task');
    }
  };

  const handleCreateProject = async (data: Partial<Project> & { name: string }) => {
    try {
      const created = await api.createProject(token, data);
      setProjects((current) => [created, ...current]);
      setNotice('Project created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    }
  };

  const handleUpdateProject = async (id: string, data: Partial<Project>) => {
    try {
      const updated = await api.updateProject(token, id, data);
      setProjects((current) => current.map((p) => (p.id === id ? updated : p)));
      setNotice('Project updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update project');
    }
  };

  const handleCreateUser = async (data: { email: string; password: string; fullName: string; role: Role; department?: string; profilePicture?: string }) => {
    try {
      const created = await api.createUser(token, data);
      setUsers((current) => [created, ...current]);
      setNotice('User invited successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user');
    }
  };

  const handleUpdateUser = async (id: string, data: Partial<Pick<User, 'fullName' | 'role' | 'status' | 'profilePicture' | 'department'>>) => {
    try {
      const updated = await api.updateUser(token, id, data);
      setUsers((current) => current.map((userItem) => (userItem.id === id ? updated : userItem)));
      setNotice('User updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user');
    }
  };

  const handleSaveProfile = async () => {
    setProfileError('');
    setProfileLoading(true);
    try {
      const updated = await api.updateProfile(token, {
        fullName: profileFullName,
        profilePicture,
      });
      onUserChange(updated);
      localStorage.setItem('taskhub-user', JSON.stringify(updated));
      setNotice('Profile updated successfully');
      setShowProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Re-auth modal shown on inactivity lock
  function ReauthModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (password: string) => Promise<void> }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const submit = async () => {
      setError('');
      setLoading(true);
      try {
        await onSubmit(password);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Re-auth failed');
      } finally {
        setLoading(false);
      }
    };
    return (
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Session locked</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">Enter password to continue</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <label className="field-label">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input mt-2" /></label>
            {error && <p className="text-xs text-coral-deep">{error}</p>}
          </div>
          <div className="mt-7 flex justify-end gap-2">
            <button onClick={onClose} className="secondary-button">Cancel</button>
            <button onClick={submit} disabled={loading || !password} className="primary-button">{loading ? 'Verifying...' : 'Unlock'}</button>
          </div>
        </div>
      </div>
    );
  }

  const handleProfilePictureChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePicture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateDepartment = async (data: Partial<Department> & { name: string }) => {
    try {
      const created = await api.createDepartment(token, data);
      setDepartments((current) => [created, ...current]);
      setNotice('Department created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create department');
    }
  };

  const page = useMemo(() => {
    switch (view) {
      case 'tasks':
        return (
          <TasksPage
            tasks={tasks}
            projects={projects}
            users={users}
            token={token}
            currentUser={user}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            canAssign={canAssign}
          />
        );
      case 'projects':
        return <ProjectsPage projects={projects} tasks={tasks} users={users} token={token} onCreateProject={handleCreateProject} onUpdateProject={handleUpdateProject} />;
      case 'staff':
        return <StaffPage users={users} departments={departments} token={token} onCreateUser={handleCreateUser} onUpdateUser={handleUpdateUser} />;
      case 'departments':
        return <DepartmentsPage departments={departments} users={users} token={token} onCreateDepartment={handleCreateDepartment} />;
      case 'audit':
        return <AuditPage auditLogs={auditLogs} currentUser={user} />;
      case 'vouchers':
        return <VouchersPage token={token} currentUser={user} />;
      case 'leaves':
        return <LeavesPage token={token} currentUser={user} />;
      default:
        return (
          <Dashboard
            tasks={tasks}
            projects={projects}
            users={users}
            currentUser={user}
            onViewTasks={() => setView('tasks')}
            onViewProjects={() => setView('projects')}
            onViewStaff={() => setView('staff')}
          />
        );
    }
  }, [view, tasks, projects, users, departments, auditLogs, token, user]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="brand-mark">
          <Sparkles size={17} />
        </div>
        <p>Loading your workspace</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-[252px] flex-col border-r border-line bg-sidebar px-5 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span className="font-display text-xl font-semibold">Task<span className="text-coral">hub</span></span>
        </div>
        <p className="sidebar-heading mt-10">Workspace</p>
        <nav className="mt-3 space-y-1">
          <NavItem active={view === 'dashboard'} label="Dashboard" icon={<LayoutGrid size={17} />} onClick={() => setView('dashboard')} />
          <NavItem active={view === 'tasks'} label="Tasks" icon={<List size={17} />} onClick={() => setView('tasks')} count={tasks.length} />
          <NavItem active={view === 'projects'} label="Projects" icon={<AlignJustify size={17} />} onClick={() => setView('projects')} count={projects.length} />
          <NavItem active={view === 'leaves'} label="Leaves" icon={<Bell size={17} />} onClick={() => setView('leaves')} />
          {canManageStaff && <NavItem active={view === 'staff'} label="Staff" icon={<Users size={17} />} onClick={() => setView('staff')} count={users.length} />}
          {canManageDepartments && <NavItem active={view === 'departments'} label="Departments" icon={<Target size={17} />} onClick={() => setView('departments')} count={departments.length} />}
          {canViewAudit && <NavItem active={view === 'audit'} label="Audit" icon={<Bell size={17} />} onClick={() => setView('audit')} />}
          <NavItem active={view === 'vouchers'} label="Vouchers" icon={<List size={17} />} onClick={() => setView('vouchers')} />
        </nav>
        <div className="mt-auto rounded-2xl border border-line bg-white/60 p-4">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-coral-pale p-2 text-coral-deep">
              <Target size={16} />
            </div>
            <ArrowUpRight size={15} className="text-muted" />
          </div>
          <p className="mt-4 text-sm font-semibold">Workspace pulse</p>
          <p className="mt-1 text-xs leading-5 text-muted">{tasks.filter((task) => task.status === 'done').length} completed tasks this period.</p>
        </div>
        <button onClick={onLogout} className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-sand">
          <LogOut size={18} /> Sign out
        </button>
      </aside>

      <main className="lg:pl-[252px]">
        <header className="border-b border-line bg-white/90 px-5 py-5 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow">Connected workspace</p>
              <h1 className="text-2xl font-semibold">{view === 'dashboard' ? 'Dashboard' : view.charAt(0).toUpperCase() + view.slice(1)}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={loadData} className="secondary-button">Refresh</button>
              <ExportMenu token={token} />
              <button onClick={() => setShowProfile(true)} className="inline-flex items-center gap-2 rounded-full bg-sand px-4 py-2 text-sm text-muted">
                <span className="avatar" style={user.profilePicture ? { backgroundImage: `url(${user.profilePicture})`, backgroundSize: 'cover', color: 'transparent' } : {}}>
                  {!user.profilePicture && (user.fullName ? user.fullName.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase())}
                </span>
                {user.fullName || user.email}
              </button>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-[1600px] px-5 py-6 lg:px-8">
          {notice && <Banner type="success" text={notice} onClose={() => setNotice('')} />}
          {error && <Banner type="error" text={error} onClose={() => setError('')} />}
          {page}
        </section>
      </main>
      {showProfile && (
        <ProfileModal
          fullName={profileFullName}
          picture={profilePicture}
          onFullNameChange={setProfileFullName}
          onPictureChange={handleProfilePictureChange}
          onClose={() => setShowProfile(false)}
          onSave={handleSaveProfile}
          loading={profileLoading}
          error={profileError}
        />
      )}
    </div>
  );
}

function ExportMenu({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const resources = ['users', 'tasks', 'projects', 'departments', 'leaves', 'vouchers', 'audit'];

  const doExport = async (r: string) => {
    setLoading(true);
    try {
      const blob = await api.exportResource(token, r);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${r}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((s) => !s)} className="secondary-button">Export</button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded border bg-white p-2">
          {resources.map((r) => (
            <button key={r} onClick={() => doExport(r)} className="w-full text-left py-1 text-sm">
              {r}
            </button>
          ))}
          <div className="mt-2 text-xs text-muted">{loading ? 'Exporting...' : 'Select resource to download'}</div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }: { icon: ReactNode; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`sidebar-link ${active ? 'active' : ''}`}>
      {icon}
      <span>{label}</span>
      {count !== undefined && <span className="ml-auto rounded-md bg-sand px-2 py-0.5 text-xs text-muted">{count}</span>}
    </button>
  );
}

function ProfileModal({
  fullName,
  picture,
  onFullNameChange,
  onPictureChange,
  onClose,
  onSave,
  loading,
  error,
}: {
  fullName: string;
  picture: string;
  onFullNameChange: (value: string) => void;
  onPictureChange: (file: File | null) => void;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Your profile</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Edit profile</h2>
          </div>
          <button onClick={onClose} className="icon-button">×</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="field-label">Full name
            <input className="input mt-2" value={fullName} onChange={(event) => onFullNameChange(event.target.value)} />
          </label>
          <label className="field-label">Profile picture
            <div className="mt-2 flex items-center gap-3">
              <div className="avatar" style={picture ? { backgroundImage: `url(${picture})`, backgroundSize: 'cover', color: 'transparent' } : {}}> 
                {!picture ? 'Upload' : ''}
              </div>
              <input type="file" accept="image/*" onChange={(event) => onPictureChange(event.target.files?.[0] || null)} className="input" />
            </div>
          </label>
          {error && <p className="rounded-lg bg-coral-pale px-3 py-2 text-xs text-coral-deep">{error}</p>}
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          <button disabled={loading} onClick={onSave} className="primary-button">{loading ? 'Saving...' : 'Save profile'}</button>
        </div>
      </div>
    </div>
  );
}

function Banner({ type, text, onClose }: { type: 'success' | 'error'; text: string; onClose: () => void }) {
  return (
    <div className={`panel mb-5 flex items-start justify-between border ${type === 'error' ? 'border-coral text-coral-deep' : 'border-sage text-sage-deep'}`}>
      <p className="text-sm leading-6">{text}</p>
      <button onClick={onClose} className="icon-button"><X size={16} /></button>
    </div>
  );
}

export default App;
