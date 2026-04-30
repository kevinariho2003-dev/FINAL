import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import '../DonationCycles.css';

export default function ClinicianCycles() {
    const { user } = useAuth();
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState('all');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMedModal, setShowMedModal] = useState(null); // cycle id
    const [showPayModal, setShowPayModal] = useState(null); // cycle id
    const [showUpdateModal, setShowUpdateModal] = useState(null); // cycle obj

    // Create form
    const [matches, setMatches] = useState([]);
    const [createForm, setCreateForm] = useState({ match_id: '', start_date: '' });
    const [creating, setCreating] = useState(false);

    // Med form
    const [medForm, setMedForm] = useState({ drug_name: '', dosage: '', frequency: '', duration: '' });
    const [addingMed, setAddingMed] = useState(false);

    // Payment form
    const [payForm, setPayForm] = useState({ amount: '', payment_method: 'bank_transfer' });
    const [creatingPay, setCreatingPay] = useState(false);

    // Update form
    const [updateForm, setUpdateForm] = useState({ end_date: '', eggs_retrieved: '', outcome: 'pending' });
    const [updating, setUpdating] = useState(false);

    useEffect(() => { fetchCycles(); }, []);

    const fetchCycles = async () => {
        try {
            const res = await api.get('/donation-cycles');
            setCycles(res.data?.data || res.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const fetchApprovedMatches = async () => {
        try {
            const res = await api.get('/matches');
            const all = res.data?.data || res.data || [];
            setMatches(all.filter(m => m.status === 'approved'));
        } catch { /* ignore */ }
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // ── Create Cycle ──
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/donation-cycles', createForm);
            showToast('success', 'Donation cycle created!');
            setShowCreateModal(false);
            setCreateForm({ match_id: '', start_date: '' });
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to create cycle');
        }
        setCreating(false);
    };

    // ── Add Medication ──
    const handleAddMed = async (e) => {
        e.preventDefault();
        setAddingMed(true);
        try {
            await api.post(`/donation-cycles/${showMedModal}/medications`, medForm);
            showToast('success', 'Medication added!');
            setMedForm({ drug_name: '', dosage: '', frequency: '', duration: '' });
            setShowMedModal(null);
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to add medication');
        }
        setAddingMed(false);
    };

    // ── Remove Medication ──
    const handleRemoveMed = async (medId) => {
        try {
            await api.delete(`/medications/${medId}`);
            showToast('success', 'Medication removed');
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to remove');
        }
    };

    // ── Create Payment ──
    const handleCreatePayment = async (e) => {
        e.preventDefault();
        setCreatingPay(true);
        try {
            await api.post('/payments', { cycle_id: showPayModal, ...payForm });
            showToast('success', 'Payment created!');
            setShowPayModal(null);
            setPayForm({ amount: '', payment_method: 'bank_transfer' });
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to create payment');
        }
        setCreatingPay(false);
    };

    // ── Update Payment Status ──
    const handlePaymentStatus = async (paymentId, status) => {
        try {
            await api.patch(`/payments/${paymentId}/status`, { payment_status: status });
            showToast('success', `Payment marked as ${status}`);
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to update');
        }
    };

    // ── Update Cycle ──
    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const payload = { ...updateForm };
            if (!payload.end_date) delete payload.end_date;
            if (!payload.eggs_retrieved) delete payload.eggs_retrieved;
            await api.put(`/donation-cycles/${showUpdateModal.id}`, payload);
            showToast('success', 'Cycle updated!');
            setShowUpdateModal(null);
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to update');
        }
        setUpdating(false);
    };

    const openUpdateModal = (cycle) => {
        setUpdateForm({
            end_date: cycle.end_date?.split('T')[0] || '',
            eggs_retrieved: cycle.eggs_retrieved || '',
            outcome: cycle.outcome,
        });
        setShowUpdateModal(cycle);
    };

    const filteredCycles = filter === 'all' ? cycles : cycles.filter(c => c.outcome === filter);

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">Donation Cycles 🔄</h1>
                <p className="page-subtitle">Manage the full egg donation lifecycle — cycles, medications, and payments</p>
            </div>

            {/* Stats Row */}
            <div className="donor-stats-row" style={{ marginBottom: '1rem' }}>
                <div className="donor-stat fade-in fade-in-delay-1">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-number" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {cycles.length}
                    </div>
                    <div className="stat-desc">Total Cycles</div>
                </div>
                <div className="donor-stat fade-in fade-in-delay-2">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-number" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {cycles.filter(c => c.outcome === 'pending').length}
                    </div>
                    <div className="stat-desc">Active</div>
                </div>
                <div className="donor-stat fade-in fade-in-delay-3">
                    <div className="stat-icon">✅</div>
                    <div className="stat-number" style={{ background: 'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {cycles.filter(c => c.outcome === 'successful').length}
                    </div>
                    <div className="stat-desc">Successful</div>
                </div>
                <div className="donor-stat fade-in fade-in-delay-4">
                    <div className="stat-icon">💳</div>
                    <div className="stat-number" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {cycles.filter(c => c.payment).length}
                    </div>
                    <div className="stat-desc">With Payment</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card fade-in" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['all', 'pending', 'successful', 'unsuccessful', 'cancelled'].map(f => (
                        <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)} style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', textTransform: 'capitalize' }}>
                            {f === 'all' ? 'All Cycles' : f}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={() => { setShowCreateModal(true); fetchApprovedMatches(); }}>
                    ➕ New Cycle
                </button>
            </div>

            {/* Cycles Grid */}
            {filteredCycles.length === 0 ? (
                <div className="card fade-in">
                    <div className="empty-state">
                        <div className="empty-state-icon">🔄</div>
                        <div className="empty-state-text">No donation cycles found</div>
                        <div className="empty-state-sub">Create a cycle from an approved match to get started</div>
                    </div>
                </div>
            ) : (
                <div className="cycles-grid">
                    {filteredCycles.map((cycle, i) => (
                        <div key={cycle.id} className={`cycle-card ${cycle.outcome} fade-in`} style={{ animationDelay: `${i * 60}ms` }}>
                            {/* Header: Donor → Recipient */}
                            <div className="cycle-header">
                                <div className="cycle-pair">
                                    <div className="cycle-avatar donor">
                                        {cycle.donor?.user?.first_name?.[0]}{cycle.donor?.user?.last_name?.[0]}
                                    </div>
                                    <div className="cycle-pair-info">
                                        <span className="cycle-pair-name">{cycle.donor?.user?.first_name} {cycle.donor?.user?.last_name}</span>
                                        <span className="cycle-pair-label">Donor</span>
                                    </div>
                                    <span className="cycle-pair-arrow">→</span>
                                    <div className="cycle-avatar recipient">
                                        {cycle.recipient?.user?.first_name?.[0]}{cycle.recipient?.user?.last_name?.[0]}
                                    </div>
                                    <div className="cycle-pair-info">
                                        <span className="cycle-pair-name">{cycle.recipient?.user?.first_name} {cycle.recipient?.user?.last_name}</span>
                                        <span className="cycle-pair-label">Recipient</span>
                                    </div>
                                </div>
                                <span className={`badge badge-${cycle.outcome}`}>{cycle.outcome}</span>
                            </div>

                            {/* Details */}
                            <div className="cycle-detail-grid">
                                <div className="cycle-detail">
                                    <span className="cycle-detail-label">Start Date</span>
                                    <span className="cycle-detail-value">{formatDate(cycle.start_date)}</span>
                                </div>
                                <div className="cycle-detail">
                                    <span className="cycle-detail-label">End Date</span>
                                    <span className="cycle-detail-value">{formatDate(cycle.end_date)}</span>
                                </div>
                                <div className="cycle-detail">
                                    <span className="cycle-detail-label">Eggs Retrieved</span>
                                    <span className="cycle-detail-value">{cycle.eggs_retrieved ?? '—'}</span>
                                </div>
                                <div className="cycle-detail">
                                    <span className="cycle-detail-label">Payment</span>
                                    {cycle.payment ? (
                                        <span className={`payment-badge ${cycle.payment.payment_status}`}>
                                            UGX {Number(cycle.payment.amount).toLocaleString()} · {cycle.payment.payment_status}
                                        </span>
                                    ) : (
                                        <span className="cycle-detail-value" style={{ color: 'var(--text-muted)' }}>Not created</span>
                                    )}
                                </div>
                            </div>

                            {/* Medications */}
                            {cycle.medications?.length > 0 && (
                                <div className="meds-section">
                                    <div className="meds-title">💊 Medications ({cycle.medications.length})</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {cycle.medications.map(med => (
                                            <span key={med.id} className="med-chip">
                                                {med.drug_name} ({med.dosage})
                                                <button className="med-remove" onClick={() => handleRemoveMed(med.id)} title="Remove">✕</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="cycle-actions">
                                <button className="btn btn-ghost" onClick={() => openUpdateModal(cycle)}>✏️ Update</button>
                                <button className="btn btn-ghost" onClick={() => setShowMedModal(cycle.id)}>💊 Add Med</button>
                                {!cycle.payment && (
                                    <button className="btn btn-ghost" onClick={() => setShowPayModal(cycle.id)}>💰 Create Payment</button>
                                )}
                                {cycle.payment && cycle.payment.payment_status === 'pending' && user.role === 'admin' && (
                                    <button className="btn btn-success" onClick={() => handlePaymentStatus(cycle.payment.id, 'completed')} style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
                                        ✅ Complete Payment
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Create Cycle Modal ── */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h2>🔄 New Donation Cycle</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Approved Match *</label>
                                <select className="form-select" value={createForm.match_id} onChange={e => setCreateForm({ ...createForm, match_id: e.target.value })} required>
                                    <option value="">Select a match...</option>
                                    {matches.map(m => (
                                        <option key={m.id} value={m.id}>
                                            Match #{m.id} — {m.donor?.user?.first_name} → {m.recipient?.user?.first_name} (Score: {m.compatibility_score}%)
                                        </option>
                                    ))}
                                </select>
                                {matches.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>No approved matches available</p>}
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Start Date *</label>
                                <input type="date" className="form-input" value={createForm.start_date} onChange={e => setCreateForm({ ...createForm, start_date: e.target.value })} min={new Date().toISOString().split('T')[0]} required />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Cycle'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Add Medication Modal ── */}
            {showMedModal && (
                <div className="modal-overlay" onClick={() => setShowMedModal(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h2>💊 Prescribe Medication</h2>
                        <form onSubmit={handleAddMed}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Drug Name *</label>
                                <input className="form-input" value={medForm.drug_name} onChange={e => setMedForm({ ...medForm, drug_name: e.target.value })} placeholder="e.g. Follicle-stimulating hormone (FSH)" required />
                            </div>
                            <div className="form-row" style={{ marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Dosage *</label>
                                    <input className="form-input" value={medForm.dosage} onChange={e => setMedForm({ ...medForm, dosage: e.target.value })} placeholder="e.g. 75 IU" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Frequency *</label>
                                    <input className="form-input" value={medForm.frequency} onChange={e => setMedForm({ ...medForm, frequency: e.target.value })} placeholder="e.g. Once daily" required />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Duration *</label>
                                <input className="form-input" value={medForm.duration} onChange={e => setMedForm({ ...medForm, duration: e.target.value })} placeholder="e.g. 10 days" required />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={addingMed}>{addingMed ? 'Adding...' : 'Add Medication'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowMedModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Create Payment Modal ── */}
            {showPayModal && (
                <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h2>💰 Create Payment</h2>
                        <form onSubmit={handleCreatePayment}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Amount (UGX) *</label>
                                <input type="number" className="form-input" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} placeholder="e.g. 500000" min="0" step="1000" required />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Payment Method</label>
                                <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={creatingPay}>{creatingPay ? 'Creating...' : 'Create Payment'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowPayModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Update Cycle Modal ── */}
            {showUpdateModal && (
                <div className="modal-overlay" onClick={() => setShowUpdateModal(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h2>✏️ Update Donation Cycle</h2>
                        <form onSubmit={handleUpdate}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">End Date</label>
                                <input type="date" className="form-input" value={updateForm.end_date} onChange={e => setUpdateForm({ ...updateForm, end_date: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Eggs Retrieved</label>
                                <input type="number" className="form-input" value={updateForm.eggs_retrieved} onChange={e => setUpdateForm({ ...updateForm, eggs_retrieved: e.target.value })} min="0" placeholder="e.g. 12" />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Outcome</label>
                                <select className="form-select" value={updateForm.outcome} onChange={e => setUpdateForm({ ...updateForm, outcome: e.target.value })}>
                                    <option value="pending">Pending</option>
                                    <option value="successful">Successful</option>
                                    <option value="unsuccessful">Unsuccessful</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={updating}>{updating ? 'Updating...' : 'Update Cycle'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowUpdateModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
