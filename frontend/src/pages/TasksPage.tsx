import { List, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, Comment, Project, Status, Task, User } from '@/lib/api';

type TasksPageProps = {
  tasks: Task[];
  projects: Project[];
  users: User[];
  token: string;
  onCreateTask: (data: Partial<Task> & { title: string }) => Promise<void>;
  onUpdateTask: (id: string, data: Partial<Task>) => Promise<void>;
  canAssign: boolean;
  currentUser: User;
};

const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  progress: 'In progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_ORDER: Status[] = ['backlog', 'todo', 'progress', 'blocked', 'review', 'done', 'cancelled'];

export default function TasksPage({ tasks, projects, users, token, onCreateTask, onUpdateTask, canAssign, currentUser }: TasksPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showMyTasks, setShowMyTasks] = useState(currentUser.role === 'member');
  const [showBoard, setShowBoard] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const matchesAssignedToCurrentUser = (task: Task) => {
    const assignedId = (() => {
      if (!task.assignedToId) return '';
      if (typeof task.assignedToId === 'string') return task.assignedToId;
      if ((task.assignedToId as any)._id) return (task.assignedToId as any)._id.toString();
      try { return (task.assignedToId as any).toString(); } catch { return '' }
    })();
    return assignedId === currentUser.id || task.assignedTo === currentUser.fullName || task.assignedTo === currentUser.email;
  };

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = `${task.title} ${task.description} ${task.project} ${task.assignedTo}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesProject = projectFilter === 'all' || task.projectId === projectFilter;
    const matchesMyTasks = !showMyTasks || matchesAssignedToCurrentUser(task);
    return matchesSearch && matchesStatus && matchesProject && matchesMyTasks;
  }), [tasks, search, statusFilter, projectFilter, showMyTasks, currentUser]);

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Task management</p>
          <h2 className="section-title">All tasks</h2>
          <p className="section-subtitle">Live task board, filters, and progress tracking.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setShowBoard((current) => !current)} className="secondary-button">
            <List size={16} /> {showBoard ? 'Show list' : 'Show board'}
          </button>
          <button onClick={() => setShowCreate(true)} className="primary-button"><Plus size={16} /> New task</button>
        </div>
      </section>

      <section className="panel">
        <div className="grid gap-3 md:grid-cols-4">
          <SearchBox value={search} onChange={setSearch} />
          <FilterSelect label="Status" value={statusFilter} options={[{ value: 'all', label: 'All statuses' }, ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_LABELS[status] }))]} onChange={(value) => setStatusFilter(value as Status | 'all')} />
          <FilterSelect label="Project" value={projectFilter} options={[{ value: 'all', label: 'All projects' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} onChange={setProjectFilter} />
          <label className="field-label">
            View
            <select value={showMyTasks ? 'mine' : 'all'} onChange={(event) => setShowMyTasks(event.target.value === 'mine')} className="input mt-2">
              <option value="all">All tasks</option>
              <option value="mine">My tasks</option>
            </select>
          </label>
        </div>
      </section>

      {showBoard ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="panel overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{STATUS_LABELS[status]}</h3>
                <span className="text-xs text-muted">{filteredTasks.filter((task) => task.status === status).length}</span>
              </div>
              <div className="space-y-3">
                {filteredTasks.filter((task) => task.status === status).map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={onUpdateTask} canAssign={canAssign} users={users} token={token} currentUser={currentUser} />
                ))}
                {filteredTasks.filter((task) => task.status === status).length === 0 && <p className="text-sm text-muted">No tasks</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[780px] text-left">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[.14em] text-muted">
                <th className="py-3 font-semibold">Task</th>
                <th className="py-3 font-semibold">Project</th>
                <th className="py-3 font-semibold">Assignee</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="py-3 font-semibold">Due date</th>
                <th className="py-3 font-semibold">Priority</th>
                <th className="py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td className="py-4"><div className="text-sm font-medium">{task.title}</div><div className="text-xs text-muted">{task.description || 'No description'}</div></td>
                  <td className="py-4 text-sm text-muted">{task.project}</td>
                  <td className="py-4 text-sm text-muted">{task.assignedTo || 'Unassigned'}</td>
                  <td className="py-4 text-sm"><span className="tag bg-sand text-ink">{STATUS_LABELS[task.status] || task.status}</span></td>
                  <td className="py-4 text-sm text-muted">{task.dueDate || 'N/A'}</td>
                  <td className="py-4 text-sm"><span className={`tag ${task.priority === 'critical' ? 'bg-coral text-white' : task.priority === 'high' ? 'bg-coral-pale text-coral-deep' : task.priority === 'medium' ? 'bg-amber-pale text-amber-deep' : 'bg-slate-pale text-slate-deep'}`}>{task.priority}</span></td>
                  <td className="py-4 text-right">
                    <button
                      disabled={!canAssign && !(task.assignedToId === currentUser.id || task.assignedTo === currentUser.fullName || task.assignedTo === currentUser.email)}
                      onClick={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                      className="text-button"
                    >
                      Toggle done
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-muted">No tasks found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <TaskModal projects={projects} users={users} onClose={() => setShowCreate(false)} onCreate={async (data) => { await onCreateTask(data); setShowCreate(false); }} />}
    </div>
  );
}

function TaskCard({ task, onUpdate, canAssign, users, token, currentUser }: { task: Task; onUpdate: (id: string, data: Partial<Task>) => Promise<void>; canAssign: boolean; users: User[]; token: string; currentUser: User }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(task.score ?? 0);
  const [progress, setProgress] = useState(task.progress ?? 0);
  const [assigneeId, setAssigneeId] = useState(task.assignedToId ?? '');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentError, setCommentError] = useState('');
  const isAssignee = task.assignedToId === currentUser.id || task.assignedTo === currentUser.fullName || task.assignedTo === currentUser.email;

  useEffect(() => {
    setScore(task.score ?? 0);
    setProgress(task.progress ?? 0);
    setAssigneeId(task.assignedToId ?? '');
  }, [task]);

  useEffect(() => {
    if (!open) return;
    void api.taskComments(token, task.id).then(setComments).catch(() => setComments([]));
  }, [open, task.id, token]);

  const updateProgress = async (value: number) => {
    setProgress(value);
    await onUpdate(task.id, { progress: value });
  };

  const updateScore = async (value: number) => {
    if (!canAssign) return;
    setScore(value);
    await onUpdate(task.id, { score: value });
  };

  const updateAssignee = async (value: string) => {
    if (!canAssign) return;
    setAssigneeId(value);
    await onUpdate(task.id, { assignedToId: value || undefined });
  };

  const updateStatus = async (value: Status) => {
    if (!canAssign && !isAssignee) return;
    await onUpdate(task.id, { status: value, verifiedCompletion: canAssign && value === 'done' ? true : false });
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      setCommentError('');
      const comment = await api.addTaskComment(token, task.id, commentText.trim());
      setComments((current) => [comment, ...current]);
      setCommentText('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Could not add comment');
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold">{task.title}</p>
          <p className="text-xs text-muted">{task.project}</p>
        </div>
        <span className="tag bg-sand text-ink">{task.priority}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>{task.assignedTo || 'Unassigned'}</span>
        <button onClick={() => setOpen((current) => !current)} className="text-button">{open ? 'Hide details' : 'Show details'}</button>
      </div>
      {open && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Progress</label>
              <input className="input mt-2" type="range" min="0" max="100" value={progress} onChange={(event) => void updateProgress(Number(event.target.value))} />
              <div className="mt-2 text-xs text-muted">{progress}% complete</div>
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="input mt-2" value={task.status} onChange={(event) => void updateStatus(event.target.value as Status)} disabled={!canAssign && !isAssignee}>
                {STATUS_ORDER.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>{STATUS_LABELS[statusOption]}</option>
                ))}
              </select>
              <div className="mt-2 text-xs text-muted">{isAssignee ? 'Update status for your assigned task' : canAssign ? 'Admin/manager status control' : 'Only assigned staff can update task status'}</div>
            </div>
          </div>
          <div>
            <label className="field-label">Assignee</label>
            {canAssign ? (
              <select value={assigneeId} onChange={(event) => void updateAssignee(event.target.value)} className="input mt-2 w-full">
                <option value="">Unassigned</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}
              </select>
            ) : (
              <div className="mt-2 rounded-2xl border border-sand bg-sand p-3 text-sm text-muted">Only admins and managers can assign tasks.</div>
            )}
            {task.verifiedCompletion !== undefined && (
              <div className="mt-3 rounded-2xl border border-sand bg-sand p-3 text-sm">
                Verified completion: {task.verifiedCompletion ? 'Yes' : 'No'}
              </div>
            )}
          </div>
          <div>
            <p className="field-label">Comments</p>
            <div className="mt-2 space-y-2">
              <textarea className="input min-h-[90px]" value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment" />
              <div className="flex items-center justify-between gap-3">
                <button onClick={addComment} className="primary-button" type="button">Add comment</button>
                {commentError && <p className="text-xs text-coral-deep">{commentError}</p>}
              </div>
              <div className="space-y-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-sand bg-sand p-3 text-sm">
                    <div className="font-semibold">{comment.author.fullName || comment.author.email}</div>
                    <div className="text-muted text-xs">{new Date(comment.createdAt).toLocaleString()}</div>
                    <p className="mt-2 text-sm">{comment.text}</p>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskModal({ projects, users, onClose, onCreate }: { projects: Project[]; users: User[]; onClose: () => void; onCreate: (data: Partial<Task> & { title: string }) => void }) {
  const [title, setTitle] = useState('');
  const [project, setProject] = useState(projects[0]?.id || '');
  const [status, setStatus] = useState<Status>('todo');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">New task</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Create task</h2>
          </div>
          <button onClick={onClose} className="icon-button">×</button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="field-label">Task title<input value={title} onChange={(event) => setTitle(event.target.value)} className="input mt-2" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">Project<select value={project} onChange={(event) => setProject(event.target.value)} className="input mt-2"><option value="">General</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label className="field-label">Assignee<select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)} className="input mt-2"><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.email}</option>)}</select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-label">Status<select value={status} onChange={(event) => setStatus(event.target.value as Status)} className="input mt-2">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field-label">Priority<select value={priority} onChange={(event) => setPriority(event.target.value as any)} className="input mt-2"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
          </div>
          <label className="field-label">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="input mt-2" /></label>
          <label className="field-label">Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="input mt-2" /></label>
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <button onClick={onClose} className="secondary-button">Cancel</button>
          <button disabled={!title.trim() || !project} onClick={() => onCreate({ title: title.trim(), projectId: project || undefined, status, priority, assignedToId: assignedToId || undefined, dueDate, startDate })} className="primary-button">Create task</button>
        </div>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="field-label">
      Search
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="input pl-10" placeholder="Search tasks" />
      </div>
    </label>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string | Status; options: { value: string; label: string }[]; onChange: (value: string | Status) => void }) {
  return (
    <label className="field-label">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as string | Status)} className="input mt-2">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

