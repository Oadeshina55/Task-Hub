import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Role, User, UserStatus, Department } from '@/lib/api';

type StaffPageProps = {
  users: User[];
  departments: Department[];
  token: string;
  onCreateUser: (data: { email: string; password: string; fullName: string; role: Role; department?: string; profilePicture?: string }) => Promise<void>;
  onUpdateUser: (id: string, data: Partial<Pick<User, 'fullName' | 'role' | 'status' | 'profilePicture' | 'department'>>) => Promise<void>;
};

const roleLabels: Record<Role, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};

export default function StaffPage({ users, token, onCreateUser, onUpdateUser, departments }: StaffPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const filtered = users.filter((user) => `${user.fullName} ${user.email} ${user.role}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Staff management</p>
          <h2 className="section-title">Team members</h2>
          <p className="section-subtitle">Manage user accounts, roles, and status.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="primary-button"><Plus size={16} /> Invite staff</button>
      </section>

      <section className="panel">
        <label className="field-label">Search staff<input className="input mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" /></label>
      </section>

      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[.14em] text-muted">
              <th className="py-3 font-semibold">Account</th>
              <th className="py-3 font-semibold">Role</th>
              <th className="py-3 font-semibold">Status</th>
              <th className="py-3 font-semibold">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((user) => (
              <tr key={user.id}>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <span className="avatar" style={user.profilePicture ? { backgroundImage: `url(${user.profilePicture})`, backgroundSize: 'cover', color: 'transparent' } : {}}>{!user.profilePicture && (user.fullName ? user.fullName.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase())}</span>
                    <div>
                      <div className="font-medium">{user.fullName || 'Unnamed'}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-sm">
                  <select value={user.role} onChange={(event) => void onUpdateUser(user.id, { role: event.target.value as Role })} className="table-select">
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
                <td className="py-4 text-sm">
                  <select value={user.status} onChange={(event) => void onUpdateUser(user.id, { status: event.target.value as any })} className="table-select">
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </td>
                <td className="py-4 text-sm text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="py-4 text-right">
                  <button onClick={() => setEditingUser(user)} className="text-button">Edit</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted">No staff entries found</td></tr>}
          </tbody>
        </table>
      </section>

      {showCreate && <UserModal departments={departments} onClose={() => setShowCreate(false)} onCreate={async (data) => { await onCreateUser(data); setShowCreate(false); }} />}
      {editingUser && <UserEditModal departments={departments} user={editingUser} onClose={() => setEditingUser(null)} onSave={async (data) => { await onUpdateUser(editingUser.id, data); setEditingUser(null); }} />}
    </div>
  );
}

function UserModal({ departments, onClose, onCreate }: { departments: Department[]; onClose: () => void; onCreate: (data: { email: string; password: string; fullName: string; role: Role; department?: string }) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [department, setDepartment] = useState('');

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Invite staff</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Create account</h2>
          </div>
          <button onClick={onClose} className="icon-button">×</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="field-label">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Temporary password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Department<select value={department} onChange={(event) => setDepartment(event.target.value)} className="input mt-2">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select></label>
          <label className="field-label">Role<select value={role} onChange={(event) => setRole(event.target.value as Role)} className="input mt-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          <button disabled={!fullName || !email || password.length < 6} onClick={() => onCreate({ fullName, email, password, role, department })} className="primary-button">Create account</button>
        </div>
      </div>
    </div>
  );
}

function UserEditModal({ departments, user, onClose, onSave }: { departments: Department[]; user: User; onClose: () => void; onSave: (data: Partial<Pick<User, 'fullName' | 'role' | 'status' | 'profilePicture' | 'department'>>) => Promise<void> }) {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || '');
  const [department, setDepartment] = useState(user.department || '');

  const handleProfileChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePicture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">Edit staff profile</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Update user</h2>
          </div>
          <button onClick={onClose} className="icon-button">×</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="field-label">Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Role<select value={role} onChange={(event) => setRole(event.target.value as Role)} className="input mt-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field-label">Status<select value={status} onChange={(event) => setStatus(event.target.value as UserStatus)} className="input mt-2"><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
          <label className="field-label">Profile picture
            <div className="mt-2 flex items-center gap-3">
              <div className="avatar" style={profilePicture ? { backgroundImage: `url(${profilePicture})`, backgroundSize: 'cover', color: 'transparent' } : {}}>{!profilePicture ? 'Upload' : ''}</div>
              <input type="file" accept="image/*" onChange={(event) => handleProfileChange(event.target.files?.[0] || null)} className="input" />
            </div>
          </label>
          <label className="field-label">Department<select value={department} onChange={(event) => setDepartment(event.target.value)} className="input mt-2">
            <option value="">Select department</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select></label>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          <button onClick={() => onSave({ fullName, role, status, profilePicture, department })} className="primary-button">Save changes</button>
        </div>
      </div>
    </div>
  );
}
