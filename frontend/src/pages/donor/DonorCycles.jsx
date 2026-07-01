import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../Dashboard.css';
import '../DonationCycles.css';

function SvgIcon({ name, className = '' }) {
    const paths = {
        cycle: 'M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16m0 5v-5h5',
        clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-14v5l3 2',
        check: 'M20 6 9 17l-5-5',
        card: 'M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 4h18',
        pill: 'M10 21 3 14a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7zM7 10l7 7',
        syringe: 'm18 2 4 4M17 7l-9 9-4 1 1-4 9-9m-2 2 6 6',
        calendar: 'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
        user: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
    };
    return (
        <svg className={`cycle-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function DonorCycles() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCycles = async () => {
            try {
                const res = await api.get('/donation-cycles');
                setCycles(res.data?.data || res.data || []);
            } catch {
                /* ignore */
            } finally {
                setLoading(false);
            }
        };
        fetchCycles();
    }, []);

    const formatDate = (d) => {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getCycleEndDate = (cycle) => {
        if (cycle.end_date) return cycle.end_date;
        if (!cycle.start_date || !cycle.medications || cycle.medications.length === 0) return null;
        let maxDays = 0;
        cycle.medications.forEach(m => {
            const num = parseInt(m.duration);
            if (!isNaN(num) && num > maxDays) {
                maxDays = num;
            }
        });
        if (maxDays === 0) return null;
        const startDate = new Date(cycle.start_date);
        const endDate = new Date(startDate.getTime());
        endDate.setDate(startDate.getDate() + maxDays);
        return endDate;
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const activeCycles = cycles.filter(c => c.outcome === 'pending');
    const completedCycles = cycles.filter(c => c.outcome !== 'pending');

    return (
        <div className="page donor-cycles-page">
            <section className="cycles-hero">
                <p className="cycles-kicker">Donation cycles</p>
                <h1>My Donation Cycles</h1>
                <p>Track procedures, medication plans, retrieval details, and compensation in one place.</p>
            </section>

            <div className="donor-stats-row cycles-stats">
                {[
                    { icon: 'cycle', value: cycles.length, label: 'Total Cycles' },
                    { icon: 'clock', value: activeCycles.length, label: 'Active' },
                    { icon: 'check', value: cycles.filter(c => c.outcome === 'successful').length, label: 'Successful' },
                    { icon: 'card', value: cycles.filter(c => (c.payments || []).some(p => p.payment_status === 'completed')).length, label: 'Paid' },
                ].map(stat => (
                    <div className="donor-stat" key={stat.label}>
                        <div className="stat-icon"><SvgIcon name={stat.icon} /></div>
                        <div className="stat-number">{stat.value}</div>
                        <div className="stat-desc">{stat.label}</div>
                    </div>
                ))}
            </div>

            {cycles.length === 0 ? (
                <div className="card cycles-empty-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <img src="/images/empty-state.png" alt="Waiting for cycles" style={{ width: '160px', maxWidth: '100%', marginBottom: '1.5rem', opacity: 0.95 }} />
                    <h3 style={{ color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>No donation cycles yet</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                        Once you are matched and approved, your clinician will initiate a donation cycle for you.
                    </p>
                </div>
            ) : (
                <>
                    {activeCycles.length > 0 && (
                        <CycleSection title="Active Cycles" active cycles={activeCycles} formatDate={formatDate} />
                    )}
                    {completedCycles.length > 0 && (
                        <CycleSection title="Completed Cycles" cycles={completedCycles} formatDate={formatDate} />
                    )}
                    <div style={{ textAlign: 'center', padding: '2rem 1.5rem', marginTop: '1rem', opacity: 0.8 }}>
                        <img src="/images/empty-state.png" alt="Empathetic graphic" style={{ width: '100px', maxWidth: '100%', marginBottom: '1rem' }} />
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>We are with you every step of this journey.</p>
                    </div>
                </>
            )}
        </div>
    );
}

function CycleSection({ title, active = false, cycles, formatDate }) {
    return (
        <section className="cycle-section">
            <div className="cycle-section-title">
                {active && <span />}
                <h2>{title}</h2>
            </div>
            <div className="cycles-grid">
                {cycles.map((cycle, index) => (
                    <CycleCard key={cycle.id} cycle={cycle} formatDate={formatDate} index={index} />
                ))}
            </div>
        </section>
    );
}

function CycleCard({ cycle, formatDate, index }) {
    const [expanded, setExpanded] = useState(false);
    const initialPay = cycle.payments?.find(p => p.payment_stage === 'initial');
    const finalPay = cycle.payments?.find(p => p.payment_stage === 'final');

    return (
        <button
            type="button"
            className={`cycle-card ${cycle.outcome}`}
            style={{ animationDelay: `${index * 60}ms` }}
            onClick={() => setExpanded(!expanded)}
        >
            <div className="cycle-header">
                <div className="cycle-pair">
                    <div className="cycle-avatar recipient">
                        <SvgIcon name="user" />
                    </div>
                    <div className="cycle-pair-info">
                        <span className="cycle-pair-name">
                            Paired with {cycle.recipient?.recipient_code || `RC-${String(cycle.recipient_id).padStart(6, '0')}`}
                        </span>
                        <span className="cycle-pair-label">Recipient</span>
                    </div>
                </div>
                <span className={`badge badge-${cycle.outcome}`}>{cycle.outcome}</span>
            </div>

            <div className="cycle-detail-grid">
                <Detail label="Start Date" value={formatDate(cycle.start_date)} />
                <Detail label="End Date" value={formatDate(getCycleEndDate(cycle))} />
                <Detail label="Eggs Retrieved" value={cycle.eggs_retrieved ?? '-'} />
                <div className="cycle-detail">
                    <span className="cycle-detail-label">Initial Pay (50%)</span>
                    {initialPay ? (
                        <span className={`payment-badge ${initialPay.payment_status}`}>
                            UGX {Number(initialPay.amount).toLocaleString()} - {initialPay.payment_status}
                        </span>
                    ) : (
                        <span className="cycle-detail-value muted">Pending</span>
                    )}
                </div>
                <div className="cycle-detail">
                    <span className="cycle-detail-label">Final Pay (50%)</span>
                    {finalPay ? (
                        <span className={`payment-badge ${finalPay.payment_status}`}>
                            UGX {Number(finalPay.amount).toLocaleString()} - {finalPay.payment_status}
                        </span>
                    ) : (
                        <span className="cycle-detail-value muted">Pending</span>
                    )}
                </div>
            </div>

            {expanded && (
                <div className="cycle-expanded">
                    <div className="meds-section">
                        <div className="meds-title"><SvgIcon name="pill" /> Medications</div>
                        {cycle.medications?.length > 0 ? (
                            <div className="meds-grid">
                                {cycle.medications.map(med => (
                                    <div key={med.id} className="med-card">
                                        <strong>{med.drug_name}</strong>
                                        <span><SvgIcon name="syringe" /> {med.dosage}</span>
                                        <span><SvgIcon name="clock" /> {med.frequency}</span>
                                        <span><SvgIcon name="calendar" /> {med.duration}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No medications prescribed yet.</p>
                        )}
                    </div>

                    {cycle.payments && cycle.payments.length > 0 && (
                        <div className="meds-section">
                            <div className="meds-title"><SvgIcon name="card" /> Compensation Payments</div>
                            <div className="meds-grid">
                                {cycle.payments.filter(p => p.payment_stage !== 'service_fee').map(pay => (
                                    <div key={pay.id} className="med-card" style={{ borderLeft: pay.payment_status === 'completed' ? '4px solid #10b981' : '4px solid #f59e0b', paddingLeft: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <strong>{pay.payment_stage === 'initial' ? 'Initial Compensation (50%)' : pay.payment_stage === 'final' ? 'Final Compensation (50%)' : 'Compensation'}</strong>
                                            <span className={`payment-badge ${pay.payment_status}`}>{pay.payment_status}</span>
                                        </div>
                                        <div className="cycle-detail-grid" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                            <Detail label="Reference" value={pay.reference_number} mono />
                                            <Detail label="Method" value={pay.payment_method?.replace('_', ' ') || '-'} />
                                            <Detail label="Amount" value={`UGX ${Number(pay.amount).toLocaleString()}`} />
                                            <Detail label="Payment Date" value={formatDate(pay.payment_date)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <span className="cycle-toggle">{expanded ? 'Click to collapse' : 'Click for details'}</span>
        </button>
    );
}

function Detail({ label, value, mono = false }) {
    return (
        <div className="cycle-detail">
            <span className="cycle-detail-label">{label}</span>
            <span className={`cycle-detail-value ${mono ? 'mono' : ''}`}>{value}</span>
        </div>
    );
}
