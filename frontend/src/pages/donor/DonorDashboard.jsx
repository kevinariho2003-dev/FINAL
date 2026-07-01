import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import './DonorDashboard.css';

const BASE = 'http://127.0.0.1:8000';

function photoUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE}/storage/${path}`;
}

function SvgIcon({ name, className = '' }) {
    const paths = {
        clipboard: 'M9 3h6m-7 4h8m-8 4h8m-8 4h5 M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
        check: 'M20 6 9 17l-5-5',
        user: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
        shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        calendar: 'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
        card: 'M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 4h18',
        flask: 'M10 2v6l-5 9a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-9V2M8 2h8M8.5 15h7',
        layers: 'm12 2 9 5-9 5-9-5 9-5zm-7 9 7 4 7-4M5 16l7 4 7-4',
        camera: 'M4 8h4l2-3h4l2 3h4v11H4V8zm8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-14v5l3 2',
        arrow: 'M5 12h14m-6-6 6 6-6 6',
        warning: 'M12 9v4m0 4h.01M10.29 3.86l-8.6 14.86A2 2 0 0 0 3.4 22h17.2a2 2 0 0 0 1.71-3.28l-8.6-14.86a2 2 0 0 0-3.42 0z',
    };

    return (
        <svg className={`dd-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

const JOURNEY = [
    { key: 'profile', label: 'Profile Completion', link: '/donor/profile', icon: 'user' },
    { key: 'consents', label: 'Consents', link: '/donor/consents', icon: 'shield' },
    { key: 'screening', label: 'Physical Appointment', link: '/donor/screening', icon: 'calendar' },
    { key: 'payment', label: 'Initial Compensation', icon: 'card' },
    { key: 'cycle', label: 'Medication Phase', link: '/donor/cycles', icon: 'flask' },
    { key: 'retrieval', label: 'Egg Retrieval', icon: 'layers' },
    { key: 'final_payment', label: 'Final Compensation', icon: 'card' },
];

