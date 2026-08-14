import { Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AuditLog, User } from '@/lib/api';

type AuditPageProps = {
  auditLogs: AuditLog[];
  currentUser: User;
};

export default function AuditPage({ auditLogs, currentUser }: AuditPageProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => auditLogs.filter((log) => {
    const searchString = `${log.actor?.fullName || ''} ${log.action} ${log.targetType} ${log.targetId} ${JSON.stringify(log.metadata)}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  }), [auditLogs, search]);

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Audit logs</p>
          <h2 className="section-title">Activity log</h2>
          <p className="section-subtitle">Tracked system activity for security and compliance.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-sand px-4 py-2 text-sm text-muted">
          <ShieldCheck size={16} /> {currentUser.role === 'super_admin' ? 'Super admin' : currentUser.role}
        </div>
      </section>

      <section className="panel">
        <label className="field-label">Search activity<div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-3 text-muted" size={16} /><input className="input pl-10" placeholder="Search audit entries" value={search} onChange={(event) => setSearch(event.target.value)} /></div></label>
      </section>

      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[780px] text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-[.14em] text-muted">
              <th className="py-3 font-semibold">When</th>
              <th className="py-3 font-semibold">Who</th>
              <th className="py-3 font-semibold">Action</th>
              <th className="py-3 font-semibold">Target</th>
              <th className="py-3 font-semibold">Changes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((log) => (
              <tr key={log.id}>
                <td className="py-4 text-sm text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="py-4 text-sm text-ink">{log.actor?.fullName || log.actor?.email || 'Unknown'}</td>
                <td className="py-4 text-sm text-muted">{log.action}</td>
                <td className="py-4 text-sm">{log.targetType}{log.targetId ? ` #${log.targetId}` : ''}</td>
                <td className="py-4 text-sm text-muted">{log.oldValue ? 'Edited' : 'Created'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-muted">No audit entries match your search</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
