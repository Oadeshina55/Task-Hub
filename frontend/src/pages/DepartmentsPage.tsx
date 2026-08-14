import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Department, User } from '@/lib/api';

type DepartmentsPageProps = {
  departments: Department[];
  users: User[];
  token: string;
  onCreateDepartment: (data: Partial<Department> & { name: string }) => Promise<void>;
};

export default function DepartmentsPage({ departments, users, token, onCreateDepartment }: DepartmentsPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = departments.filter((department) => `${department.name} ${department.description}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Department management</p>
          <h2 className="section-title">Departments</h2>
          <p className="section-subtitle">Organize teams and assign department heads.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="primary-button"><Plus size={16} /> New department</button>
      </section>

      <section className="panel">
        <label className="field-label">Search departments<input className="input mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or description" /></label>
      </section>

      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[.14em] text-muted">
              <th className="py-3 font-semibold">Department</th>
              <th className="py-3 font-semibold">Head</th>
              <th className="py-3 font-semibold">Members</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((department) => (
              <tr key={department.id}>
                <td className="py-4"><div className="font-medium">{department.name}</div><div className="text-xs text-muted">{department.description || 'No description'}</div></td>
                <td className="py-4 text-sm text-muted">{department.head || 'Unassigned'}</td>
                <td className="py-4 text-sm text-muted">{department.members?.length ?? 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={3} className="py-10 text-center text-sm text-muted">No departments found</td></tr>}
          </tbody>
        </table>
      </section>

      {showCreate && <DepartmentModal users={users} onClose={() => setShowCreate(false)} onCreate={async (data) => { await onCreateDepartment(data); setShowCreate(false); }} />}
    </div>
  );
}

function DepartmentModal({ users, onClose, onCreate }: { users: User[]; onClose: () => void; onCreate: (data: Partial<Department> & { name: string }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [head, setHead] = useState('');

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">New department</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Create department</h2>
          </div>
          <button onClick={onClose} className="icon-button">×</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="field-label">Name<input value={name} onChange={(event) => setName(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Department head<select value={head} onChange={(event) => setHead(event.target.value)} className="input mt-2"><option value="">None</option>{users.map((user) => <option key={user.id} value={user.fullName}>{user.fullName || user.email}</option>)}</select></label>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          <button disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), description, head })} className="primary-button">Create department</button>
        </div>
      </div>
    </div>
  );
}
