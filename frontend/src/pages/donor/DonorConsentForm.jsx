import { useState, useEffect } from 'react';
import api from '../../services/api';
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

    useEffect(() => { fetchConsents(); }, []);

    const fetchConsents = async () => {
        try {
            const res = await api.get('/consents');
            setConsents(res.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const getConsentStatus = (type) => {
        const matching = consents.filter(c => c.consent_type === type);
        if (matching.length === 0) return null;
        // Get the latest version
        const latest = matching.reduce((a, b) => a.version > b.version ? a : b);
        return latest;
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

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

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
                                    {current && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            Version {current.version} · {current.status === 'granted' ? 'Granted' : 'Revoked'} on{' '}
                                            {new Date(current.status === 'granted' ? current.granted_at : current.revoked_at).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {!isGranted && (
                                        <button
                                            className="btn btn-success btn-sm"
                                            onClick={() => grantConsent(ct.value)}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? 'Saving...' : 'Grant'}
                                        </button>
                                    )}
                                    {isGranted && (
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => revokeConsent(current)}
                                            disabled={isSaving}
                                        >
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
