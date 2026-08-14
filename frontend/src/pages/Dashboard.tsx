import { ArrowUpRight, ShieldCheck, Target, Users } from 'lucide-react';
import { Project, Task, User } from '@/lib/api';

type DashboardProps = {
  tasks: Task[];
  projects: Project[];
  users: User[];
  currentUser: User;
  onViewTasks: () => void;
  onViewProjects: () => void;
  onViewStaff: () => void;
};

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  progress: 'In progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

export default function Dashboard({ tasks, projects, users, currentUser, onViewTasks, onViewProjects, onViewStaff }: DashboardProps) {
  const openTasks = tasks.filter((task) => task.status !== 'done' && task.status !== 'cancelled').length;
  const overdueTasks = tasks.filter((task) => task.dueDate && task.dueDate.toLowerCase().includes('today') === false && task.status !== 'done' && task.status !== 'cancelled').length;
  const completedToday = tasks.filter((task) => task.status === 'done' && task.updatedAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const activeProjects = projects.filter((project) => project.status === 'active').length;
  const completedProjects = projects.filter((project) => project.status === 'completed').length;
  const teamSize = users.length;

  const topStatuses = Object.entries(
    tasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({ status, count })).slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-3 text-3xl font-semibold">Hello, {currentUser.fullName || currentUser.email}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">Your operational hub is connected to live project and task data.</p>
          </div>
          <button onClick={onViewTasks} className="primary-button">
            Go to tasks <ArrowUpRight size={16} />
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">My tasks</h2>
            <p className="section-subtitle">Tasks assigned to you</p>
          </div>
          <button onClick={onViewTasks} className="text-button">View all</button>
        </div>
        <div className="mt-4 space-y-3">
          {tasks.filter((t) => (t.assignedToId || t.assignedTo) && ((t.assignedToId && t.assignedToId === currentUser.id) || (t.assignedTo && t.assignedTo === currentUser.fullName))).slice(0,5).map((task) => (
            <div key={task.id} className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="text-sm font-semibold">{task.title}</div>
                <div className="text-xs text-muted">{task.project} · {task.priority}</div>
              </div>
              <div className="text-xs text-muted">{STATUS_LABELS[task.status] || task.status}</div>
            </div>
          ))}
          {tasks.filter((t) => (t.assignedToId || t.assignedTo) && ((t.assignedToId && t.assignedToId === currentUser.id) || (t.assignedTo && t.assignedTo === currentUser.fullName))).length === 0 && (
            <p className="text-sm text-muted">No tasks assigned to you.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={openTasks} detail="Under action" icon={<Target size={18} />} color="coral" />
        <StatCard label="Overdue tasks" value={overdueTasks} detail="Need attention" icon={<ShieldCheck size={18} />} color="blue" />
        <StatCard label="Active projects" value={activeProjects} detail="In progress" icon={<Users size={18} />} color="sage" />
        <StatCard label="Team size" value={teamSize} detail="Current members" icon={<Users size={18} />} color="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Project pulse</h2>
              <p className="section-subtitle">Track project states and team delivery.</p>
            </div>
            <button onClick={onViewProjects} className="text-button">View projects</button>
          </div>
          <div className="mt-6 space-y-4">
            <OverviewRow label="Projects active" value={String(activeProjects)} />
            <OverviewRow label="Projects completed" value={String(completedProjects)} />
            <OverviewRow label="Tasks completed today" value={String(completedToday)} />
            <OverviewRow label="Key statuses" value={topStatuses.map((item) => `${STATUS_LABELS[item.status] || item.status}: ${item.count}`).join(' · ')} />
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Team snapshot</h2>
              <p className="section-subtitle">Quick access to staff and roles.</p>
            </div>
            <button onClick={onViewStaff} className="text-button">View team</button>
          </div>
          <div className="mt-6 space-y-4">
            <TeamRow label="Total team" value={String(users.length)} />
            <TeamRow label="Admin users" value={String(users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length)} />
            <TeamRow label="Managers" value={String(users.filter((u) => u.role === 'manager').length)} />
            <TeamRow label="Active accounts" value={String(users.filter((u) => u.status === 'active').length)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, icon, color }: { label: string; value: number; detail: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="ml-auto text-right">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-1 font-display text-[30px] font-semibold leading-none">{value}</p>
      </div>
      <div className="absolute bottom-4 left-5 text-xs text-muted">{detail}</div>
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-4 text-sm text-muted">
      <span>{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function TeamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-4 text-sm text-muted">
      <span>{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
