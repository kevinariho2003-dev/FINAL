import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import '../DonationCycles.css';
import './ClinicianCycles.css';

const FILTERS = ['all', 'pending', 'successful', 'unsuccessful', 'cancelled'];

function Icon({ name, size = 18 }) {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
    };

    const paths = {
        cycle: <><path d="M20 11a8 8 0 0 0-14.9-4" /><path d="M4 5v5h5" /><path d="M4 13a8 8 0 0 0 14.9 4" /><path d="M20 19v-5h-5" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
        check: <path d="M20 6 9 17l-5-5" />,
        card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
        plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
        arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
        edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
        pill: <><path d="m10.5 20.5 10-10a4.24 4.24 0 0 0-6-6l-10 10a4.24 4.24 0 0 0 6 6Z" /><path d="m8.5 8.5 7 7" /></>,
        wallet: <><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" /><path d="M16 13h.01" /></>,
        trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></>,
        calendar: <><path d="M8 2v4" /><path d="M16 2v4" /><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18" /></>,
        egg: <path d="M12 22c4 0 7-3.2 7-8.2C19 8.5 15.7 2 12 2S5 8.5 5 13.8C5 18.8 8 22 12 22Z" />,
        alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
        search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
        save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
        x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    };

    return <svg className="cc-svg" {...common}>{paths[name]}</svg>;
}

