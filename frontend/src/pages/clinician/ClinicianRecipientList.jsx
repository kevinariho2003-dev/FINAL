import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import { IconHeartPulse, IconDNA, IconShieldCheck, IconBan } from '../../components/Icons';
import '../Dashboard.css';
import './ClinicianDashboard.css';

const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'suspended', label: 'Suspended' },
];

export default function ClinicianRecipientList() {
    const { user } = useAuth();
    const [recipients, setRecipients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => { fetchRecipients(); }, [filter]);

    const fetchRecipients = async () => {
        try {
            setLoading(true);
            const params = {};
            if (filter) params.status = filter;
            if (search) params.search = search;
            const res = await api.get('/recipients', { params });
            setRecipients(res.data?.data || res.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchRecipients(); };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/recipients/${id}/status`, { status });
            setToast({ type: 'success', msg: `Recipient ${status} successfully` });
            fetchRecipients();
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Failed' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const generateMatches = async (recipientId) => {
        setGeneratingId(recipientId);
        try {
            const res = await api.post(`/matches/generate/${recipientId}`);

            if (res.data.summary.matches_saved > 0) {
                setToast({ type: 'success', msg: `SUCCESS: ${res.data.summary.matches_saved} matches generated from ${res.data.summary.donors_evaluated} donors!` });
            } else if (res.data.summary.passed_hard_filter > 0) {
                setToast({ type: 'error', msg: `⚠️ Donors passed filter, but failed score threshold.` });
            } else {
                setToast({ type: 'error', msg: `0 matches created. All ${res.data.summary.donors_evaluated} donors failed strictly medical hard-filters.` });
            }
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Matching engine failed.' });
        } finally {
            setGeneratingId(null);
            setTimeout(() => setToast(null), 6000);
        }
    };

    const viewDetails = async (recipientId) => {
        setDetailLoading(true);
        try {
            const res = await api.get(`/recipients/${recipientId}`);
            setSelectedRecipient(res.data);
        } catch {
            setToast({ type: 'error', msg: 'Failed to load recipient details' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeModal = () => setSelectedRecipient(null);

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            {/* Avatar Background */}
            {user?.avatar_url && (
                <div className="clin-avatar-bg">
                    <img src={user.avatar_url} alt="" className="clin-avatar-bg-img" />
                    <div className="clin-avatar-bg-overlay" />
                </div>
            )}
            <div className="page-header">
                <h1 className="page-title">Recipient Management <IconHeartPulse size={24} color="#a855f7" style={{ verticalAlign: 'middle' }} /></h1>
                <p className="page-subtitle">Review, approve, and generate matches for recipients</p>
            </div>

            <TabSlider tabs={STATUS_TABS} active={filter} onChange={setFilter} />

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="form-input" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
                    <button type="submit" className="btn btn-primary btn-sm">Search</button>
                </form>
            </div>

            {recipients.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><IconHeartPulse size={48} color="#a855f7" /></div>
                    <div className="empty-state-text">No recipients found</div>
                    <div className="empty-state-sub">Recipients will appear here once they register</div>
                </div>
            ) : (
                <div className="profile-cards-grid">
                    {recipients.map((r, i) => (
                        <div key={r.id} className="profile-card" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="profile-card-header">
                                <div className="profile-card-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}><img src="/assets/avatars/recipient_default.png" alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                                <div>
                                    <div className="profile-card-name">{r.user?.first_name} {r.user?.last_name}</div>
                                    <div className="profile-card-code">{r.recipient_code}</div>
                                </div>
                                <span className={`badge badge-${r.status}`}>{r.status}</span>
                            </div>
                            <div className="profile-card-details">
                                <div className="profile-detail">
                                    <div className="profile-detail-label">Diagnosis</div>
                                    <div className="profile-detail-value" style={{ fontSize: '0.78rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {r.diagnosis || '—'}
                                    </div>
                                </div>
                                <div className="profile-detail">
                                    <div className="profile-detail-label">Priority</div>
                                    <div className="profile-detail-value">
                                        <span className={`badge ${r.priority_level === 'urgent' ? 'badge-pending' : 'badge-active'}`} style={{ fontSize: '0.7rem' }}>
                                            {r.priority_level || 'normal'}
                                        </span>
                                    </div>
                                </div>
                                <div className="profile-detail">
                                    <div className="profile-detail-label">Status</div>
                                    <div className="profile-detail-value">{r.status || '—'}</div>
                                </div>
                            </div>
                            <div className="profile-card-actions">
                                <button className="btn btn-outline btn-sm" onClick={() => viewDetails(r.id)}>
                                    👁️ Details
                                </button>
                                {r.status === 'pending' && (
                                    <>
                                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.id, 'approved')}>Approve</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'suspended')}>Suspend</button>
                                    </>
                                )}
                                {r.status === 'approved' && (
                                    <>
                                        <button
                                            className="btn btn-primary btn-sm btn-generate"
                                            onClick={() => generateMatches(r.id)}
                                            disabled={generatingId === r.id}
                                        >
                                            {generatingId === r.id ? (
                                                <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 5 }}></div> ...</>
                                            ) : <><IconDNA size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Match</>}
                                        </button>
                                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'suspended')}>Suspend</button>
                                    </>
                                )}
                                {r.status === 'suspended' && (
                                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.id, 'approved')}>Reactivate</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {selectedRecipient && (
                <div className="detail-modal-overlay" onClick={closeModal}>
                    <div className="detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="detail-modal-close" onClick={closeModal}>✕</button>

                        <div className="detail-modal-header">
                            <div className="detail-modal-avatar" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                                <img src="/assets/avatars/recipient_default.png" alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                                <h2 className="detail-modal-name">{selectedRecipient.user?.first_name} {selectedRecipient.user?.last_name}</h2>
                                <span className="detail-modal-code">{selectedRecipient.recipient_code}</span>
                                <span className={`badge badge-${selectedRecipient.status}`} style={{ marginLeft: 8 }}>{selectedRecipient.status}</span>
                            </div>
                        </div>

                        <div className="detail-modal-body">
                            {/* Personal Info */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">👤 Personal Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Email</span>
                                        <span className="detail-value">{selectedRecipient.user?.email || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Phone</span>
                                        <span className="detail-value">{selectedRecipient.user?.phone || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Priority Level</span>
                                        <span className={`badge ${selectedRecipient.priority_level === 'urgent' ? 'badge-pending' : 'badge-active'}`}>
                                            {selectedRecipient.priority_level || 'normal'}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">International</span>
                                        <span className="detail-value">{selectedRecipient.is_international ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Info */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">🩺 Medical Information</h3>
                                <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
                                    <div className="detail-item">
                                        <span className="detail-label">Diagnosis</span>
                                        <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedRecipient.diagnosis || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Treatment History</span>
                                        <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{selectedRecipient.treatment_history || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Donor Preferences */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">🎯 Donor Preferences</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Blood Type</span>
                                        <span className="detail-value highlight">{selectedRecipient.preferred_blood_type || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Genotype</span>
                                        <span className="detail-value highlight">{selectedRecipient.preferred_genotype || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Ethnicity</span>
                                        <span className="detail-value">{selectedRecipient.preferred_ethnicity || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Skin Tone</span>
                                        <span className="detail-value">{selectedRecipient.preferred_skin_tone || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Hair Color</span>
                                        <span className="detail-value">{selectedRecipient.preferred_hair_color || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Eye Color</span>
                                        <span className="detail-value">{selectedRecipient.preferred_eye_color || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Age Range</span>
                                        <span className="detail-value">
                                            {selectedRecipient.preferred_age_min || 18} – {selectedRecipient.preferred_age_max || 45} years
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Preferred Education</span>
                                        <span className="detail-value">{selectedRecipient.preferred_education_level || 'Any'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Max Previous Donations</span>
                                        <span className="detail-value">{selectedRecipient.max_previous_donations ?? 'Any'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Clinician */}
                            {selectedRecipient.clinician && (
                                <div className="detail-section">
                                    <h3 className="detail-section-title">👨‍⚕️ Assigned Clinician</h3>
                                    <div className="detail-grid">
                                        <div className="detail-item">
                                            <span className="detail-label">Name</span>
                                            <span className="detail-value">{selectedRecipient.clinician.first_name} {selectedRecipient.clinician.last_name}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Email</span>
                                            <span className="detail-value">{selectedRecipient.clinician.email}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="detail-modal-actions">
                            {selectedRecipient.status === 'approved' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => { generateMatches(selectedRecipient.id); closeModal(); }}
                                    disabled={generatingId === selectedRecipient.id}
                                >
                                    <IconDNA size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Generate Matches
                                </button>
                            )}
                            {selectedRecipient.status === 'pending' && (
                                <>
                                    <button className="btn btn-success" onClick={() => { updateStatus(selectedRecipient.id, 'approved'); closeModal(); }}>
                                        ✅ Approve
                                    </button>
                                    <button className="btn btn-danger" onClick={() => { updateStatus(selectedRecipient.id, 'suspended'); closeModal(); }}>
                                        🚫 Suspend
                                    </button>
                                </>
                            )}
                            {selectedRecipient.status === 'approved' && (
                                <button className="btn btn-danger" onClick={() => { updateStatus(selectedRecipient.id, 'suspended'); closeModal(); }}>
                                    🚫 Suspend
                                </button>
                            )}
                            {selectedRecipient.status === 'suspended' && (
                                <button className="btn btn-success" onClick={() => { updateStatus(selectedRecipient.id, 'approved'); closeModal(); }}>
                                    ✅ Reactivate
                                </button>
                            )}
                            <button className="btn btn-outline" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading overlay for detail fetch */}
            {detailLoading && (
                <div className="detail-modal-overlay">
                    <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
                </div>
            )}

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
