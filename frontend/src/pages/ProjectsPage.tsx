import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, Comment, Project, Task, User } from '@/lib/api';

type ProjectsPageProps = {
  projects: Project[];
  tasks: Task[];
  users: User[];
  token: string;
  onCreateProject: (data: Partial<Project> & { name: string }) => Promise<void>;
  onUpdateProject?: (id: string, data: Partial<Project>) => Promise<void>;
};

export default function ProjectsPage({ projects, tasks, users, token, onCreateProject, onUpdateProject }: ProjectsPageProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState('');
  const [projectComments, setProjectComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  const filtered = projects.filter((project) => `${project.name} ${project.client} ${project.department}`.toLowerCase().includes(search.toLowerCase()));

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const relatedTasks = useMemo(
    () => tasks.filter((task) => task.projectId === selectedProjectId || task.project === selectedProject?.name),
    [tasks, selectedProjectId, selectedProject],
  );

  const openProject = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setCommentError('');
    try {
      const comments = await api.projectComments(token, projectId);
      setProjectComments(comments);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to load comments');
    }
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
  };

  const saveEdit = async (id: string, data: Partial<Project>) => {
    if (!onUpdateProject) return;
    await onUpdateProject(id, data);
    setEditingProject(null);
  };

  const closeProject = () => {
    setSelectedProjectId(null);
    setCommentText('');
    setProjectComments([]);
    setCommentError('');
  };

  const addComment = async () => {
    if (!selectedProjectId || !commentText.trim()) return;
    try {
      const comment = await api.addProjectComment(token, selectedProjectId, commentText.trim());
      setProjectComments((current) => [comment, ...current]);
      setCommentText('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Could not add comment');
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Project management</p>
          <h2 className="section-title">Projects</h2>
          <p className="section-subtitle">Create, assign, and monitor project progress.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="primary-button"><Plus size={16} /> New project</button>
      </section>

      <section className="panel">
        <label className="field-label">Search projects<input className="input mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, client, or department" /></label>
      </section>

      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[.14em] text-muted">
              <th className="py-3 font-semibold">Project</th>
              <th className="py-3 font-semibold">Manager</th>
              <th className="py-3 font-semibold">Department</th>
              <th className="py-3 font-semibold">Status</th>
              <th className="py-3 font-semibold">Due</th>
              <th className="py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((project) => (
              <tr key={project.id}>
                <td className="py-4"><p className="font-medium">{project.name}</p><p className="text-xs text-muted">{project.client || 'No client'}</p></td>
                <td className="py-4 text-sm text-muted">{project.manager || 'Unassigned'}</td>
                <td className="py-4 text-sm text-muted">{project.department || 'General'}</td>
                <td className="py-4 text-sm"><span className="tag bg-sand text-ink">{project.status || 'draft'}</span></td>
                <td className="py-4 text-sm text-muted">{project.endDate || 'None'}</td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => openProject(project.id)} className="text-button">View details</button>
                    <button onClick={() => openEdit(project)} className="text-button">Edit</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted">No projects found</td></tr>}
          </tbody>
        </table>
      </section>

      {selectedProject && (
        <section className="panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow">Project details</p>
              <h2 className="section-title">{selectedProject.name}</h2>
              <p className="section-subtitle">{selectedProject.description || 'No description provided.'}</p>
            </div>
            <button onClick={closeProject} className="secondary-button">Close details</button>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-line bg-sand p-4">
              <DetailRow label="Client" value={selectedProject.client || 'Not set'} />
              <DetailRow label="Department" value={selectedProject.department || 'Not set'} />
              <DetailRow label="Manager" value={selectedProject.manager || 'Unassigned'} />
              <DetailRow label="Start date" value={selectedProject.startDate || 'Not set'} />
              <DetailRow label="End date" value={selectedProject.endDate || 'Not set'} />
              <DetailRow label="Status" value={selectedProject.status || 'draft'} />
              <DetailRow label="Priority" value={selectedProject.priority || 'medium'} />
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="field-label">Project updates</p>
                <textarea className="input mt-2 min-h-[120px]" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a project update or comment" />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <button onClick={addComment} className="primary-button">Post update</button>
                  {commentError && <p className="text-xs text-coral-deep">{commentError}</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-white p-4">
                <p className="field-label">Recent comments</p>
                <div className="mt-3 space-y-3">
                  {projectComments.length === 0 ? (
                    <p className="text-sm text-muted">No comments yet.</p>
                  ) : projectComments.map((comment) => (
                    <div key={comment.id} className="rounded-2xl border border-sand bg-sand p-3">
                      <p className="font-medium">{comment.author.fullName || comment.author.email}</p>
                      <p className="text-xs text-muted">{new Date(comment.createdAt).toLocaleString()}</p>
                      <p className="mt-2 text-sm">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-white p-4">
            <h3 className="font-semibold">Related tasks</h3>
            <div className="mt-4 space-y-3">
              {relatedTasks.length === 0 ? (
                <p className="text-sm text-muted">No tasks linked to this project.</p>
              ) : relatedTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-sand p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted">{task.status} • {task.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div className="text-xs text-muted">Due {task.dueDate || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showCreate && <ProjectModal users={users} onClose={() => setShowCreate(false)} onCreate={async (data) => { await onCreateProject(data); setShowCreate(false); }} />}
      {editingProject && <ProjectModal users={users} onClose={() => setEditingProject(null)} initial={editingProject} onSave={saveEdit} />}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted">
      <span>{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function ProjectModal({ users, onClose, onCreate, initial, onSave }: { users: User[]; onClose: () => void; onCreate?: (data: Partial<Project> & { name: string }) => void; initial?: Project | null; onSave?: (id: string, data: Partial<Project>) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [client, setClient] = useState(initial?.client || '');
  const [department, setDepartment] = useState(initial?.department || '');
  const [manager, setManager] = useState(initial?.manager || '');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [members, setMembers] = useState<string[]>(initial?.members || []);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>(initial?.priority || 'medium');
  const [startDate, setStartDate] = useState(initial?.startDate || '');
  const [endDate, setEndDate] = useState(initial?.endDate || '');

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">{initial ? 'Edit project' : 'New project'}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{initial ? 'Update project' : 'Create project'}</h2>
          </div>
          <button onClick={onClose} className="icon-button">×</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="field-label">Project name<input value={name} onChange={(event) => setName(event.target.value)} className="input mt-2" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">Client<input value={client} onChange={(event) => setClient(event.target.value)} className="input mt-2" /></label>
            <label className="field-label">Department<input value={department} onChange={(event) => setDepartment(event.target.value)} className="input mt-2" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">Project manager<select value={manager} onChange={(event) => setManager(event.target.value)} className="input mt-2"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}</select></label>
            <label className="field-label">Status<select value={status} onChange={(event) => setStatus(event.target.value)} className="input mt-2"><option value="draft">Draft</option><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On hold</option><option value="at_risk">At risk</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="archived">Archived</option></select></label>
          </div>
          <label className="field-label">Members<select multiple value={members} onChange={(event) => setMembers(Array.from(event.target.selectedOptions).map((o) => o.value))} className="input mt-2 h-32">
            {users.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
          </select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as any)} className="input mt-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="field-label">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="input mt-2" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="input mt-2" /></label>
            <div />
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          {initial ? (
            <button disabled={!name.trim()} onClick={() => onSave && onSave(initial.id, { name: name.trim(), client, department, manager, members, status, priority, startDate, endDate })} className="primary-button">Save project</button>
          ) : (
            <button disabled={!name.trim()} onClick={() => onCreate && onCreate({ name: name.trim(), client, department, manager, members, status, priority, startDate, endDate })} className="primary-button">Create project</button>
          )}
        </div>
      </div>
    </div>
  );
}
