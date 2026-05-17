import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Lock, Info, Calendar } from 'lucide-react';
import '../Dashboard.css';

const CONSENT_TYPES = [
    { value: 'donor_registration', label: 'Donor Registration', description: 'I consent to registering as an egg donor and providing my personal and medical information.' },
    { value: 'data_sharing', label: 'Data Sharing', description: 'I consent to my anonymized profile data being shared with potential recipients for matching purposes.' },
    { value: 'egg_donation', label: 'Egg Donation', description: 'I consent to the egg donation process, including medical procedures and follow-up appointments.' },
    { value: 'recipient_matching', label: 'Recipient Matching', description: 'I consent to being matched with recipients based on my profile and their preferences.' },
    { value: 'photo_use', label: 'Photo Use', description: 'I consent to my photos being used in anonymized form as part of the matching profile.' },
];

export default function DonorConsentForm() {
    const [consents, setConsents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isConsulted, setIsConsulted] = useState(false);

    // FIX: You must call the function here!
    useEffect(() => { 
        fetchInitialData(); 
    }, []);

    const fetchInitialData = async () => {
        try {
            // Fetch both in parallel just like the profile page
            const [donorRes, consentRes] = await Promise.all([
                api.get('/donors'),
                api.get('/consents')
            ]);

            const status = donorRes.data?.status;
            console.log("Verified Donor Status:", status);

            // The Gate logic
            if (status && status !== 'pre_consultation') {
                setIsConsulted(true);
                setConsents(consentRes.data || []);
            } else {
                setIsConsulted(false);
            }
        } catch (err) {
            console.error("Initialization error", err);
            setIsConsulted(false);
        } finally {
            setLoading(false); // This stops the spinner
        }
    };

    const fetchConsents = async () => {
        try {
            const res = await api.get('/consents');
            setConsents(res.data || []);
        } catch (err) {
            console.error("Error fetching consents", err);
        }
    };

    const getConsentStatus = (type) => {
        const matching = consents.filter(c => c.consent_type === type);
        if (matching.length === 0) return null;
        return matching.reduce((a, b) => a.version > b.version ? a : b);
    };

    const grantConsent = async (type) => {
        const info = CONSENT_TYPES.find(c => c.value === type);
        setSaving(type);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/consents', {
                consent_type: type,
                consent_text: info.description,
            });
            setMessage({ type: 'success', text: `${info.label} consent granted successfully.` });
            await fetchConsents();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to grant consent.' });
        } finally { setSaving(''); }
    };

    const revokeConsent = async (consent) => {
        setSaving(consent.consent_type);
        setMessage({ type: '', text: '' });
        try {
            await api.patch(`/consents/${consent.id}/revoke`);
            setMessage({ type: 'warning', text: `${consent.consent_type.replace(/_/g, ' ')} consent has been revoked.` });
            await fetchConsents();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to revoke consent.' });
        } finally { setSaving(''); }
    };

    // 1. SPINNER CHECK
    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    // 2. LOCKED CHECK (The Gate)
    if (!isConsulted) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                <div className="card text-center" style={{ maxWidth: '550px', padding: '3.5rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ 
                            width: '80px', height: '80px', 
                            background: 'rgba(255, 193, 7, 0.1)', 
                            borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto' 
                        }}>
                            <Calendar size={40} color="#ffc107" />
                        </div>
                    </div>
                    <h2 style={{ marginBottom: '1rem' }}>Consultation Required</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                        To ensure you are fully informed about the process, legal rights, and medical implications, 
                        you must complete your <strong>Initial Consultation</strong> with a clinician before granting legal consents.
                    </p>
                    <div className="alert alert-info" style={{ textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Info size={20} />
                        <span>If you have already attended your meeting, please wait for the staff to update your status.</span>
                    </div>
                    <Link to="/donor/dashboard" className="btn btn-primary" style={{ marginTop: '2rem' }}>
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // 3. MAIN FORM (Only shows if loading is false AND isConsulted is true)
    const grantedCount = CONSENT_TYPES.filter(ct => {
        const status = getConsentStatus(ct.value);
        return status && status.status === 'granted';
    }).length;

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Consent Management 📋</h1>
                <p className="page-subtitle">
                    {grantedCount}/{CONSENT_TYPES.length} consents granted — Grant required consents to participate in the matching process
                </p>
            </div>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {CONSENT_TYPES.map(ct => {
                    const current = getConsentStatus(ct.value);
                    const isGranted = current && current.status === 'granted';
                    const isRevoked = current && current.status === 'revoked';
                    const isSaving = saving === ct.value;

                    return (
                        <div className="card" key={ct.value} style={{
                            borderLeft: `3px solid ${isGranted ? 'var(--success)' : isRevoked ? 'var(--danger)' : 'var(--border)'}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '250px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{ct.label}</h3>
                                        {isGranted && <span className="badge badge-approved">Granted</span>}
                                        {isRevoked && <span className="badge badge-rejected">Revoked</span>}
                                        {!current && <span className="badge badge-pending">Not Granted</span>}
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        {ct.description}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {!isGranted && (
                                        <button className="btn btn-success btn-sm" onClick={() => grantConsent(ct.value)} disabled={isSaving}>
                                            {isSaving ? 'Saving...' : 'Grant'}
                                        </button>
                                    )}
                                    {isGranted && (
                                        <button className="btn btn-danger btn-sm" onClick={() => revokeConsent(current)} disabled={isSaving}>
                                            {isSaving ? 'Saving...' : 'Revoke'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
