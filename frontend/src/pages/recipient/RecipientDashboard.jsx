import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import './RecipientDashboard.css';

function SvgIcon({ name, className = '' }) {
    const paths = {
        user: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
        shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        match: 'M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a5 5 0 0 1 10 0m0 0a5 5 0 0 1 10 0',
        star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21 7 14.2 2 9.3l6.9-1L12 2z',
        cycle: 'M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16m0 5v-5h5',
        card: 'M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 4h18',
        check: 'M20 6 9 17l-5-5',
        arrow: 'M5 12h14m-6-6 6 6-6 6',
    };

    return (
        <svg className={`rd-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

const RECIPIENT_STEPS = [
    { key: 'profile', label: 'Profile Setup', icon: 'user', link: '/recipient/profile' },
    { key: 'consent', label: 'Consent Review', icon: 'shield', link: '/recipient/consents' },
    { key: 'matching', label: 'Clinician Matching', icon: 'match' },
    { key: 'approved', label: 'Approved Matches', icon: 'star', link: '/recipient/matches' },
    { key: 'cycle', label: 'Treatment Cycle', icon: 'cycle' },
    { key: 'payment', label: 'Service Payment', icon: 'card' },
];

export default function RecipientDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [consents, setConsents] = useState([]);
    const [matches, setMatches] = useState([]);
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [payAmount, setPayAmount] = useState('500000');
    const [payingCycleId, setPayingCycleId] = useState(null);
    const [initiating, setInitiating] = useState(false);
    const [toast, setToast] = useState(null);

    // Sandbox state overrides
    const [medsCompletedOverride, setMedsCompletedOverride] = useState(false);
    const [schedDate, setSchedDate] = useState('');
    const [schedTime, setSchedTime] = useState('morning');
    const [schedNotes, setSchedNotes] = useState('');
    const [scheduling, setScheduling] = useState(false);
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const warning = queryParams.get('warning');
        const payment = queryParams.get('payment');

        if (warning === 'setup_profile_first') {
            showToast('error', 'Please complete your profile and preferences first.');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (warning === 'grant_consent_first') {
            showToast('error', 'Please review and grant your required consents first.');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (payment === 'success') {
            showToast('success', '✅ Payment received successfully! Awaiting clinician validation.');
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (payment === 'cancelled' || payment === 'failed') {
            showToast('error', '❌ Payment was cancelled or failed. Please try again.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, consentsRes, matchesRes, cyclesRes] = await Promise.allSettled([
                    api.get('/recipients'),
                    api.get('/consents'),
                    api.get('/matches'),
                    api.get('/donation-cycles'),
                ]);
                let activeCycle = null;
                if (profileRes.status === 'fulfilled' && profileRes.value.data?.id) {
                    setProfile(profileRes.value.data);
                }
                if (consentsRes.status === 'fulfilled') {
                    setConsents(consentsRes.value.data || []);
                }
                if (matchesRes.status === 'fulfilled') {
                    const md = matchesRes.value.data;
                    setMatches(md?.data || md || []);
                }
                if (cyclesRes.status === 'fulfilled') {
                    const cd = cyclesRes.value.data;
                    const list = cd?.data || cd || [];
                    setCycles(list);
                    activeCycle = list.find(c => c.outcome === 'pending');
                }

                if (activeCycle && activeCycle.donor_id) {
                    try {
                        const apptRes = await api.get(`/donors/${activeCycle.donor_id}/appointments`);
                        setAppointments(apptRes.data || []);
                    } catch { /* ignore */ }
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const handlePayServiceFee = async (cycleId) => {
        setInitiating(true);
        try {
            const res = await api.post('/payments/initiate', {
                cycle_id: cycleId,
                amount: '500000',
                payment_stage: 'service_fee',
            });
            showToast('success', 'Redirecting to payment gateway…');
            window.open(res.data.checkout_url, '_blank');
            setPayingCycleId(null);
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Payment initiation failed');
        }
        setInitiating(false);
    };

    const getMedicationDurationInDays = (meds) => {
        if (!meds || meds.length === 0) return 0;
        let maxDays = 0;
        meds.forEach(med => {
            const match = med.duration.match(/(\d+)\s*(day|week|month)s?/i);
            if (match) {
                const val = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                let days = val;
                if (unit === 'week') days = val * 7;
                else if (unit === 'month') days = val * 30;
                if (days > maxDays) maxDays = days;
            }
        });
        return maxDays;
    };

    const handleDownloadPrescription = (cycle) => {
        const printWindow = window.open('', '_blank');
        const medicationsHtml = cycle.medications && cycle.medications.length > 0
            ? cycle.medications.map(m => `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${m.drug_name}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${m.dosage}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${m.frequency}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 600;">${m.duration}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">No medications prescribed yet.</td></tr>';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Prescription - Cycle #${cycle.id}</title>
                    <style>
                        body {
                            font-family: 'Inter', sans-serif;
                            background-color: #ffffff;
                            color: #1e293b;
                            margin: 0;
                            padding: 40px;
                        }
                        .prescription-card {
                            max-width: 800px;
                            margin: 0 auto;
                            border: 2px solid #e2e8f0;
                            border-radius: 16px;
                            padding: 40px;
                            background: #ffffff;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                        }
                        .header {
                            display: flex;
                            justify-content: space-between;
                            border-bottom: 3px solid #6366f1;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                        }
                        .clinic-info h2 {
                            margin: 0 0 5px 0;
                            color: #4f46e5;
                            font-size: 24px;
                        }
                        .clinic-info p {
                            margin: 0;
                            color: #64748b;
                            font-size: 14px;
                        }
                        .rx-title {
                            font-size: 32px;
                            font-weight: 800;
                            color: #6366f1;
                            margin: 0;
                        }
                        .meta-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                            margin-bottom: 30px;
                            background: #f8fafc;
                            padding: 20px;
                            border-radius: 12px;
                        }
                        .meta-item {
                            font-size: 14px;
                        }
                        .meta-item strong {
                            color: #475569;
                        }
                        .rx-symbol {
                            font-size: 40px;
                            color: #6366f1;
                            font-family: serif;
                            margin-bottom: 15px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 40px;
                        }
                        th {
                            background-color: #f1f5f9;
                            text-align: left;
                            padding: 12px;
                            font-weight: 700;
                            color: #475569;
                            font-size: 14px;
                        }
                        .footer {
                            margin-top: 50px;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 20px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .signature-line {
                            border-top: 1px solid #94a3b8;
                            width: 200px;
                            text-align: center;
                            padding-top: 5px;
                            font-size: 12px;
                            color: #64748b;
                            margin-top: 30px;
                        }
                        @media print {
                            body { padding: 0; }
                            .prescription-card { border: none; box-shadow: none; padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="prescription-card">
                       <div class="header">
                           <div class="clinic-info">
                               <h2>Antigravity Fertility Clinic</h2>
                               <p>Plot 45, Kampala Road, Kampala, Uganda</p>
                               <p>Tel: +256 700 123 456 | Email: info@antigravityfertility.com</p>
                           </div>
                           <div>
                               <div class="rx-title">Rx</div>
                           </div>
                       </div>
                       
                       <div class="meta-grid">
                           <div class="meta-item">
                               <strong>Patient ID:</strong> Recipient ${cycle.recipient?.recipient_code || '—'}<br/>
                               <strong>Name:</strong> Confidential Patient
                           </div>
                           <div class="meta-item" style="text-align: right;">
                               <strong>Date:</strong> ${new Date(cycle.start_date || Date.now()).toLocaleDateString()}<br/>
                               <strong>Cycle Ref:</strong> Cycle #${cycle.id}
                           </div>
                       </div>
                       
                       <div class="rx-symbol">℞</div>
                       
                       <table>
                           <thead>
                               <tr>
                                   <th>Drug Name</th>
                                   <th>Dosage</th>
                                   <th>Frequency</th>
                                   <th>Duration</th>
                               </tr>
                           </thead>
                           <tbody>
                               ${medicationsHtml}
                           </tbody>
                       </table>
                       
                       <div class="footer">
                           <div>
                               <p style="font-size: 12px; color: #94a3b8; margin: 0;">This is a digitally verified medical prescription.</p>
                           </div>
                           <div class="signature-line">
                               Authorized Clinician
                           </div>
                       </div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleScheduleRetrieval = async (e, donorId) => {
        e.preventDefault();
        if (!schedDate) {
            showToast('error', 'Please select a preferred date.');
            return;
        }
        setScheduling(true);
        try {
            await api.post(`/donors/${donorId}/appointments`, {
                appointment_type: 'egg_retrieval',
                preferred_date: schedDate,
                preferred_time_slot: schedTime,
                donor_notes: schedNotes || 'Requested by recipient via dashboard'
            });
            showToast('success', 'Egg retrieval scheduling request submitted.');
            setSchedDate('');
            setSchedNotes('');
            const apptRes = await api.get(`/donors/${donorId}/appointments`);
            setAppointments(apptRes.data || []);
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to request scheduling');
        } finally {
            setScheduling(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const hasProfile = !!profile;
    const activeConsents = consents.filter(c => c.status === 'granted');
    const hasMatchingConsent = activeConsents.some(c => c.consent_type === 'recipient_matching');
    const approvedMatches = Array.isArray(matches) ? matches.filter(m => m.status === 'approved') : [];
    const matchCount = Array.isArray(matches) ? matches.length : 0;
    const activeCycles = cycles.filter(c => c.outcome === 'pending');
    const serviceFeePaid = cycles.some(c => c.payments?.some(p => p.payment_stage === 'service_fee' && p.payment_status === 'completed'));
    const recipientStatuses = [hasProfile, hasMatchingConsent, matchCount > 0, approvedMatches.length > 0, activeCycles.length > 0, serviceFeePaid];
    const nextRecipientStep = recipientStatuses.indexOf(false);
    const activeRecipientStep = nextRecipientStep === -1 ? RECIPIENT_STEPS.length - 1 : nextRecipientStep;
    const currentRecipientStep = RECIPIENT_STEPS[activeRecipientStep];

    return (
        <div className="page recipient-dashboard-page">
            <div className="rd-hero">
                <img src="/assets/avatars/recipient_default.png" alt="Recipient" className="rd-avatar" />
                <div>
                    <h1>Welcome back, {user?.first_name}</h1>
                    <p>Current stage: <strong>{currentRecipientStep.label}</strong></p>
                </div>
            </div>

            <section className="rd-tracker-panel">
                <div className="rd-section-title">
                    <SvgIcon name="cycle" />
                    <h2>Your Recipient Tracker</h2>
                </div>
                <div className="rd-stage-track" aria-label="Recipient progress tracker">
                    {RECIPIENT_STEPS.map((step, index) => {
                        const complete = recipientStatuses[index];
                        const active = index === activeRecipientStep;
                        const isClickable = index <= activeRecipientStep;
                        const body = (
                            <>
                                <span className="rd-stage-circle">
                                    <SvgIcon name={complete ? 'check' : step.icon} />
                                    <span>{step.label}</span>
                                </span>
                                {index < RECIPIENT_STEPS.length - 1 && <span className="rd-stage-line" />}
                            </>
                        );
                        return step.link && isClickable ? (
                            <Link key={step.key} to={step.link} className={`rd-stage-step ${complete ? 'complete' : active ? 'active' : 'pending'}`}>
                                {body}
                            </Link>
                        ) : (
                            <div key={step.key} className={`rd-stage-step ${complete ? 'complete' : active ? 'active' : 'pending'} ${!isClickable ? 'is-disabled' : ''}`}>
                                {body}
                            </div>
                        );
                    })}
                </div>
            </section>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">Profile Status</div>
                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>
                        {hasProfile
                            ? <span className="badge badge-approved">Complete</span>
                            : <span className="badge badge-pending">Incomplete</span>
                        }
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Matches</div>
                    <div className="stat-value">{matchCount}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Active Cycles</div>
                    <div className="stat-value">{activeCycles.length}</div>
                </div>
            </div>

            {/* ── Active Cycle & Payment Section ── */}
            {activeCycles.length > 0 && activeCycles.map(cycle => {
                const serviceFeePayment = cycle.payments?.find(p => p.payment_stage === 'service_fee');
                const feePaid = serviceFeePayment?.payment_status === 'completed';
                const feePending = ['pending', 'processing'].includes(serviceFeePayment?.payment_status);
                const isOpen = payingCycleId === cycle.id;

                return (
                    <div key={cycle.id} className="card fade-in" style={{ marginBottom: '1.5rem', border: '1.5px solid #c7d2fe' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title" style={{ margin: 0 }}>🔬 Active Donation Cycle #{cycle.id}</h3>
                            <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6', fontWeight: 700 }}>
                                {cycle.outcome}
                            </span>
                        </div>

                        {/* Cycle info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', padding: '1rem 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.2rem' }}>STARTED</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    {cycle.start_date ? new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.2rem' }}>DONOR CODE</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cycle.donor?.donor_code || '—'}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.2rem' }}>EGGS RETRIEVED</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cycle.eggs_retrieved ?? 'Pending'}</div>
                            </div>
                        </div>

                        {/* Service Fee Section */}
                        <div style={{ padding: '1rem 0 0' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>
                                <SvgIcon name="card" /> Service Fee Payment
                            </div>

                            {feePaid ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <SvgIcon name="check" />
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.85rem' }}>Service fee paid & Clinician Approved</div>
                                            <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                                                UGX {Number(serviceFeePayment.amount).toLocaleString()} · Ref: {serviceFeePayment.reference_number}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Prescription & Medications Section */}
                                    <div style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid #c7d2fe', borderRadius: 12, padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#4f46e5' }}>📋 Prescribed Medications</h4>
                                            <button 
                                                className="btn btn-ghost" 
                                                onClick={() => handleDownloadPrescription(cycle)}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #818cf8', color: '#4f46e5' }}
                                            >
                                                🖨️ Download Prescription
                                            </button>
                                        </div>
                                        
                                        {cycle.medications && cycle.medications.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.5rem', fontWeight: 700, fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                                    <div>DRUG NAME</div>
                                                    <div>DOSAGE</div>
                                                    <div>FREQUENCY</div>
                                                    <div>DURATION</div>
                                                </div>
                                                {cycle.medications.map(m => (
                                                    <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', color: '#334155' }}>
                                                        <div style={{ fontWeight: 600 }}>{m.drug_name}</div>
                                                        <div>{m.dosage}</div>
                                                        <div>{m.frequency}</div>
                                                        <div style={{ fontWeight: 600, color: '#4f46e5' }}>{m.duration}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>No medications prescribed yet. Your clinician will update your medications soon.</p>
                                        )}
                                    </div>

                                    {/* Egg Retrieval Scheduler Section */}
                                    {cycle.medications && cycle.medications.length > 0 && (
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>📅 Egg Retrieval Scheduling</h4>
                                                
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={medsCompletedOverride} 
                                                        onChange={e => setMedsCompletedOverride(e.target.checked)} 
                                                    />
                                                    Mock Medication Completed (Sandbox)
                                                </label>
                                            </div>

                                            {(() => {
                                                const maxDurationDays = getMedicationDurationInDays(cycle.medications);
                                                const startDate = new Date(cycle.start_date);
                                                const today = new Date();
                                                const diffTime = Math.abs(today - startDate);
                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                const isDurationCompleted = maxDurationDays > 0 && diffDays >= maxDurationDays;
                                                const isCompleted = isDurationCompleted || medsCompletedOverride;

                                                const retrievalAppt = appointments.find(a => a.appointment_type === 'egg_retrieval');

                                                if (!isCompleted) {
                                                    return (
                                                        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#78350f' }}>
                                                            ⌛ Medication course is currently in progress (Day {diffDays} of {maxDurationDays}). Egg retrieval scheduler will open automatically once the {maxDurationDays}-day medication duration completes.
                                                        </div>
                                                    );
                                                }

                                                if (retrievalAppt) {
                                                    return (
                                                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                            <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.88rem' }}>✓ Egg Retrieval Procedure Scheduled</div>
                                                            <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                                                                <strong>Proposed Date:</strong> {new Date(retrievalAppt.preferred_date).toLocaleDateString()} ({retrievalAppt.preferred_time_slot})
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                                                                <strong>Status:</strong> <span className={`badge badge-${retrievalAppt.status}`} style={{ textTransform: 'capitalize' }}>{retrievalAppt.status}</span>
                                                            </div>
                                                            {retrievalAppt.clinic_notes && (
                                                                <div style={{ fontSize: '0.78rem', color: '#065f46', marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 6 }}>
                                                                    <strong>Clinic Note:</strong> {retrievalAppt.clinic_notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <form onSubmit={(e) => handleScheduleRetrieval(e, cycle.donor_id)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                                                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                                                            Your medication duration has completed! Please propose a preferred date and time for the egg retrieval procedure below:
                                                        </p>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                            <div>
                                                                <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>PREFERRED DATE *</label>
                                                                <input 
                                                                    type="date" 
                                                                    className="form-input" 
                                                                    value={schedDate} 
                                                                    onChange={e => setSchedDate(e.target.value)} 
                                                                    min={new Date().toISOString().split('T')[0]} 
                                                                    required 
                                                                />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>PREFERRED TIME *</label>
                                                                <select 
                                                                    className="form-select" 
                                                                    value={schedTime} 
                                                                    onChange={e => setSchedTime(e.target.value)}
                                                                >
                                                                    <option value="morning">Morning (8:00 AM - 12:00 PM)</option>
                                                                    <option value="afternoon">Afternoon (12:00 PM - 4:00 PM)</option>
                                                                    <option value="evening">Evening (4:00 PM - 8:00 PM)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>NOTES / SPECIAL REQUESTS</label>
                                                            <textarea 
                                                                className="form-input" 
                                                                rows="2" 
                                                                value={schedNotes} 
                                                                onChange={e => setSchedNotes(e.target.value)} 
                                                                placeholder="Enter any medical considerations or preference notes..." 
                                                            />
                                                        </div>
                                                        <button 
                                                            type="submit" 
                                                            className="btn btn-primary" 
                                                            disabled={scheduling}
                                                            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none', alignSelf: 'flex-end' }}
                                                        >
                                                            {scheduling ? 'Submitting request...' : 'Schedule Egg Retrieval'}
                                                        </button>
                                                    </form>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ) : feePending ? (
                                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <SvgIcon name="cycle" />
                                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem' }}>
                                        Payment processing (Awaiting Clinician Approval) — UGX {Number(serviceFeePayment.amount).toLocaleString()}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: '#fef3c7', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#78350f' }}>
                                        Your <strong>service fee is due</strong>. Please pay to proceed with the egg donation cycle.
                                    </div>

                                    {!isOpen ? (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setPayingCycleId(cycle.id)}
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none' }}
                                        >
                                            <SvgIcon name="card" /> Pay Service Fee (UGX 500,000)
                                        </button>
                                    ) : (
                                        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '1rem' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
                                                Service Fee Amount (Fixed)
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value="UGX 500,000"
                                                    readOnly
                                                    style={{ flex: 1, background: '#e2e8f0', fontWeight: 700 }}
                                                />
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                                                Sandbox test card: <code>5531 8866 5214 2950</code> - MTN: <code>256783000000</code>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={initiating}
                                                    onClick={() => handlePayServiceFee(cycle.id)}
                                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', flex: 1 }}
                                                >
                                                    {initiating ? 'Opening checkout...' : 'Pay via Flutterwave'}
                                                </button>
                                                <button className="btn btn-ghost" onClick={() => { setPayingCycleId(null); }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* ── Getting Started Checklist ── */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Getting Started</h3>
                </div>
                <div className="modern-checklist">
                    <Link to="/recipient/profile" className={`checklist-card ${hasProfile ? 'complete' : 'action-required'}`}>
                        <div className="card-icon-wrapper">
                            <SvgIcon name={hasProfile ? 'check' : 'user'} />
                        </div>
                        <div className="card-content-wrapper">
                            <h4>{hasProfile ? 'Profile & Preferences Completed' : 'Complete Your Profile & Preferences'}</h4>
                            <p>{hasProfile ? 'Your matching requirements are safely stored' : 'Click here to set up your account and start matching'}</p>
                        </div>
                        <div className="card-action-arrow"><SvgIcon name="arrow" /></div>
                    </Link>

                    {hasProfile ? (
                        <Link to="/recipient/consents" className={`checklist-card ${hasMatchingConsent ? 'complete' : 'action-required'}`}>
                            <div className="card-icon-wrapper">
                                <SvgIcon name="shield" />
                            </div>
                            <div className="card-content-wrapper">
                                <h4>{hasMatchingConsent ? `${activeConsents.length} Consent(s) Granted` : 'Grant Required Consents'}</h4>
                                <p>{hasMatchingConsent ? 'Your legal and medical consents are active' : 'Click here to review and grant your required consents'}</p>
                            </div>
                            <div className="card-action-arrow">{hasMatchingConsent ? <SvgIcon name="check" /> : <SvgIcon name="arrow" />}</div>
                        </Link>
                    ) : (
                        <div className="checklist-card pending is-disabled">
                            <div className="card-icon-wrapper">
                                <SvgIcon name="shield" />
                            </div>
                            <div className="card-content-wrapper">
                                <h4>Grant Required Consents</h4>
                                <p>Awaiting profile completion and consent forms</p>
                            </div>
                        </div>
                    )}

                    <div className={`checklist-card ${matchCount > 0 ? 'complete' : 'pending'} ${!hasProfile ? 'is-disabled' : ''}`}>
                        <div className="card-icon-wrapper">
                            <SvgIcon name={matchCount > 0 ? 'match' : 'cycle'} />
                        </div>
                        <div className="card-content-wrapper">
                            <h4>{matchCount > 0 ? `${matchCount} Potential Match(es) Found` : 'Awaiting Clinician Matching'}</h4>
                            <p>{matchCount > 0 ? 'Our system has generated potential matches' : 'A clinician will review your profile to find suitable donors'}</p>
                        </div>
                        {matchCount > 0 && <div className="card-action-arrow check-mark"><SvgIcon name="check" /></div>}
                    </div>

                    {approvedMatches.length > 0 && hasMatchingConsent ? (
                        <Link to="/recipient/matches" className="checklist-card complete action-required">
                            <div className="card-icon-wrapper"><SvgIcon name="star" /></div>
                            <div className="card-content-wrapper">
                                <h4>{approvedMatches.length} Approved Match(es) Available</h4>
                                <p>Click here to review your approved egg donor matches</p>
                            </div>
                            <div className="card-action-arrow"><SvgIcon name="arrow" /></div>
                        </Link>
                    ) : (
                        <div className={`checklist-card pending ${!hasMatchingConsent ? 'is-disabled' : ''}`}>
                            <div className="card-icon-wrapper"><SvgIcon name="star" /></div>
                            <div className="card-content-wrapper">
                                <h4>Review Approved Matches</h4>
                                <p>{!hasMatchingConsent ? 'Awaiting consent completion' : 'You will be notified once a clinician approves a match for you'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
