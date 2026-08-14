import { useEffect, useState } from 'react';
import { api, User, Voucher } from '@/lib/api';

export default function VouchersPage({ token, currentUser }: { token: string; currentUser: User }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const items = await api.vouchers(token);
      setVouchers(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vouchers');
    }
  };

  useEffect(() => { void load(); }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await api.createVoucher(token, { amount: Number(amount), reason });
      setVouchers((s) => [created, ...s]);
      setAmount('');
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create voucher');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setError('');
    try {
      const updated = await api.updateVoucher(token, id, { status });
      setVouchers((s) => s.map((v) => (v.id === id ? updated : v)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update voucher');
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Vouchers</h2>
            <p className="section-subtitle">Request petty cash in NGN and track approvals.</p>
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="field-label">Amount (NGN)
            <input className="input mt-2" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0" step="0.01" />
          </label>
          <label className="field-label">Reason
            <input className="input mt-2" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex items-end justify-end">
            <button disabled={loading || !amount} className="primary-button">{loading ? 'Submitting...' : 'Request'}</button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-coral-deep">{error}</p>}
      </section>

      <section className="panel">
        <h3 className="section-title">Recent vouchers</h3>
        <div className="mt-4 space-y-3">
          {vouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <div className="text-sm font-semibold">{v.requesterName} — ₦{v.amount.toLocaleString()}</div>
                <div className="text-xs text-muted">{v.reason}</div>
                <div className="text-xs text-muted">Status: {v.status}</div>
              </div>
              <div className="flex gap-2">
                {(currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'manager') && (
                  <>
                    <button onClick={() => updateStatus(v.id, 'approved')} className="secondary-button">Approve</button>
                    <button onClick={() => updateStatus(v.id, 'declined')} className="secondary-button">Decline</button>
                    <button onClick={() => updateStatus(v.id, 'questioned')} className="secondary-button">Question</button>
                  </>
                )}
              </div>
            </div>
          ))}
          {vouchers.length === 0 && <p className="text-sm text-muted">No vouchers yet.</p>}
        </div>
      </section>
    </div>
  );
}
