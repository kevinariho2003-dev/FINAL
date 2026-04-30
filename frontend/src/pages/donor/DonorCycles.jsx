import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import '../DonationCycles.css';

export default function DonorCycles() {
    const { user } = useAuth();
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCycles = async () => {
            try {
                const res = await api.get('/donation-cycles');
                setCycles(res.data?.data || res.data || []);
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        fetchCycles();
    }, []);

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const activeCycles = cycles.filter(c => c.outcome === 'pending');
    const completedCycles = cycles.filter(c => c.outcome !== 'pending');

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">My Donation Cycles 🔄</h1>
                <p className="page-subtitle">Track your egg donation procedures, medications, and compensation</p>
            </div>

            {/* Stats */}
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
                        {activeCycles.length}
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
                    <div className="stat-icon">💰</div>
                    <div className="stat-number" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {cycles.filter(c => c.payment?.payment_status === 'completed').length}
                    </div>
                    <div className="stat-desc">Paid</div>
                </div>
            </div>

            {cycles.length === 0 ? (
                <div className="card fade-in">
                    <div className="empty-state">
                        <div className="empty-state-icon">🔄</div>
                        <div className="empty-state-text">No donation cycles yet</div>
                        <div className="empty-state-sub">
                            Once you are matched and approved, your clinician will initiate a donation cycle for you.
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Active Cycles */}
                    {activeCycles.length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                                Active Cycles
                            </h2>
                            <div className="cycles-grid">
                                {activeCycles.map((cycle, i) => (
                                    <CycleCard key={cycle.id} cycle={cycle} formatDate={formatDate} index={i} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Cycles */}
                    {completedCycles.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                Completed Cycles
                            </h2>
                            <div className="cycles-grid">
                                {completedCycles.map((cycle, i) => (
                                    <CycleCard key={cycle.id} cycle={cycle} formatDate={formatDate} index={i} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function CycleCard({ cycle, formatDate, index }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`cycle-card ${cycle.outcome} fade-in`} style={{ animationDelay: `${index * 60}ms`, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
            {/* Header */}
            <div className="cycle-header">
                <div className="cycle-pair">
                    <div className="cycle-avatar recipient">
                        {cycle.recipient?.user?.first_name?.[0]}{cycle.recipient?.user?.last_name?.[0]}
                    </div>
                    <div className="cycle-pair-info">
                        <span className="cycle-pair-name">
                            Paired with {cycle.recipient?.user?.first_name} {cycle.recipient?.user?.last_name}
                        </span>
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
                    <span className="cycle-detail-label">Compensation</span>
                    {cycle.payment ? (
                        <span className={`payment-badge ${cycle.payment.payment_status}`}>
                            UGX {Number(cycle.payment.amount).toLocaleString()} · {cycle.payment.payment_status}
                        </span>
                    ) : (
                        <span className="cycle-detail-value" style={{ color: 'var(--text-muted)' }}>Pending</span>
                    )}
                </div>
            </div>

            {/* Expanded: Medications */}
            {expanded && cycle.medications?.length > 0 && (
                <div className="meds-section">
                    <div className="meds-title">💊 Your Medications ({cycle.medications.length})</div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {cycle.medications.map(med => (
                            <div key={med.id} style={{
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                borderRadius: '0.75rem',
                                padding: '0.6rem 0.85rem',
                            }}>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.2rem' }}>{med.drug_name}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span>💉 {med.dosage}</span>
                                    <span>🕐 {med.frequency}</span>
                                    <span>📅 {med.duration}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {expanded && (!cycle.medications || cycle.medications.length === 0) && (
                <div className="meds-section">
                    <div className="meds-title">💊 Medications</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No medications prescribed yet</p>
                </div>
            )}

            {/* Payment Details (expanded) */}
            {expanded && cycle.payment && (
                <div className="meds-section" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <div className="meds-title">💳 Payment Details</div>
                    <div className="cycle-detail-grid" style={{ marginBottom: 0 }}>
                        <div className="cycle-detail">
                            <span className="cycle-detail-label">Reference</span>
                            <span className="cycle-detail-value" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{cycle.payment.reference_number}</span>
                        </div>
                        <div className="cycle-detail">
                            <span className="cycle-detail-label">Method</span>
                            <span className="cycle-detail-value" style={{ textTransform: 'capitalize' }}>{cycle.payment.payment_method?.replace('_', ' ')}</span>
                        </div>
                        <div className="cycle-detail">
                            <span className="cycle-detail-label">Amount</span>
                            <span className="cycle-detail-value" style={{ fontWeight: 700 }}>UGX {Number(cycle.payment.amount).toLocaleString()}</span>
                        </div>
                        <div className="cycle-detail">
                            <span className="cycle-detail-label">Payment Date</span>
                            <span className="cycle-detail-value">{formatDate(cycle.payment.payment_date)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {expanded ? 'Click to collapse ▲' : 'Click for details ▼'}
                </span>
            </div>
        </div>
    );
}
