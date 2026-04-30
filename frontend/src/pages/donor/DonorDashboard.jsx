import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import './DonorDashboard.css';

const JOURNEY_STEPS = [
    { key: 'profile', label: 'Complete Donor Profile', desc: 'Fill in your medical, phenotypic, and demographic details', link: '/donor/profile' },
    { key: 'consents', label: 'Grant Required Consents', desc: 'Authorize egg donation, data sharing, and matching', link: '/donor/consents' },
    { key: 'screening', label: 'Medical Screening', desc: 'Upload screening documents or book a clinic appointment', link: '/donor/screening' },
    { key: 'approval', label: 'Clinician Approval', desc: 'A clinician reviews your profile and screening results' },
    { key: 'matching', label: 'Get Matched', desc: 'The matching engine pairs you with compatible recipients' },
    { key: 'cycle', label: 'Donation Cycle', desc: 'Active egg donation procedure, medications, and compensation', link: '/donor/cycles' },
];

export default function DonorDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [consents, setConsents] = useState([]);
    const [matches, setMatches] = useState([]);
    const [screeningDocs, setScreeningDocs] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [donationCycles, setDonationCycles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, consentsRes, matchesRes, cyclesRes] = await Promise.allSettled([
                    api.get('/donors'),
                    api.get('/consents'),
                    api.get('/matches'),
                    api.get('/donation-cycles'),
                ]);
                if (profileRes.status === 'fulfilled' && profileRes.value.data?.id) {
                    setProfile(profileRes.value.data);
                    // Fetch screening data
                    const [docsRes, apptsRes] = await Promise.allSettled([
                        api.get(`/donors/${profileRes.value.data.id}/screening-documents`),
                        api.get(`/donors/${profileRes.value.data.id}/appointments`),
                    ]);
                    if (docsRes.status === 'fulfilled') setScreeningDocs(docsRes.value.data || []);
                    if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.data || []);
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
                    setDonationCycles(cd?.data || cd || []);
                }
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner"></div>
            </div>
        );
    }

    const activeConsents = consents.filter(c => c.status === 'granted');
    const hasProfile = !!profile;
    const isApproved = profile?.status === 'approved';
    const hasEggConsent = activeConsents.some(c => c.consent_type === 'egg_donation');
    const hasScreening = screeningDocs.some(d => d.status === 'verified') || appointments.some(a => a.status === 'completed');
    const matchCount = Array.isArray(matches) ? matches.length : 0;
    const hasCycle = Array.isArray(donationCycles) && donationCycles.length > 0;

    // Calculate journey progress (6 steps now)
    const stepsComplete = [hasProfile, hasEggConsent, hasScreening, isApproved, matchCount > 0, hasCycle].filter(Boolean).length;
    const progressPct = Math.round((stepsComplete / 6) * 100);

    // SVG progress ring math
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (progressPct / 100) * circumference;

    // Determine which step is active (first incomplete)
    const stepStatuses = [hasProfile, hasEggConsent, hasScreening, isApproved, matchCount > 0, hasCycle];
    const activeStepIndex = stepStatuses.indexOf(false);

    // BMI display
    const bmi = profile?.bmi;
    const bmiLabel = bmi
        ? bmi >= 18.5 && bmi <= 24.9 ? 'Healthy' : bmi >= 25 && bmi <= 29.9 ? 'Overweight' : 'Outside range'
        : '—';

    return (
        <div className="page">
            {/* ── Hero Header ── */}
            <div className="donor-dash-header fade-in">
                <div className="greeting" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src="/assets/avatars/donor_default.png" alt="Donor" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(236,72,153,0.3)', boxShadow: '0 4px 15px rgba(236,72,153,0.2)' }} />
                    Welcome back, <span className="greeting-accent">{user?.first_name}</span>
                </div>
                <div className="subtitle">
                    {isApproved
                        ? 'Your profile is approved and ready for matching'
                        : hasProfile
                            ? 'Your profile is under review — hang tight!'
                            : 'Let\'s get your donor profile set up'
                    }
                </div>
                {hasProfile && (
                    <div className="donor-code-chip">
                        🧬 Donor Code: <strong>{profile.donor_code}</strong>
                        <span className={`badge badge-${profile.status}`} style={{ marginLeft: '0.25rem' }}>{profile.status}</span>
                    </div>
                )}
            </div>

            {/* ── Stats Row ── */}
            <div className="donor-stats-row">
                <div className="donor-stat stat-profile fade-in fade-in-delay-1">
                    <div className="stat-icon">📋</div>
                    <div className="stat-number" style={{
                        background: hasProfile ? 'linear-gradient(135deg, var(--success), #34d399)' : 'linear-gradient(135deg, var(--warning), #fbbf24)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        {hasProfile ? profile.status : 'N/A'}
                    </div>
                    <div className="stat-desc">Profile Status</div>
                </div>

                <div className="donor-stat stat-matches fade-in fade-in-delay-2">
                    <div className="stat-icon">💕</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        {matchCount}
                    </div>
                    <div className="stat-desc">Active Matches</div>
                </div>

                <div className="donor-stat stat-consents fade-in fade-in-delay-3">
                    <div className="stat-icon">✅</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, var(--success), #34d399)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        {activeConsents.length}/5
                    </div>
                    <div className="stat-desc">Consents Granted</div>
                </div>

                <div className="donor-stat stat-bmi fade-in fade-in-delay-4">
                    <div className="stat-icon">⚖️</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, var(--info), #60a5fa)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                        {bmi ? bmi : '—'}
                    </div>
                    <div className="stat-desc">BMI ({bmiLabel})</div>
                </div>
            </div>

            {/* ── Main Content Grid ── */}
            <div className="donor-content-grid">
                {/* Left: Progress Ring + Quick Actions */}
                <div className="card fade-in fade-in-delay-2">
                    <div className="card-header">
                        <h3 className="card-title">Your Progress</h3>
                    </div>

                    <div className="progress-section">
                        <div className="progress-ring-container">
                            <svg width="140" height="140" viewBox="0 0 140 140">
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="50%" stopColor="#a78bfa" />
                                        <stop offset="100%" stopColor="#ec4899" />
                                    </linearGradient>
                                </defs>
                                <circle className="progress-ring-bg" cx="70" cy="70" r={radius} />
                                <circle
                                    className="progress-ring-fill"
                                    cx="70" cy="70" r={radius}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                />
                            </svg>
                            <div className="progress-ring-text">
                                <div className="pct">{progressPct}%</div>
                                <div className="pct-label">Complete</div>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
                            {stepsComplete}/6 steps completed
                        </p>
                    </div>

                    <div className="quick-actions">
                        {!hasProfile && (
                            <Link to="/donor/profile" className="quick-action-btn primary">
                                📝 Complete Profile
                            </Link>
                        )}
                        {hasProfile && !hasEggConsent && (
                            <Link to="/donor/consents" className="quick-action-btn primary">
                                📋 Grant Consents
                            </Link>
                        )}
                        {hasProfile && (
                            <Link to="/donor/profile" className="quick-action-btn">
                                ✏️ Edit Profile
                            </Link>
                        )}
                        <Link to="/donor/screening" className="quick-action-btn">
                            🔬 Screening & Appointments
                        </Link>
                        <Link to="/donor/consents" className="quick-action-btn">
                            🔒 Manage Consents
                        </Link>
                    </div>
                </div>

                {/* Right: Journey Timeline */}
                <div className="card fade-in fade-in-delay-3">
                    <div className="card-header">
                        <h3 className="card-title">Donor Journey</h3>
                    </div>

                    <div className="journey-steps">
                        {JOURNEY_STEPS.map((step, i) => {
                            const isComplete = stepStatuses[i];
                            const isActive = i === activeStepIndex;
                            const isPending = !isComplete && !isActive;

                            return (
                                <div className="journey-step" key={step.key}>
                                    <div className="step-indicator">
                                        <div className={`step-dot ${isComplete ? 'complete' : isActive ? 'active' : 'pending'}`}>
                                            {isComplete ? '✓' : i + 1}
                                        </div>
                                        {i < JOURNEY_STEPS.length - 1 && (
                                            <div className={`step-line ${isComplete ? 'complete' : 'pending'}`} />
                                        )}
                                    </div>
                                    <div className="step-content">
                                        <div className="step-title">
                                            {step.link && !isComplete ? (
                                                <Link to={step.link}>{step.label}</Link>
                                            ) : (
                                                <span style={{ color: isComplete ? 'var(--success)' : isPending ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                                    {step.label}
                                                </span>
                                            )}
                                        </div>
                                        <div className="step-desc">{step.desc}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
