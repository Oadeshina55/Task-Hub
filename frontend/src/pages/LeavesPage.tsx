import { useEffect, useState } from 'react';
import { api, User } from '@/lib/api';

export default function LeavesPage({ token, currentUser }: { token: string; currentUser: User }) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const next = await api.leaves(token);
      setLeaves(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaves');
    }
  };

  useEffect(() => { void load(); }, [token]);

  const apply = async () => {
    setError('');
    if (!startDate || !endDate) return setError('Select start and end date');
    try {
      const created = await api.createLeave(token, { startDate, endDate, reason });
      setLeaves((c) => [created, ...c]);
      setStartDate(''); setEndDate(''); setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply for leave');
    }
  };

  const approve = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.updateLeave(token, id, { status });
      setLeaves((c) => c.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update leave');
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <p className="eyebrow">Leave management</p>
        <h2 className="section-title">Apply for leave</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="field-label">Start date<input type="date" className="input mt-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
          <label className="field-label">End date<input type="date" className="input mt-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          <label className="field-label">Reason<input className="input mt-2" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        </div>
        <div className="mt-4"><button onClick={apply} className="primary-button">Apply</button>{error && <div className="text-xs text-coral-deep">{error}</div>}</div>
      </section>

      <section className="panel">
        <h3 className="section-title">Recent leave requests</h3>
        <div className="mt-4 space-y-3">
          {leaves.map((l) => (
            <div key={l.id} className="rounded-2xl border border-sand p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{l.user?.fullName || l.user?.email}</div>
                  <div className="text-xs text-muted">{l.startDate} — {l.endDate}</div>
                </div>
                <div className="text-sm">
                  {l.status === 'approved' ? <span className="text-green-600 font-semibold">Approved</span> : l.status === 'rejected' ? <span className="text-red-600 font-semibold">Rejected</span> : <span className="text-muted">Pending</span>}
                </div>
              </div>
              <div className="mt-2 text-sm">{l.reason}</div>
              {currentUser.role === 'super_admin' && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => approve(l.id, 'approved')} disabled={l.status !== 'pending'} className={`px-3 py-1 rounded ${l.status !== 'pending' ? 'opacity-50 cursor-not-allowed' : 'bg-green-600 text-white'}`}>Approve</button>
                  <button onClick={() => approve(l.id, 'rejected')} disabled={l.status !== 'pending'} className={`px-3 py-1 rounded ${l.status !== 'pending' ? 'opacity-50 cursor-not-allowed' : 'bg-red-600 text-white'}`}>Reject</button>
                </div>
              )}
              {l.status !== 'pending' && (
                <div className="mt-2 text-xs text-muted">Processed by: {l.approvedBy?.fullName || l.approvedBy?.email || 'System'} • {l.approvedAt ? new Date(l.approvedAt).toLocaleString() : ''}</div>
              )}
            </div>
          ))}
          {leaves.length === 0 && <p className="text-sm text-muted">No leave requests found.</p>}
        </div>
      </section>
    </div>
  );
}