export default function ClinicianCycles() {
    const { user } = useAuth();
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState('all');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMedModal, setShowMedModal] = useState(null);
    const [showPayModal, setShowPayModal] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(null);

    const [matches, setMatches] = useState([]);
    const [createForm, setCreateForm] = useState({ match_id: '', start_date: '' });
    const [creating, setCreating] = useState(false);

    const [medForm, setMedForm] = useState({ drug_name: '', dosage: '', frequency: '', duration: '' });
    const [addingMed, setAddingMed] = useState(false);

    const [payForm, setPayForm] = useState({ amount: '', payment_method: 'bank_transfer', payment_stage: 'initial', notes: '' });
    const [creatingPay, setCreatingPay] = useState(false);

    const [updateForm, setUpdateForm] = useState({ end_date: '', eggs_retrieved: '', outcome: 'pending' });
    const [updating, setUpdating] = useState(false);

    useEffect(() => { fetchCycles(); }, []);

    const fetchCycles = async () => {
        try {
            const res = await api.get('/donation-cycles');
            setCycles(res.data?.data || res.data || []);
        } catch { /* keep the page visible */ }
        finally { setLoading(false); }
    };

    const fetchApprovedMatches = async () => {
        try {
            const res = await api.get('/matches');
            const all = res.data?.data || res.data || [];
            setMatches(all.filter(m => m.status === 'approved'));
        } catch { /* ignore */ }
    };

    const openCreateCycle = () => {
        setShowCreateModal(true);
        fetchApprovedMatches();
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            await api.post('/donation-cycles', createForm);
            showToast('success', 'Donation cycle created.');
            setShowCreateModal(false);
            setCreateForm({ match_id: '', start_date: '' });
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to create cycle');
        }
        setCreating(false);
    };

    const handleAddMed = async (e) => {
        e.preventDefault();
        setAddingMed(true);
        try {
            await api.post(`/donation-cycles/${showMedModal}/medications`, medForm);
            showToast('success', 'Medication added.');
            setMedForm({ drug_name: '', dosage: '', frequency: '', duration: '' });
            setShowMedModal(null);
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to add medication');
        }
        setAddingMed(false);
    };

    const handleRemoveMed = async (medId) => {
        try {
            await api.delete(`/medications/${medId}`);
            showToast('success', 'Medication removed.');
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to remove medication');
        }
    };

    const handleCreatePayment = async (e) => {
        e.preventDefault();
        setCreatingPay(true);
        try {
            const res = await api.post('/payments', { cycle_id: showPayModal, ...payForm });
            showToast('success', `${payForm.payment_stage === 'initial' ? 'Initial (50%)' : 'Final (50%)'} compensation recorded.`);
            setShowPayModal(null);
            setPayForm({ amount: '', payment_method: 'bank_transfer', payment_stage: 'initial', notes: '' });
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to create compensation record');
        }
        setCreatingPay(false);
    };

    const handlePaymentStatus = async (paymentId, status) => {
        try {
            await api.patch(`/payments/${paymentId}/status`, { payment_status: status });
            showToast('success', `Payment marked as ${status}.`);
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to update payment');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const payload = { ...updateForm };
            if (!payload.end_date) delete payload.end_date;
            if (!payload.eggs_retrieved) delete payload.eggs_retrieved;
            await api.put(`/donation-cycles/${showUpdateModal.id}`, payload);
            showToast('success', 'Cycle updated.');
            setShowUpdateModal(null);
            fetchCycles();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to update cycle');
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
    const activeCount = cycles.filter(c => c.outcome === 'pending').length;
    const successfulCount = cycles.filter(c => c.outcome === 'successful').length;
    const paidCount = cycles.filter(c => c.payments?.length > 0).length;

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page clinician-cycles-page">
            <section className="cc-hero fade-in">
                <div>
                    <p className="cc-kicker">Clinic operations</p>
                    <h1>Donation Cycles</h1>
                    <p>Manage approved donor-recipient cycles, medication steps, outcomes, and donor compensation from one clinical workspace.</p>
                </div>
                <button className="cc-primary-action" onClick={openCreateCycle}>
                    <Icon name="plus" size={18} />
                    New Cycle
                </button>
            </section>

            <section className="cc-stats-grid" aria-label="Cycle summary">
                <div className="cc-stat-card">
                    <span className="cc-stat-icon cc-indigo"><Icon name="cycle" /></span>
                    <strong>{cycles.length}</strong>
                    <span>Total Cycles</span>
                </div>
                <div className="cc-stat-card">
                    <span className="cc-stat-icon cc-amber"><Icon name="clock" /></span>
                    <strong>{activeCount}</strong>
                    <span>Active</span>
                </div>
                <div className="cc-stat-card">
                    <span className="cc-stat-icon cc-green"><Icon name="check" /></span>
                    <strong>{successfulCount}</strong>
                    <span>Successful</span>
                </div>
                <div className="cc-stat-card">
                    <span className="cc-stat-icon cc-teal"><Icon name="card" /></span>
                    <strong>{paidCount}</strong>
                    <span>With Compensation</span>
                </div>
            </section>

            <section className="cc-toolbar fade-in">
                <div>
                    <h2>All Cycles</h2>
                    <p>Filter by outcome without losing the cycle creation action.</p>
                </div>
                <div className="cc-filter-group">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            className={`cc-filter ${filter === f ? 'is-active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All Cycles' : f}
                        </button>
                    ))}
                </div>
            </section>

            {filteredCycles.length === 0 ? (
                <section className="cc-empty fade-in">
                    <div className="cc-empty-visual"><Icon name="search" size={48} /></div>
                    <div>
                        <h3>No donation cycles found</h3>
                        <p>Create a cycle from an approved match and it will appear here with medications, payments, and outcome tracking.</p>
                    </div>
                    <button className="cc-empty-action" onClick={openCreateCycle}>
                        <Icon name="plus" size={18} />
                        Create New Cycle
                    </button>
                </section>
            ) : (
                <section className="cc-cycles-grid">
                    {filteredCycles.map((cycle, i) => {
                        const serviceFee = cycle.payments?.find(p => p.payment_stage === 'service_fee');
                        const initialPay = cycle.payments?.find(p => p.payment_stage === 'initial');
                        const finalPay = cycle.payments?.find(p => p.payment_stage === 'final');
                        const paidStages = (cycle.payments || [])
                            .filter(p => ['pending', 'processing', 'completed'].includes(p.payment_status))
                            .map(p => p.payment_stage);
                        const allPaid = paidStages.includes('initial') && paidStages.includes('final');
                        const pendingPayments = (cycle.payments || []).filter(p => p.payment_status === 'pending');

                        return (
                            <article key={cycle.id} className={`cc-cycle-card ${cycle.outcome} fade-in`} style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="cc-cycle-top">
                                    <div className="cc-pair">
                                        <div className="cc-person">
                                            <span className="cc-avatar cc-donor">
                                                {cycle.donor?.user?.first_name?.[0]}{cycle.donor?.user?.last_name?.[0]}
                                            </span>
                                            <div>
                                                <strong>{cycle.donor?.user?.first_name} {cycle.donor?.user?.last_name}</strong>
                                                <span>Donor</span>
                                            </div>
                                        </div>
                                        <span className="cc-pair-link"><Icon name="arrow" size={18} /></span>
                                        <div className="cc-person">
                                            <span className="cc-avatar cc-recipient">
                                                {cycle.recipient?.user?.first_name?.[0]}{cycle.recipient?.user?.last_name?.[0]}
                                            </span>
                                            <div>
                                                <strong>{cycle.recipient?.user?.first_name} {cycle.recipient?.user?.last_name}</strong>
                                                <span>Recipient</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`cc-status cc-status-${cycle.outcome}`}>{cycle.outcome}</span>
                                </div>

                                <div className="cc-detail-grid">
                                    <div className="cc-detail">
                                        <Icon name="calendar" size={16} />
                                        <span>Start Date</span>
                                        <strong>{formatDate(cycle.start_date)}</strong>
                                    </div>
                                    <div className="cc-detail">
                                        <Icon name="calendar" size={16} />
                                        <span>End Date</span>
                                        <strong>{formatDate(cycle.end_date)}</strong>
                                    </div>
                                    <div className="cc-detail">
                                        <Icon name="egg" size={16} />
                                        <span>Eggs Retrieved</span>
                                        <strong>{cycle.eggs_retrieved ?? '-'}</strong>
                                    </div>
                                     <div className="cc-detail cc-detail-wide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gridColumn: 'span 2' }}>
                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                             <Icon name={serviceFee ? 'card' : 'alert'} size={16} />
                                             <span>Recipient Service Fee:</span>
                                             {serviceFee ? (
                                                 <strong style={{ marginLeft: '0.25rem' }}>
                                                     UGX {Number(serviceFee.amount).toLocaleString()} — <span style={{ color: serviceFee.payment_status === 'processing' ? '#d97706' : serviceFee.payment_status === 'completed' ? '#16a34a' : 'inherit', fontWeight: 700 }}>{serviceFee.payment_status}</span>
                                                 </strong>
                                             ) : (
                                                 <strong className="cc-warning" style={{ marginLeft: '0.25rem' }}>Not yet paid</strong>
                                             )}
                                         </div>
                                         {serviceFee && serviceFee.payment_status === 'processing' && (
                                             <button 
                                                 className="btn btn-primary"
                                                 onClick={() => handlePaymentStatus(serviceFee.id, 'completed')}
                                                 style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                             >
                                                 Approve Fee
                                             </button>
                                         )}
                                     </div>
                                </div>

                                {/* ── Donor Compensation Summary ── */}
                                <div className="cc-meds-section" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                                    <div className="cc-section-title" style={{ color: '#166534' }}><Icon name="wallet" size={16} /> Donor Compensation</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div style={{ padding: '0.6rem 0.75rem', borderRadius: 12, border: '1px solid #d1fae5', background: '#fff' }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Initial (50%)</div>
                                            {initialPay ? (
                                                <>
                                                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: initialPay.payment_status === 'completed' ? '#15803d' : '#b45309' }}>
                                                        UGX {Number(initialPay.amount).toLocaleString()}
                                                    </div>
                                                    <span className={`payment-badge ${initialPay.payment_status}`} style={{ marginTop: '0.25rem' }}>
                                                        {initialPay.payment_status}
                                                    </span>
                                                </>
                                            ) : (
                                                <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700 }}>Not recorded</div>
                                            )}
                                        </div>
                                        <div style={{ padding: '0.6rem 0.75rem', borderRadius: 12, border: '1px solid #d1fae5', background: '#fff' }}>
                                            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>Final (50%)</div>
                                            {finalPay ? (
                                                <>
                                                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: finalPay.payment_status === 'completed' ? '#15803d' : '#b45309' }}>
                                                        UGX {Number(finalPay.amount).toLocaleString()}
                                                    </div>
                                                    <span className={`payment-badge ${finalPay.payment_status}`} style={{ marginTop: '0.25rem' }}>
                                                        {finalPay.payment_status}
                                                    </span>
                                                </>
                                            ) : (
                                                <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700 }}>Not recorded</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {cycle.medications?.length > 0 && (
                                    <div className="cc-meds-section">
                                        <div className="cc-section-title"><Icon name="pill" size={16} /> Medications ({cycle.medications.length})</div>
                                        <div className="cc-med-list">
                                            {cycle.medications.map(med => (
                                                <span key={med.id} className="cc-med-chip">
                                                    {med.drug_name} ({med.dosage})
                                                    <button className="cc-chip-remove" onClick={() => handleRemoveMed(med.id)} title="Remove medication">
                                                        <Icon name="x" size={13} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="cc-actions">
                                    <button className="cc-action-btn" onClick={() => openUpdateModal(cycle)}><Icon name="edit" size={16} /> Update</button>
                                    <button className="cc-action-btn" onClick={() => setShowMedModal(cycle.id)}><Icon name="pill" size={16} /> Add Med</button>
                                    {!allPaid && (
                                        <button className="cc-action-btn cc-action-green" onClick={() => setShowPayModal(cycle.id)}>
                                            <Icon name="wallet" size={16} />
                                            Compensate Donor
                                        </button>
                                    )}
                                    {pendingPayments.length > 0 && (
                                        pendingPayments.map(pp => (
                                            <button key={pp.id} className="cc-action-btn cc-action-solid" onClick={() => handlePaymentStatus(pp.id, 'completed')}>
                                                <Icon name="check" size={16} />
                                                Mark {pp.payment_stage === 'initial' ? 'Initial' : 'Final'} Paid
                                            </button>
                                        ))
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-card cc-modal" onClick={e => e.stopPropagation()}>
                        <h2><Icon name="cycle" size={22} /> New Donation Cycle</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Approved Match *</label>
                                <select className="form-select" value={createForm.match_id} onChange={e => setCreateForm({ ...createForm, match_id: e.target.value })} required>
                                    <option value="">Select a match...</option>
                                    {matches.map(m => (
                                        <option key={m.id} value={m.id}>
                                            Match #{m.id} - {m.donor?.user?.first_name} to {m.recipient?.user?.first_name} (Score: {m.compatibility_score || m.match_score}%)
                                        </option>
                                    ))}
                                </select>
                                {matches.length === 0 && <p className="cc-field-note">No approved matches are available yet.</p>}
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Start Date *</label>
                                <input type="date" className="form-input" value={createForm.start_date} onChange={e => setCreateForm({ ...createForm, start_date: e.target.value })} min={new Date().toISOString().split('T')[0]} required />
                            </div>
                            <div className="cc-modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={creating}><Icon name="save" size={16} /> {creating ? 'Creating...' : 'Create Cycle'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMedModal && (
                <div className="modal-overlay" onClick={() => setShowMedModal(null)}>
                    <div className="modal-card cc-modal" onClick={e => e.stopPropagation()}>
                        <h2><Icon name="pill" size={22} /> Prescribe Medication</h2>
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
                            <div className="cc-modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={addingMed}><Icon name="save" size={16} /> {addingMed ? 'Adding...' : 'Add Medication'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowMedModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showPayModal && (
                <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
                    <div className="modal-card cc-modal" onClick={e => e.stopPropagation()}>
                        <h2><Icon name="wallet" size={22} /> Record Donor Compensation</h2>
                        <p className="cc-modal-note">
                            The clinic records donor compensation after the recipient service fee is handled. Use this for bank, mobile money, or cash payments.
                        </p>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Compensation Stage *</label>
                            <div className="cc-stage-select">
                                {['initial', 'final'].map(stage => (
                                    <button
                                        key={stage}
                                        type="button"
                                        onClick={() => setPayForm({ ...payForm, payment_stage: stage })}
                                        className={payForm.payment_stage === stage ? 'is-selected' : ''}
                                    >
                                        {stage === 'initial' ? 'Initial (50%)' : 'Final (50%)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleCreatePayment}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Amount (UGX) *</label>
                                <input type="number" className="form-input" value={payForm.amount}
                                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                    placeholder="e.g. 500000" min="0" step="1000" required />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Payment Method</label>
                                <select className="form-select" value={payForm.payment_method}
                                    onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="mobile_money">Mobile Money</option>
                                    <option value="cash">Cash</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Notes (optional)</label>
                                <input className="form-input" value={payForm.notes}
                                    onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                                    placeholder="e.g. Initial compensation paid via mobile money" />
                            </div>

                            <div className="cc-modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={creatingPay}><Icon name="save" size={16} /> {creatingPay ? 'Saving...' : 'Record Compensation'}</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowPayModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showUpdateModal && (
                <div className="modal-overlay" onClick={() => setShowUpdateModal(null)}>
                    <div className="modal-card cc-modal" onClick={e => e.stopPropagation()}>
                        <h2><Icon name="edit" size={22} /> Update Donation Cycle</h2>
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
                            <div className="cc-modal-actions">
                                <button type="submit" className="btn btn-primary" disabled={updating}><Icon name="save" size={16} /> {updating ? 'Updating...' : 'Update Cycle'}</button>
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
