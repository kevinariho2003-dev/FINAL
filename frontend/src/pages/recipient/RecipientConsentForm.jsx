// src/components/recipient/RecipientConsentForm.jsx
import { useState, useEffect } from 'react';
import api from '../../services/api';
import '../Dashboard.css';

const CONSENT_TYPES = [
    { value: 'donor_registration', label: 'Donor Registration', description: 'I consent to registering as an egg recipient and providing my personal and medical information.' },
    { value: 'recipient_matching', label: 'Recipient Matching', description: 'I consent to being matched with donors based on my profile and their attributes.' },
    { value: 'info_use', label: 'Info Use', description: 'I consent to my information being used in anonymized form as part of the matching process.' },
];

export default function RecipientConsentForm() {
    const [consents, setConsents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { fetchConsents(); }, []);

    // Auto-hide the floating banner
    useEffect(() => {
        if (message.text) {
            const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

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
        return matching.reduce((a, b) => a.version > b.version ? a : b);
    };

    const grantConsent = async (type) => {
        const info = CONSENT_TYPES.find(c => c.value === type);
        setSaving(type);
        try {
            await api.post('/consents', {
                consent_type: type,
                consent_text: info.description,
            });
            setMessage({ type: 'success', text: `${info.label} consent granted! 🎉` });
            await fetchConsents();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to grant consent.' });
        } finally { setSaving(''); }
    };

    const revokeConsent = async (consent) => {
        setSaving(consent.consent_type);
        try {
            await api.patch(`/consents/${consent.id}/revoke`);
            setMessage({ type: 'warning', text: `Consent revoked.` });
            await fetchConsents();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to revoke.' });
        } finally { setSaving(''); }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const grantedCount = CONSENT_TYPES.filter(ct => {
        const status = getConsentStatus(ct.value);
        return status && status.status === 'granted';
    }).length;

    return (
        <div className="page">
            {/* 🔔 Floating Banner */}
            <div className="banner-container">
                {message.text && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            <div className="page-header">
                <h1 className="page-title">Consent Management 📋</h1>
                <p className="page-subtitle">
                    {grantedCount}/{CONSENT_TYPES.length} consents granted
                </p>
            </div>

            <div className="card-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {CONSENT_TYPES.map(ct => {
                    const current = getConsentStatus(ct.value);
                    const isGranted = current && current.status === 'granted';
                    const isRevoked = current && current.status === 'revoked';
                    const isSaving = saving === ct.value;

                    return (
                        <div className="card" key={ct.value} style={{
                            borderLeft: `4px solid ${isGranted ? 'var(--success)' : 'var(--border)'}`,
                        }}>
                            <div className="card-flex-row">
                                <div style={{ flex: 1 }}>
                                    <div className="status-badge-group">
                                        <h3 className="card-title-sm">{ct.label}</h3>
                                        {isGranted ? 
                                            <span className="badge badge-approved">Active</span> : 
                                            <span className="badge badge-pending">Pending</span>
                                        }
                                    </div>
                                    <p className="text-muted-sm">{ct.description}</p>
                                </div>
                                
                                <div className="action-area">
                                    {isGranted ? (
                                        <button className="btn btn-outline-danger btn-sm" onClick={() => revokeConsent(current)} disabled={isSaving}>
                                            {isSaving ? '...' : 'Revoke'}
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary btn-sm" onClick={() => grantConsent(ct.value)} disabled={isSaving}>
                                            {isSaving ? '...' : 'Grant Consent'}
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