export default function DonorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [consents, setConsents] = useState([]);
    const [matches, setMatches] = useState([]);
    const [docs, setDocs] = useState([]);
    const [appts, setAppts] = useState([]);
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);

    const [schedDate, setSchedDate] = useState('');
    const [schedTime, setSchedTime] = useState('morning');
    const [schedNotes, setSchedNotes] = useState('');
    const [previewHtml, setPreviewHtml] = useState(null);
    const [scheduling, setScheduling] = useState(false);
    const [medsCompletedOverride, setMedsCompletedOverride] = useState(false);

    const getMedicationDurationInDays = (medications) => {
        if (!medications || medications.length === 0) return 0;
        let maxDays = 0;
        medications.forEach(m => {
            const num = parseInt(m.duration);
            if (!isNaN(num) && num > maxDays) {
                maxDays = num;
            }
        });
        return maxDays;
    };

    const handleDownloadPrescription = (cycle) => {
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
                        /* EDRMS / Springrose Watermark */
                        body::before {
                            content: 'EDRMS / Springrose Women Center';
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-45deg);
                            font-size: 80px;
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
                        .watermark {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%) rotate(-45deg);
                            font-size: 150px;
                            font-weight: 900;
                            color: rgba(0, 0, 0, 0.03);
                            pointer-events: none;
                            z-index: 0;
                        }
                        .header, .meta-grid, table, .footer {
                            position: relative;
                            z-index: 1;
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
                       <div class="watermark">EDRMS</div>
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
                               <strong>Patient ID:</strong> Donor ${cycle.donor_profile?.donor_code || '—'}<br/>
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
                </body>
            </html>
        `;
        setPreviewHtml(htmlContent);
    };

    const handleScheduleRetrieval = async (e, donorId) => {
        e.preventDefault();
        if (!schedDate) {
            alert('Please select a preferred date.');
            return;
        }
        setScheduling(true);
        try {
            await api.post(`/donors/${donorId}/appointments`, {
                appointment_type: 'egg_retrieval',
                preferred_date: schedDate,
                preferred_time_slot: schedTime,
                donor_notes: schedNotes || 'Requested by donor via dashboard'
            });
            alert('Egg retrieval scheduling request submitted.');
            setSchedDate('');
            setSchedNotes('');
            const apptRes = await api.get(`/donors/${donorId}/appointments`);
            setAppts(apptRes.data || []);
        } catch (err) {
            alert(err?.response?.data?.message || 'Failed to request scheduling');
        } finally {
            setScheduling(false);
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const [pR, cR, mR, cyR] = await Promise.allSettled([
                    api.get('/donors'),
                    api.get('/consents'),
                    api.get('/matches'),
                    api.get('/donation-cycles'),
                ]);
                if (pR.status === 'fulfilled' && pR.value.data?.id) {
                    const p = pR.value.data;
                    setProfile(p);
                    const [dR, aR] = await Promise.allSettled([
                        api.get(`/donors/${p.id}/screening-documents`),
                        api.get(`/donors/${p.id}/appointments`),
                    ]);
                    if (dR.status === 'fulfilled') setDocs(dR.value.data || []);
                    if (aR.status === 'fulfilled') setAppts(aR.value.data || []);
                }
                if (cR.status === 'fulfilled') setConsents(cR.value.data || []);
                if (mR.status === 'fulfilled') {
                    const d = mR.value.data;
                    setMatches(d?.data || d || []);
                }
                if (cyR.status === 'fulfilled') {
                    const d = cyR.value.data;
                    setCycles(d?.data || d || []);
                }
            } catch {
                /* ignore dashboard widgets that fail independently */
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return (
        <div className="page dd-page">
            <section className="dd-hero dd-panel" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <div className="spinner" />
            </section>
        </div>
    );

    const activeConsents = consents.filter(c => c.status === 'granted');
    const hasProfile = !!profile && !!profile.photo_path;
    const isApproved = profile?.status === 'approved';
    const hasConsent = activeConsents.some(c => c.consent_type === 'egg_donation');
    const hasScreening = docs.some(d => d.status === 'verified') || appts.some(a => a.status === 'completed');
    const matchCount = Array.isArray(matches) ? matches.length : 0;
    const hasCycle = cycles.length > 0;
    const activeCycle = cycles.find(c => c.outcome === 'pending');
    const hasRetrieval = cycles.some(c => c.retrieval_date);
    const hasInitialPayment = cycles.some(c => c.payments?.some(p => p.payment_stage === 'initial' && p.payment_status === 'completed'));
    const hasFinalPayment = cycles.some(c => c.payments?.some(p => p.payment_stage === 'final' && p.payment_status === 'completed'));

    const stepStatuses = [hasProfile, hasConsent, hasScreening, hasInitialPayment, hasCycle, hasRetrieval, hasFinalPayment];
    const stepsComplete = stepStatuses.filter(Boolean).length;
    const nextIncompleteStep = stepStatuses.indexOf(false);
    const activeStep = nextIncompleteStep === -1 ? JOURNEY.length - 1 : nextIncompleteStep;
    const currentStep = JOURNEY[activeStep];

    const nextAppt = [...appts]
        .filter(a => a.status === 'requested' || a.status === 'confirmed')
        .sort((a, b) => new Date(a.preferred_date) - new Date(b.preferred_date))[0];

    const photo = photoUrl(profile?.photo_path);
    const ini = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || 'DN';
    const donorCode = profile?.donor_code || 'DN-000000';

    return (
        <div className="page dd-page">
            <section className="dd-hero dd-panel">
                <div className="dd-avatar-wrap">
                    {photo ? (
                        <img
                            src={photo}
                            alt={user?.first_name || 'Donor'}
                            className="dd-avatar-img"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : (
                        <div className="dd-avatar-fallback">{ini}</div>
                    )}
                    {!photo && hasProfile && (
                        <Link to="/donor/profile" className="dd-avatar-nudge" title="Upload profile photo">
                            <SvgIcon name="camera" />
                        </Link>
                    )}
                </div>

                <div className="dd-hero-info">
                    <div className="dd-name-row">
                        <h1 className="dd-name">Welcome back, {user?.first_name || 'Donor'}</h1>
                        <span className="dd-role-pill">Donor</span>
                    </div>
                    <p className="dd-stage-copy">
                        Current stage: <strong>{currentStep.label}</strong>
                    </p>
                    {!photo && hasProfile && (
                        <Link to="/donor/profile" className="dd-photo-link">
                            <SvgIcon name="camera" />
                            Add your profile photo
                        </Link>
                    )}
                </div>

                <div className="dd-code-chip">
                    <SvgIcon name="clipboard" />
                    {donorCode}
                </div>
            </section>

            <section className="dd-panel dd-progress-panel">
                <div className="dd-section-title">
                    <SvgIcon name="clipboard" />
                    <h2>Your Progress Tracker</h2>
                </div>

                <div className="dd-stage-track" aria-label="Donor progress tracker">
                    {JOURNEY.map((step, i) => {
                        const complete = stepStatuses[i];
                        const active = i === activeStep;
                        const content = (
                            <>
                                <span className="dd-stage-circle">
                                    <span>{step.label}</span>
                                    {complete && <span className="dd-stage-check"><SvgIcon name="check" /></span>}
                                </span>
                                {i < JOURNEY.length - 1 && <span className="dd-stage-line" />}
                            </>
                        );

                        return step.link ? (
                            <Link
                                key={step.key}
                                to={step.link}
                                className={`dd-stage-step ${complete ? 'complete' : active ? 'active' : 'pending'}`}
                            >
                                {content}
                            </Link>
                        ) : (
                            <div
                                key={step.key}
                                className={`dd-stage-step ${complete ? 'complete' : active ? 'active' : 'pending'}`}
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="dd-panel dd-current-panel">
                <div className="dd-section-title">
                    <SvgIcon name={currentStep.icon} />
                    <h2>Stage {Math.min(activeStep + 1, JOURNEY.length)}: {currentStep.label}</h2>
                </div>
                <div className="dd-current-body">
                    <div className="dd-current-icon">
                        <SvgIcon name={currentStep.icon} />
                    </div>
                    <div>
                        {(() => {
                            let title = 'Start your donor profile';
                            let desc = 'Complete your profile first so the clinical team can review your information and guide you through the next stage.';
                            let actions = null;

                            switch (currentStep.key) {
                                case 'profile':
                                    title = hasProfile ? 'Waiting for clinician verification' : 'Start your donor profile';
                                    desc = hasProfile 
                                        ? 'Your details are saved. Keep your consents and appointments up to date while the clinical team reviews your profile.'
                                        : 'Complete your profile first so the clinical team can review your information and guide you through the next stage.';
                                    actions = !hasProfile && <Link to="/donor/profile" className="dd-modern-btn">Complete profile <SvgIcon name="arrow" /></Link>;
                                    break;
                                case 'consents':
                                    title = 'Review Consents';
                                    desc = 'Please review and sign the required legal and medical consents to proceed with the donation program.';
                                    actions = <Link to="/donor/consents" className="dd-modern-btn">Review consents <SvgIcon name="arrow" /></Link>;
                                    break;
                                case 'screening':
                                    title = 'Physical Screening Appointment';
                                    desc = 'Schedule and attend your in-person medical screening at the clinic.';
                                    actions = !hasScreening && <Link to="/donor/screening" className="dd-modern-btn">Book screening <SvgIcon name="arrow" /></Link>;
                                    break;
                                case 'payment':
                                    title = 'Initial Compensation';
                                    desc = 'Your first compensation will be processed by the clinic before medication begins. Please wait for the clinician to initiate this.';
                                    break;
                                case 'cycle':
                                    title = 'Medication Phase';
                                    desc = 'Your donation cycle is active. Follow your prescribed medication schedule carefully.';
                                    break;
                                case 'retrieval':
                                    title = 'Egg Retrieval';
                                    desc = 'Your egg retrieval procedure will be scheduled soon. Watch your action items for updates.';
                                    break;
                                case 'final_payment':
                                    title = 'Final Compensation';
                                    desc = 'Your final compensation is being processed following a successful retrieval.';
                                    break;
                                default:
                                    break;
                            }

                            return (
                                <>
                                    <h3>{title}</h3>
                                    <p>{desc}</p>
                                    {actions && <div className="dd-current-actions">{actions}</div>}
                                </>
                            );
                        })()}
                    </div>
                </div>
            </section>

            {/* ACTION ITEMS */}
            {(() => {
                const actionItems = [];

                // --- Journey-stage guidance items ---
                if (!hasProfile) {
                    actionItems.push({ type: 'profile', icon: 'user', title: 'Complete Your Donor Profile', desc: 'Set up your donor profile with your personal and medical details so the clinical team can begin their review.', link: '/donor/profile' });
                }
                if (hasProfile && profile?.status === 'pending') {
                    actionItems.push({ type: 'waiting', icon: 'clock', title: 'Profile Under Clinician Review', desc: 'Your donor profile has been submitted and is currently being reviewed by the clinical team. You will be notified once approved.' });
                }
                if (hasProfile && profile?.status === 'rejected') {
                    actionItems.push({ type: 'alert', icon: 'warning', title: 'Profile Requires Changes', desc: 'Your donor profile was not approved. Please review the feedback and update your profile.', link: '/donor/profile' });
                }
                if (isApproved && !hasConsent) {
                    actionItems.push({ type: 'consent', icon: 'shield', title: 'Sign Your Egg Donation Consent', desc: 'Your profile is approved. Please review and sign the required egg donation consent to proceed.', link: '/donor/consents' });
                }
                if (isApproved && hasConsent && !hasScreening) {
                    actionItems.push({ type: 'screening', icon: 'calendar', title: 'Book Your Medical Screening', desc: 'Schedule your in-person physical screening appointment at the clinic.', link: '/donor/screening' });
                }
                if (isApproved && hasConsent && hasScreening && matchCount === 0) {
                    actionItems.push({ type: 'waiting', icon: 'clock', title: 'Awaiting Recipient Match', desc: 'You are fully screened and ready. The system will match you with a compatible recipient.' });
                }
                if (matchCount > 0 && !hasCycle) {
                    actionItems.push({ type: 'waiting', icon: 'clock', title: 'Match Found — Awaiting Cycle Start', desc: `You have been matched with ${matchCount} recipient(s). The clinician will initiate your donation cycle soon.` });
                }

                // --- Existing payment & medication items ---

                // 1. Processing Payments (Waiting clinical approval)
                cycles.forEach(c => {
                    c.payments?.forEach(p => {
                        if (p.payment_status === 'processing' || p.payment_status === 'pending') {
                            actionItems.push({
                                type: 'payment',
                                icon: 'wallet',
                                title: `${p.payment_stage === 'initial' ? 'Initial' : 'Final'} Compensation pending clinical approval`,
                                desc: `Payment of UGX ${Number(p.amount).toLocaleString()} is awaiting final verification by the clinic.`
                            });
                        }
                    });
                });

                // 2. Active Cycle Medication Reminders & Egg Retrieval Scheduling
                if (activeCycle) {
                    const donorMeds = (activeCycle.medications || []).filter(m => m.target_patient !== 'recipient');
                    
                    if (donorMeds.length > 0) {
                        const maxDurationDays = getMedicationDurationInDays(donorMeds);
                        const startDate = new Date(activeCycle.start_date);
                        const today = new Date();
                        const diffTime = Math.abs(today - startDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const isCompleted = maxDurationDays > 0 && diffDays >= maxDurationDays;

                        if (!isCompleted) {
                            actionItems.push({
                                type: 'medication',
                                icon: 'pill',
                                title: `Daily Medication Reminder (Day ${diffDays} of ${maxDurationDays})`,
                                desc: `Please ensure you take your prescribed stimulation medications today as directed by your clinician.`
                            });
                        } else {
                            const retrievalAppt = appts.find(a => a.appointment_type === 'egg_retrieval');
                            if (!retrievalAppt) {
                                actionItems.push({
                                    type: 'scheduling',
                                    icon: 'calendar',
                                    title: 'Ready for Egg Retrieval',
                                    desc: `You have completed your ${maxDurationDays}-day medication course. The clinician will initiate the Egg Retrieval schedule shortly.`
                                });
                            } else if (retrievalAppt.status !== 'completed' && retrievalAppt.status !== 'cancelled') {
                                actionItems.push({
                                    type: 'scheduled',
                                    icon: 'calendar',
                                    title: 'Egg Retrieval Scheduled',
                                    desc: `Your retrieval is set for ${new Date(retrievalAppt.preferred_date).toLocaleDateString()} (${retrievalAppt.preferred_time_slot}). Please prepare accordingly.`
                                });
                            }
                        }
                    }
                }

                if (actionItems.length === 0) {
                    return (
                        <section className="dd-panel" style={{ marginBottom: '2rem', borderLeft: '4px solid #10b981' }}>
                            <div className="dd-section-title" style={{ marginBottom: '0.5rem' }}>
                                <SvgIcon name="check" />
                                <h2 style={{ color: '#065f46' }}>All Caught Up!</h2>
                            </div>
                            <p style={{ color: '#047857', fontSize: '0.9rem', margin: 0 }}>You have no pending action items. Your journey is progressing smoothly.</p>
                        </section>
                    );
                }

                return (
                    <section className="dd-panel" style={{ marginBottom: '2rem', borderLeft: '4px solid #f59e0b' }}>
                        <div className="dd-section-title" style={{ marginBottom: '1rem' }}>
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

            {(nextAppt || activeCycle) ? (
                <section className="dd-mini-grid">
                    {nextAppt && (
                        <div className="dd-panel dd-mini-card">
                            <SvgIcon name="calendar" />
                            <div>
                                <h3>Next appointment</h3>
                                <p>{new Date(nextAppt.preferred_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    )}
                    {activeCycle && (
                        <div className="dd-panel dd-mini-card" style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                <SvgIcon name="flask" />
                                <h3 style={{ margin: 0 }}>Active cycle Medication Phase</h3>
                            </div>
                            <p style={{ margin: 0, marginBottom: '1rem', color: '#64748b' }}>
                                Started {new Date(activeCycle.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>

                            {/* Prescription & Medications Section */}
                            <div style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid #c7d2fe', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#4f46e5' }}>📋 Prescribed Medications</h4>
                                    <button 
                                        className="btn btn-ghost" 
                                        onClick={() => handleDownloadPrescription(activeCycle)}
                                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #818cf8', color: '#4f46e5', borderRadius: '6px', background: '#fff' }}
                                    >
                                        🖨️ Download Prescription
                                    </button>
                                </div>
                                
                                {activeCycle.medications && activeCycle.medications.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '0.5rem', fontWeight: 700, fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                            <div>DRUG NAME</div>
                                            <div>DOSAGE</div>
                                            <div>FREQUENCY</div>
                                            <div>DURATION</div>
                                        </div>
                                        {activeCycle.medications.map(m => (
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
                                                    {/* Egg Retrieval Timeline Section */}
                            {(() => {
                                const donorMeds = (activeCycle.medications || []).filter(m => m.target_patient !== 'recipient');
                                if (donorMeds.length === 0) return null;
                                
                                const maxDurationDays = getMedicationDurationInDays(donorMeds);
                                const startDate = new Date(activeCycle.start_date);
                                const today = new Date();
                                const diffTime = Math.abs(today - startDate);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                const isCompleted = maxDurationDays > 0 && diffDays >= maxDurationDays;

                                const retrievalAppt = appts.find(a => a.appointment_type === 'egg_retrieval');

                                return (
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>📅 Procedure Timeline</h4>
                                        </div>

                                        {!isCompleted ? (
                                            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ fontSize: '1.5rem' }}>⌛</div>
                                                <div>
                                                    <strong>Medication Phase in Progress (Day {diffDays} of {maxDurationDays})</strong>
                                                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>Your clinician will schedule your egg retrieval procedure once your {maxDurationDays}-day course is complete.</p>
                                                </div>
                                            </div>
                                        ) : retrievalAppt ? (
                                            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ fontSize: '1.5rem' }}>🏥</div>
                                                <div>
                                                    <strong style={{ color: '#065f46', fontSize: '0.9rem' }}>Egg Retrieval Scheduled</strong>
                                                    <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '0.2rem' }}>
                                                        {new Date(retrievalAppt.preferred_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ({retrievalAppt.preferred_time_slot})
                                                    </div>
                                                    {retrievalAppt.clinic_notes && (
                                                        <div style={{ fontSize: '0.78rem', color: '#065f46', marginTop: '0.4rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 6 }}>
                                                            <strong>Note:</strong> {retrievalAppt.clinic_notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1rem', fontSize: '0.85rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ fontSize: '1.5rem' }}>🕒</div>
                                                <div>
                                                    <strong>Medication Complete</strong>
                                                    <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>Waiting for your clinician to confirm and schedule the Egg Retrieval appointment.</p>
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                );
                            })()}

                            {/* Compensation Payments Section */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '1.25rem', marginTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>💰 Compensation Payments</h4>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {/* Initial Compensation */}
                                    {(() => {
                                        const initialPay = activeCycle.payments?.find(p => p.payment_stage === 'initial');
                                        if (initialPay) {
                                            if (initialPay.payment_status === 'completed') {
                                                return (
                                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                            <SvgIcon name="check" />
                                                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Initial Compensation (Locked)</span>
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>UGX {Number(initialPay.amount).toLocaleString()} paid on {new Date(initialPay.updated_at).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <strong style={{ color: '#065f46', fontSize: '0.9rem' }}>Initial Compensation (50%)</strong>
                                                        <span className={`badge badge-${initialPay.payment_status}`}>{initialPay.payment_status}</span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', color: '#047857' }}>
                                                        <div><strong>Reference:</strong> {initialPay.reference_number}</div>
                                                        <div><strong>Method:</strong> {initialPay.payment_method?.replace('_', ' ')}</div>
                                                        <div><strong>Amount:</strong> UGX {Number(initialPay.amount).toLocaleString()}</div>
                                                        <div><strong>Payment Date:</strong> {new Date(initialPay.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div style={{ background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                <strong>Initial Compensation (50%)</strong> - Pending clinician initiation
                                            </div>
                                        );
                                    })()}

                                    {/* Final Compensation */}
                                    {(() => {
                                        const initialPay = activeCycle.payments?.find(p => p.payment_stage === 'initial');
                                        if (!initialPay || initialPay.payment_status !== 'completed') return null;

                                        const finalPay = activeCycle.payments?.find(p => p.payment_stage === 'final');
                                        if (finalPay) {
                                            return (
                                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <strong style={{ color: '#065f46', fontSize: '0.9rem' }}>Final Compensation (50%)</strong>
                                                        <span className={`badge badge-${finalPay.payment_status}`}>{finalPay.payment_status}</span>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', color: '#047857' }}>
                                                        <div><strong>Reference:</strong> {finalPay.reference_number}</div>
                                                        <div><strong>Method:</strong> {finalPay.payment_method?.replace('_', ' ')}</div>
                                                        <div><strong>Amount:</strong> UGX {Number(finalPay.amount).toLocaleString()}</div>
                                                        <div><strong>Payment Date:</strong> {new Date(finalPay.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '1rem', color: '#92400e', fontSize: '0.85rem' }}>
                                                <strong>Final Compensation (50%)</strong> - Locked until egg retrieval is completed
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            ) : (
                <div className="dd-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem', marginTop: '2rem', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc' }}>
                    <img src="/images/empty-state.png" alt="Waiting for match" style={{ width: '160px', maxWidth: '100%', marginBottom: '1.5rem', opacity: 0.95 }} />
                    <h3 style={{ color: '#0f172a', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 'bold' }}>Waiting for the Next Phase</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                        We are currently reviewing your profile to find the perfect match. 
                        We will notify you right here as soon as the next phase of your journey begins!
                    </p>
                </div>
            )}

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
