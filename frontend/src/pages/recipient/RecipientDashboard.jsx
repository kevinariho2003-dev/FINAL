import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';

export default function RecipientDashboard() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [consents, setConsents] = useState([]);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, consentsRes, matchesRes] = await Promise.allSettled([
                    api.get('/recipients'),
                    api.get('/consents'),
                    api.get('/matches'),
                ]);
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
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const hasProfile = !!profile;
    const activeConsents = consents.filter(c => c.status === 'granted');
    const hasMatchingConsent = activeConsents.some(c => c.consent_type === 'recipient_matching');
    const approvedMatches = Array.isArray(matches) ? matches.filter(m => m.status === 'approved') : [];
    const matchCount = Array.isArray(matches) ? matches.length : 0;

    // Check if ALL three required types are in the 'granted' list
    const requiredTypes = ['donor_registration', 'recipient_matching', 'info_use'];
    const activeConsentTypes = consents
        .filter(c => c.status === 'granted')
        .map(c => c.consent_type);
    
    const hasAllConsents = requiredTypes.every(type => activeConsentTypes.includes(type));
    const grantedCount = activeConsentTypes.filter(t => requiredTypes.includes(t)).length;

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="/assets/avatars/recipient_default.png" alt="Recipient" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(139,92,246,0.3)', boxShadow: '0 4px 15px rgba(139,92,246,0.2)' }} />
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Welcome, {user?.first_name}</h1>
                    <p className="page-subtitle" style={{ margin: 0 }}>Recipient Dashboard</p>
                </div>
            </div>

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
                    <div className="stat-label">Approved Matches</div>
                    <div className="stat-value">{approvedMatches.length}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Getting Started</h3>
                </div>
                <div className="modern-checklist">
                    <Link to="/recipient/profile" className={`checklist-card ${hasProfile ? 'complete' : 'action-required'}`}>
                        <div className="card-icon-wrapper">
                            {hasProfile ? '✅' : '📝'}
                        </div>
                        <div className="card-content-wrapper">
                            <h4>{hasProfile ? 'Profile & Preferences Completed' : 'Complete Your Profile & Preferences'}</h4>
                            <p>{hasProfile ? 'Your matching requirements are safely stored' : 'Click here to set up your account and start matching'}</p>
                        </div>
                        <div className="card-action-arrow">→</div>
                    </Link>

                    <Link 
                        to="consent" 
                        className={`checklist-card ${hasAllConsents ? 'complete' : 'action-required'}`}
                    >
                        <div className="card-icon-wrapper">
                            {hasAllConsents ? '✅' : '🛡️'}
                        </div>
                        <div className="card-content-wrapper">
                            <h4>
                                {hasAllConsents 
                                    ? 'All Consents Granted' 
                                    : `Grant Required Consents (${grantedCount}/${requiredTypes.length})`
                                }
                            </h4>
                            <p>
                                {hasAllConsents 
                                    ? 'Your legal and medical consents are active' 
                                    : 'Please review and sign the required digital consent forms'}
                            </p>
                        </div>
                        <div className={`card-action-arrow ${hasAllConsents ? 'check-mark' : ''}`}>
                            {hasAllConsents ? '✓' : '→'}
                        </div>
                    </Link>

                    <div className={`checklist-card ${matchCount > 0 ? 'complete' : 'pending'}`}>
                        <div className="card-icon-wrapper">
                            {matchCount > 0 ? '⚙️' : '⏳'}
                        </div>
                        <div className="card-content-wrapper">
                            <h4>{matchCount > 0 ? `${matchCount} Potential Match(es) Found` : 'Awaiting Clinician Matching'}</h4>
                            <p>{matchCount > 0 ? 'Our system has generated potential matches' : 'A clinician will review your profile to find suitable donors'}</p>
                        </div>
                        {matchCount > 0 && <div className="card-action-arrow check-mark">✓</div>}
                    </div>

                    {approvedMatches.length > 0 ? (
                        <Link to="/recipient/matches" className="checklist-card complete action-required">
                            <div className="card-icon-wrapper">⭐</div>
                            <div className="card-content-wrapper">
                                <h4>{approvedMatches.length} Approved Match(es) Available</h4>
                                <p>Click here to review your approved egg donor matches</p>
                            </div>
                            <div className="card-action-arrow">→</div>
                        </Link>
                    ) : (
                        <div className="checklist-card pending">
                            <div className="card-icon-wrapper">⭐</div>
                            <div className="card-content-wrapper">
                                <h4>Review Approved Matches</h4>
                                <p>You will be notified once a clinician approves a match for you</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
