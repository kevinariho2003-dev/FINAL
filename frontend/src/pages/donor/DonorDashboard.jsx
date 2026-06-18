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
    { key: 'payment', label: 'Initial Payment', icon: 'card' },
    { key: 'cycle', label: 'Medication Phase', link: '/donor/cycles', icon: 'flask' },
    { key: 'retrieval', label: 'Egg Retrieval', icon: 'layers' },
    { key: 'final_payment', label: 'Final Payment', icon: 'card' },
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

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

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
                        <h3>{isApproved ? 'Ready for matching' : hasProfile ? 'Waiting for clinician verification' : 'Start your donor profile'}</h3>
                        <p>
                            {isApproved
                                ? 'Your donor details have been approved. The team can now continue with matching and next steps.'
                                : hasProfile
                                    ? 'Your details are saved. Keep your consents and appointments up to date while the clinical team reviews your profile.'
                                    : 'Complete your profile first so the clinical team can review your information and guide you through the next stage.'
                            }
                        </p>
                        <div className="dd-current-actions">
                            {!hasProfile && <Link to="/donor/profile" className="dd-modern-btn">Complete profile <SvgIcon name="arrow" /></Link>}
                            {hasProfile && !hasConsent && <Link to="/donor/consents" className="dd-modern-btn">Review consents <SvgIcon name="arrow" /></Link>}
                            {hasProfile && hasConsent && !hasScreening && <Link to="/donor/screening" className="dd-modern-btn">Book screening <SvgIcon name="arrow" /></Link>}
                        </div>
                    </div>
                </div>
            </section>

            {(nextAppt || activeCycle) && (
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
                        <div className="dd-panel dd-mini-card">
                            <SvgIcon name="flask" />
                            <div>
                                <h3>Active cycle</h3>
                                <p>Started {new Date(activeCycle.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
