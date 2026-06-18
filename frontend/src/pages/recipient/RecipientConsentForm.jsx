import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import '../donor/DonorConsent.css';

const RECIPIENT_CONSENT_TYPES = [
    {
        value: 'recipient_matching',
        label: 'Recipient Matching',
        short: 'Donor-recipient matching',
        description:
            'Allow your anonymised profile and donor preferences to be used by the clinical team for matching you with suitable egg donors.',
        icon: 'link',
    },
    {
        value: 'data_sharing',
        label: 'Data Sharing',
        short: 'Private data handling',
        description:
            'Allow selected, anonymised profile details to be securely stored and shared with the clinical team during the matching and review process.',
        icon: 'shield',
    },
];

function SvgIcon({ name, className = '' }) {
    const paths = {
        shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        link: 'M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14',
        check: 'M20 6 9 17l-5-5',
        x: 'M18 6 6 18M6 6l12 12',
        file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 0v6h6',
    };

    return (
        <svg className={`dc-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function RecipientConsentForm() {
    const { user } = useAuth();
    const [consents, setConsents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const checkProfileAndFetch = async () => {
            try {
                const profileRes = await api.get('/recipients');
                if (profileRes.data?.id) {
                    await fetchConsents();
                } else {
                    window.location.href = '/recipient/dashboard?warning=setup_profile_first';
                }
            } catch (err) {
                window.location.href = '/recipient/dashboard?warning=setup_profile_first';
            }
        };
        checkProfileAndFetch();
    }, []);

    const fetchConsents = async () => {
        try {
            const res = await api.get('/consents');
            setConsents(res.data || []);
        } catch {
            /* leave the page usable if consent fetch fails */
        } finally {
            setLoading(false);
        }
    };

    const getConsentStatus = (type) => {
        const matching = consents.filter((c) => c.consent_type === type);
        if (matching.length === 0) return null;
        return matching.reduce((a, b) => (a.version > b.version ? a : b));
    };

    const grantConsent = async (type) => {
        const info = RECIPIENT_CONSENT_TYPES.find((c) => c.value === type);
        setSaving(type);
        setMessage({ type: '', text: '' });
        try {
            await api.post('/consents', {
                consent_type: type,
                consent_text: info.description,
            });
            setMessage({ type: 'success', text: `${info.label} consent granted.` });
            await fetchConsents();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to grant consent.' });
        } finally {
            setSaving('');
        }
    };

    const revokeConsent = async (consent) => {
        setSaving(consent.consent_type);
        setMessage({ type: '', text: '' });
        try {
            await api.patch(`/consents/${consent.id}/revoke`);
            setMessage({
                type: 'warning',
                text: `${consent.consent_type.replace(/_/g, ' ')} consent has been revoked.`,
            });
            await fetchConsents();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to revoke consent.' });
        } finally {
            setSaving('');
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const grantedCount = RECIPIENT_CONSENT_TYPES.filter((ct) => {
        const status = getConsentStatus(ct.value);
        return status && status.status === 'granted';
    }).length;
    const progress = Math.round((grantedCount / RECIPIENT_CONSENT_TYPES.length) * 100);

    return (
        <div className="page donor-consent-page">
            <section className="dc-hero">
                <div>
                    <div className="dc-kicker">
                        <SvgIcon name="file" />
                        Recipient consent center
                    </div>
                    <h1>Review Your Consents</h1>
                    <p>
                        Grant the permissions required to proceed with donor matching.
                        You can revoke any granted consent later if your decision changes.
                    </p>
                </div>
                <div className="dc-progress-card">
                    <span>{grantedCount}/{RECIPIENT_CONSENT_TYPES.length}</span>
                    <strong>{progress}% complete</strong>
                    <div className="dc-progress-bar">
                        <div style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </section>

            {message.text && (
                <div className={`alert alert-${message.type}`}>{message.text}</div>
            )}

            <div className="dc-consent-grid">
                {RECIPIENT_CONSENT_TYPES.map((ct, index) => {
                    const current = getConsentStatus(ct.value);
                    const isGranted = current && current.status === 'granted';
                    const isRevoked = current && current.status === 'revoked';
                    const isSaving = saving === ct.value;
                    const statusText = isGranted ? 'Granted' : isRevoked ? 'Revoked' : 'Not granted';

                    return (
                        <article
                            className={`dc-consent-card ${isGranted ? 'is-granted' : isRevoked ? 'is-revoked' : ''}`}
                            key={ct.value}
                        >
                            <div className="dc-card-top">
                                <div className="dc-icon-wrap">
                                    <SvgIcon name={ct.icon} />
                                </div>
                                <span className="dc-step-number">{String(index + 1).padStart(2, '0')}</span>
                            </div>

                            <div className="dc-card-copy">
                                <div className="dc-title-row">
                                    <h2>{ct.label}</h2>
                                    <span className={`dc-status ${isGranted ? 'granted' : isRevoked ? 'revoked' : 'pending'}`}>
                                        {isGranted && <SvgIcon name="check" />}
                                        {isRevoked && <SvgIcon name="x" />}
                                        {statusText}
                                    </span>
                                </div>
                                <p className="dc-short">{ct.short}</p>
                                <p className="dc-description">{ct.description}</p>
                                {current && (
                                    <p className="dc-meta">
                                        Version {current.version} -{' '}
                                        {current.status === 'granted' ? 'Granted' : 'Revoked'} on{' '}
                                        {new Date(
                                            current.status === 'granted' ? current.granted_at : current.revoked_at
                                        ).toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            <div className="dc-card-actions">
                                {!isGranted ? (
                                    <button
                                        className="dc-btn dc-btn-primary"
                                        onClick={() => grantConsent(ct.value)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Grant consent'}
                                    </button>
                                ) : (
                                    <button
                                        className="dc-btn dc-btn-danger"
                                        onClick={() => revokeConsent(current)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Revoke'}
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}
