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
        wallet: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
        pill: 'M10.5 1.5l-8 8a4.95 4.95 0 0 0 7 7l8-8a4.95 4.95 0 0 0-7-7zM9 9l6 6',
        calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
        clipboard: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9V2z',
        clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2',
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
    { key: 'initial_payment', label: 'Initial Payment', icon: 'card' },
    { key: 'cycle', label: 'Treatment Cycle', icon: 'cycle' },
    { key: 'final_payment', label: 'Full Payment', icon: 'card' },
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
    const [previewHtml, setPreviewHtml] = useState(null);

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
            window.location.href = res.data.checkout_url;
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
        const meds = (cycle.medications || []).filter(m => m.target_patient === 'recipient');
        if (meds.length === 0) {
            showToast('error', 'No medications prescribed for the recipient.');
            return;
        }

        const medicationsHtml = meds.map(m => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${m.drug_name}</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${m.dosage}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${m.frequency}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #4f46e5; font-weight: 600;">${m.duration}</td>
            </tr>
        `).join('');

        const htmlContent = `
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
                            position: relative;
                        }
                        /* EDRMS Watermark */
                        body::before {
                            content: 'EDRMS';
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-45deg);
                            font-size: 150px;
                            font-weight: 900;
                            color: rgba(99, 102, 241, 0.04);
                            z-index: -1;
                            white-space: nowrap;
                            pointer-events: none;
                        }
                        .prescription-card {
                            max-width: 800px;
                            margin: 0 auto;
                            border: 2px solid #e2e8f0;
                            border-radius: 16px;
                            padding: 40px;
                            background: rgba(255, 255, 255, 0.95);
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                            position: relative;
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
                            body { padding: 0; -webkit-print-color-adjust: exact; }
                            .prescription-card { border: none; box-shadow: none; padding: 0; background: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="prescription-card">
                       <div class="header">
                           <div class="clinic-info">
                               <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                                   <img src="http://127.0.0.1:8000/images/brand/logo.png" onerror="this.src='/images/brand/logo.png'" alt="EDRMS Logo" style="height: 50px;" />
                                   <h2 style="margin: 0; color: #4f46e5; font-size: 24px;">SpringRose Fertility Clinic</h2>
                               </div>
                               <p>Plot 45, Kampala Road, Kampala, Uganda</p>
                               <p>Tel: +256 700 123 456 | Email: info@springrosefertility.com</p>
                           </div>
                           <div>
                               <div class="rx-title">Rx</div>
                           </div>
                       </div>
                       
                       <div class="meta-grid">
                           <div class="meta-item">
                               <strong>Patient ID:</strong> Recipient RC-\${profile?.id?.toString().padStart(6, '0') || '000000'}<br/>
                               <strong>Name:</strong> Confidential Patient
                           </div>
                           <div class="meta-item" style="text-align: right;">
                               <strong>Date:</strong> \${new Date(cycle.start_date || Date.now()).toLocaleDateString()}<br/>
                               <strong>Cycle Ref:</strong> Cycle #\${cycle.id}
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
                               \${medicationsHtml}
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
                </body>
            </html>
        `;
        setPreviewHtml(htmlContent);
    };

    if (loading) return (
        <div className="page dd-page rd-page">
            <section className="dd-hero dd-panel rd-hero" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <div className="spinner" />
            </section>
        </div>
    );

    const hasProfile = !!profile;
    const activeConsents = consents.filter(c => c.status === 'granted');
    const hasMatchingConsent = activeConsents.some(c => c.consent_type === 'recipient_matching');
    const approvedMatches = Array.isArray(matches) ? matches.filter(m => m.status === 'approved') : [];
    const matchCount = Array.isArray(matches) ? matches.length : 0;
    const activeCycles = cycles.filter(c => c.outcome === 'pending');
    const serviceFeePaid = cycles.some(c => c.payments?.some(p => ['service_fee', 'recipient_initial'].includes(p.payment_stage) && p.payment_status === 'completed'));
    const finalFeePaid = cycles.some(c => c.payments?.some(p => p.payment_stage === 'recipient_final' && p.payment_status === 'completed'));
    const recipientStatuses = [hasProfile, hasMatchingConsent, matchCount > 0, approvedMatches.length > 0, serviceFeePaid, activeCycles.length > 0, finalFeePaid];
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

            {/* ACTION ITEMS */}
            {(() => {
                const actionItems = [];

                // ── Journey guidance items ──
                if (!hasProfile) {
                    actionItems.push({
                        type: 'profile', icon: 'user',
                        title: 'Complete Your Recipient Profile',
                        desc: 'Set up your profile with your medical details and preferences so clinicians can find the best donor match for you.',
                        link: '/recipient/profile'
                    });
                }
                if (hasProfile && !hasMatchingConsent) {
                    actionItems.push({
                        type: 'consent', icon: 'shield',
                        title: 'Grant Required Consents',
                        desc: 'Review and sign the matching consent to allow the system to find you a compatible donor.',
                        link: '/recipient/consents'
                    });
                }
                if (hasProfile && hasMatchingConsent && matchCount === 0) {
                    actionItems.push({
                        type: 'waiting', icon: 'clock',
                        title: 'Awaiting Donor Match',
                        desc: 'Your profile and consents are complete. The clinician will generate matches for you based on your preferences.'
                    });
                }
                if (matchCount > 0 && !activeCycles.length) {
                    actionItems.push({
                        type: 'waiting', icon: 'clock',
                        title: 'Match Found \u2014 Awaiting Cycle Start',
                        desc: `You have ${matchCount} match(es). The clinician will initiate a donation cycle when ready.`
                    });
                }
                if (activeCycles.length > 0) {
                    activeCycles.forEach(cycle => {
                        const svcFee = cycle.payments?.find(p => p.payment_stage === 'service_fee');
                        if (svcFee && svcFee.payment_status !== 'completed') {
                            actionItems.push({
                                type: 'payment_required', icon: 'wallet',
                                title: 'Pay Service Fee to Continue',
                                desc: 'A service fee payment is required to proceed with your donation cycle.',
                                link: null
                            });
                        }
                    });
                }

                // ── Processing Payments (Waiting clinical approval) ──
                cycles.forEach(c => {
                    c.payments?.forEach(p => {
                        if (p.payment_status === 'processing' || p.payment_status === 'pending') {
                            actionItems.push({
                                type: 'payment',
                                icon: 'wallet',
                                title: `${p.payment_stage === 'service_fee' ? 'Service Fee' : 'Final Payment'} pending clinical approval`,
                                desc: `Payment of UGX ${Number(p.amount).toLocaleString()} is awaiting final verification by the clinic.`
                            });
                        }
                    });
                });

                // ── Active Cycle Medication Reminders & Embryo Transfer Scheduling ──
                if (activeCycles.length > 0) {
                    activeCycles.forEach(cycle => {
                        const recipientMeds = (cycle.medications || []).filter(m => m.target_patient === 'recipient');
                        
                        if (recipientMeds.length > 0) {
                            const maxDurationDays = getMedicationDurationInDays(recipientMeds);
                            const startDate = new Date(cycle.start_date);
                            const today = new Date();
                            const diffTime = Math.abs(today - startDate);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            const isCompleted = maxDurationDays > 0 && diffDays >= maxDurationDays;

                            if (!isCompleted) {
                                actionItems.push({
                                    type: 'medication',
                                    icon: 'pill',
                                    title: `Daily Endometrial Prep Reminder (Day ${diffDays} of ${maxDurationDays})`,
                                    desc: `Please ensure you take your prescribed medications today to prepare for the Embryo Transfer.`
                                });
                            } else {
                                const transferAppt = cycle.appointments?.find(a => a.appointment_type === 'embryo_transfer');
                                if (!transferAppt) {
                                    actionItems.push({
                                        type: 'scheduling',
                                        icon: 'calendar',
                                        title: 'Ready for Embryo Transfer',
                                        desc: `You have completed your endometrial preparation. The clinician will confirm and schedule the Embryo Transfer.`
                                    });
                                } else if (transferAppt.status !== 'completed' && transferAppt.status !== 'cancelled') {
                                    actionItems.push({
                                        type: 'scheduled',
                                        icon: 'calendar',
                                        title: 'Embryo Transfer Scheduled',
                                        desc: `Your transfer is set for ${new Date(transferAppt.preferred_date).toLocaleDateString()} (${transferAppt.preferred_time_slot}).`
                                    });
                                }
                            }
                        }
                    });
                }

                if (actionItems.length === 0) {
                    return (
                        <section className="rd-tracker-panel" style={{ marginTop: '2rem', borderLeft: '4px solid #10b981' }}>
                            <div className="rd-section-title" style={{ marginBottom: '0.5rem' }}>
                                <SvgIcon name="check" />
                                <h2 style={{ color: '#065f46' }}>All Caught Up!</h2>
                            </div>
                            <p style={{ color: '#047857', fontSize: '0.9rem', margin: 0 }}>You have no pending action items. Your journey is progressing smoothly.</p>
                        </section>
                    );
                }

                return (
                    <section className="rd-tracker-panel" style={{ marginTop: '2rem', borderLeft: '4px solid #f59e0b' }}>
                        <div className="rd-section-title" style={{ marginBottom: '1rem' }}>
                            <SvgIcon name="clipboard" />
                            <h2 style={{ color: '#92400e' }}>Action Items & Reminders</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {actionItems.map((item, idx) => {
                                const inner = (
                                    <>
                                        <div style={{ color: item.type === 'alert' ? '#dc2626' : item.type === 'waiting' ? '#6366f1' : '#d97706' }}><SvgIcon name={item.icon} /></div>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, color: item.type === 'alert' ? '#991b1b' : item.type === 'waiting' ? '#3730a3' : '#92400e', fontSize: '0.9rem' }}>{item.title}</h4>
                                            <p style={{ margin: '0.25rem 0 0 0', color: item.type === 'alert' ? '#b91c1c' : item.type === 'waiting' ? '#4338ca' : '#b45309', fontSize: '0.82rem' }}>{item.desc}</p>
                                        </div>
                                        {item.link && <SvgIcon name="arrow" />}
                                    </>
                                );
                                const bg = item.type === 'alert' ? '#fef2f2' : item.type === 'waiting' ? '#eef2ff' : '#fffbeb';
                                const border = item.type === 'alert' ? '#fecaca' : item.type === 'waiting' ? '#c7d2fe' : '#fde68a';
                                return item.link ? (
                                    <Link key={idx} to={item.link} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', textDecoration: 'none' }}>
                                        {inner}
                                    </Link>
                                ) : (
                                    <div key={idx} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        {inner}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })()}

            {/* ── Active Cycle & Payment Section ── */}
            {activeCycles.length > 0 ? activeCycles.map(cycle => {
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

                                    {/* Cycle Progress & Medications Section */}
                                    <div style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid #c7d2fe', borderRadius: 12, padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#4f46e5' }}>🏥 Cycle Progress & Preparation</h4>
                                            <button 
                                                className="btn btn-ghost" 
                                                onClick={() => handleDownloadPrescription(cycle)}
                                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #818cf8', color: '#4f46e5', borderRadius: '6px', background: '#fff' }}
                                            >
                                                🖨️ Download Prescription
                                            </button>
                                        </div>
                                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#475569' }}>
                                            The cycle has officially begun. If your clinician has prescribed endometrial preparation medications, please follow the schedule below.
                                        </p>
                                        
                                        {(() => {
                                            const recipientMeds = (cycle.medications || []).filter(m => m.target_patient === 'recipient');
                                            
                                            return (
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    {recipientMeds.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.5rem', fontWeight: 700, fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                                                <div>DRUG NAME</div>
                                                                <div>DOSAGE</div>
                                                                <div>FREQUENCY</div>
                                                                <div>DURATION</div>
                                                            </div>
                                                            {recipientMeds.map(m => (
                                                                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', color: '#334155' }}>
                                                                    <div style={{ fontWeight: 600 }}>{m.drug_name}</div>
                                                                    <div>{m.dosage}</div>
                                                                    <div>{m.frequency}</div>
                                                                    <div style={{ fontWeight: 600, color: '#4f46e5' }}>{m.duration}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 6, fontSize: '0.82rem', color: '#64748b' }}>
                                                            No recipient medications prescribed yet.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}

                                        {/* Embryo Transfer Timeline */}
                                        {(() => {
                                            const recipientMeds = (cycle.medications || []).filter(m => m.target_patient === 'recipient');
                                            if (recipientMeds.length === 0) return null;

                                            const maxDurationDays = getMedicationDurationInDays(recipientMeds);
                                            const startDate = new Date(cycle.start_date);
                                            const today = new Date();
                                            const diffTime = Math.abs(today - startDate);
                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                            const isCompleted = maxDurationDays > 0 && diffDays >= maxDurationDays;

                                            const transferAppt = appointments.find(a => a.appointment_type === 'embryo_transfer');

                                            return (
                                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem' }}>
                                                    <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#334155' }}>Procedure Timeline</h5>
                                                    {!isCompleted ? (
                                                        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.75rem', fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ fontSize: '1.5rem' }}>⌛</div>
                                                            <div>
                                                                <strong>Preparation in Progress (Day {diffDays} of {maxDurationDays})</strong>
                                                                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>Your clinician will schedule the Embryo Transfer once your endometrial preparation is complete.</p>
                                                            </div>
                                                        </div>
                                                    ) : transferAppt ? (
                                                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ fontSize: '1.5rem' }}>🏥</div>
                                                            <div>
                                                                <strong style={{ color: '#065f46', fontSize: '0.9rem' }}>Embryo Transfer Scheduled</strong>
                                                                <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '0.2rem' }}>
                                                                    {new Date(transferAppt.preferred_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ({transferAppt.preferred_time_slot})
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '0.75rem', fontSize: '0.85rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ fontSize: '1.5rem' }}>🕒</div>
                                                            <div>
                                                                <strong>Preparation Complete</strong>
                                                                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>Waiting for your clinician to confirm and schedule the Embryo Transfer appointment.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
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

                            {/* Full / Final Payment Section */}
                            {feePaid && (
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>
                                        <SvgIcon name="card" /> Full Cycle Payment
                                    </div>

                                    {(() => {
                                        const finalPayment = cycle.payments?.find(p => p.payment_stage === 'recipient_final');
                                        const finalPaid = finalPayment?.payment_status === 'completed';
                                        const finalPending = ['pending', 'processing'].includes(finalPayment?.payment_status);
                                        const isFinalOpen = payingCycleId === `${cycle.id}_final`;

                                        if (finalPaid) {
                                            return (
                                                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <SvgIcon name="check" />
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.85rem' }}>Full payment paid & Clinician Approved</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                                                            UGX {Number(finalPayment.amount).toLocaleString()} · Ref: {finalPayment.reference_number}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (finalPending) {
                                            return (
                                                <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <SvgIcon name="cycle" />
                                                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem' }}>
                                                        Payment processing (Awaiting Clinician Approval) — UGX {Number(finalPayment.amount).toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <>
                                                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                                                    Your <strong>full cycle payment</strong> is required to proceed with the embryo transfer.
                                                </div>

                                                {!isFinalOpen ? (
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={() => setPayingCycleId(`${cycle.id}_final`)}
                                                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                                                    >
                                                        <SvgIcon name="card" /> Pay Full Amount (UGX 2,500,000)
                                                    </button>
                                                ) : (
                                                    <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '1rem' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
                                                            Full Payment Amount (Fixed)
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value="UGX 2,500,000"
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
                                                                onClick={async () => {
                                                                    setInitiating(true);
                                                                    try {
                                                                        const res = await api.post('/payments/initiate', {
                                                                            cycle_id: cycle.id,
                                                                            amount: '2500000',
                                                                            payment_stage: 'recipient_final',
                                                                        });
                                                                        showToast('success', 'Redirecting to payment gateway…');
                                                                        window.location.href = res.data.checkout_url;
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.message || 'Payment initiation failed');
                                                                    }
                                                                    setInitiating(false);
                                                                }}
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
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }) : (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', marginTop: '2rem', marginBottom: '2rem', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
                    <img src="/images/empty-state.png" alt="Waiting for match" style={{ width: '160px', maxWidth: '100%', marginBottom: '1.5rem', opacity: 0.95 }} />
                    <h3 style={{ color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>Waiting for the Next Phase</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                        We are currently reviewing your profile to find the perfect match. 
                        We will notify you right here as soon as the next phase of your journey begins!
                    </p>
                </div>
            )}

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

            {previewHtml && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '2rem' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.25rem' }}>📄</span> Prescription Preview
                            </h3>
                            <button onClick={() => setPreviewHtml(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <div style={{ flex: 1, padding: '1.5rem', background: '#f1f5f9', overflowY: 'auto' }}>
                            <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', height: '100%', minHeight: '600px' }}>
                                <iframe 
                                    id="prescription-iframe"
                                    srcDoc={previewHtml} 
                                    style={{ width: '100%', height: '100%', border: 'none' }} 
                                    title="Prescription Preview" 
                                />
                            </div>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#fff' }}>
                            <button className="btn btn-ghost" onClick={() => setPreviewHtml(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => {
                                const iframe = document.getElementById('prescription-iframe');
                                if (iframe && iframe.contentWindow) {
                                    iframe.contentWindow.print();
                                }
                            }}>
                                🖨️ Print / Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
