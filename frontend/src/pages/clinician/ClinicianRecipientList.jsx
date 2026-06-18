import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import '../Dashboard.css';
import './ClinicianDashboard.css';
import './ClinicianRecipientList.css';

const STATUS_TABS = [
    { key: '',          label: 'All Recipients' },
    { key: 'pending',   label: 'Pending' },
    { key: 'approved',  label: 'Approved' },
    { key: 'suspended', label: 'Suspended' },
];

const PRIORITY_COLOR = {
    urgent: { bg: '#fff1f2', text: '#be123c', dot: '#f43f5e' },
    high:   { bg: '#fff7ed', text: '#c2410c', dot: '#f97316' },
    normal: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
    low:    { bg: '#f8fafc', text: '#475569', dot: '#94a3b8' },
};

const STATUS_COLOR = {
    approved:  { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
    pending:   { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
    active:    { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' }, // legacy — same as pending
    suspended: { bg: '#fff1f2', text: '#e11d48', dot: '#f43f5e' },
};

function initials(r) {
    return ((r?.user?.first_name?.[0] || '') + (r?.user?.last_name?.[0] || '')).toUpperCase() || 'RC';
}

/* ─── Confirm Modal ─── */
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
    if (!isOpen) return null;
    return (
        <div className="rc-modal-overlay" style={{ zIndex: 9999 }}>
            <div className="rc-modal" style={{ width: '400px', height: 'auto', maxHeight: 'none', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center', borderRadius: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '-0.5rem', border: '1px solid #e2e8f0' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>{title}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>{message}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
                    <button style={{ flex: 1, padding: '0.8rem', borderRadius: '14px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onClick={onCancel} onMouseOver={e=>e.target.style.background='#f8fafc'} onMouseOut={e=>e.target.style.background='#fff'}>Cancel</button>
                    <button style={{ flex: 1, padding: '0.8rem', borderRadius: '14px', border: 'none', background: '#0f172a', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} onClick={onConfirm} onMouseOver={e=>e.target.style.transform='translateY(-1px)'} onMouseOut={e=>e.target.style.transform='none'}>Confirm</button>
                </div>
            </div>
        </div>
    );
}

/* ── Recipient Card ── */
function RecipientCard({ r, delay, onView, onStatusChange, onMatch, generatingId }) {
    const sc = STATUS_COLOR[r.status]   || STATUS_COLOR.pending;
    const name = `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim();

    return (
        <div className="rc-card" style={{ animationDelay: `${delay}ms` }}>
            <div className="rc-card-body">
                {/* Header */}
                <div className="rc-card-header">
                    <div className="rc-card-id-row">
                        <div className="rc-avatar">{initials(r)}</div>
                        <div className="rc-card-info">
                            <div className="rc-name">{name || '—'}</div>
                            <div className="rc-code">{r.recipient_code}</div>
                        </div>
                    </div>
                    <span className="rc-status-badge" style={{ background: sc.bg, color: sc.text }}>
                        {r.status}
                    </span>
                </div>

                {/* Key details */}
                <div className="rc-clinical-grid">
                    <div className="rc-spec">
                        <span className="spec-label">Blood</span>
                        <span className="spec-value">{r.preferred_blood_type || 'Any'}</span>
                    </div>
                    <div className="rc-spec">
                        <span className="spec-label">Diagnosis</span>
                        <span className="spec-value">{r.diagnosis ? r.diagnosis.slice(0, 20) + (r.diagnosis.length > 20 ? '…' : '') : '—'}</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="rc-actions">
                <button className="rc-btn rc-btn-view" onClick={() => onView(r.id)}>
                    View Profile
                </button>
                {(r.status === 'pending' || r.status === 'active') && <>
                    <button className="rc-btn rc-btn-approve" onClick={() => onStatusChange(r.id, 'approved')}>Approve</button>
                    <button className="rc-btn rc-btn-suspend" onClick={() => onStatusChange(r.id, 'suspended')}>Decline</button>
                </>}
                {r.status === 'approved' && <>
                    <button
                        className="rc-btn rc-btn-match"
                        style={{
                            background: '#6366f1',
                            color: '#ffffff',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onMatch(r.id);
                        }}
                        disabled={generatingId === r.id}
                    >
                        {generatingId === r.id ? (
                            <><span className="rc-spinner" />Matching…</>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                    <path d="M2 12h22"></path>
                                </svg>
                                Run Matching
                            </>
                        )}
                    </button>
                    <button className="rc-btn rc-btn-suspend" onClick={() => onStatusChange(r.id, 'suspended')}>Suspend</button>
                </>}
                {r.status === 'suspended' && (
                    <button className="rc-btn rc-btn-approve" onClick={() => onStatusChange(r.id, 'approved')}>Reactivate</button>
                )}
            </div>
        </div>
    );
}

/* ── Main Page ── */
export default function ClinicianRecipientList() {
    const navigate = useNavigate();
    const [recipients,   setRecipients]   = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [filter,       setFilter]       = useState('');
    const [search,       setSearch]       = useState('');
    const [toast,        setToast]        = useState(null);
    const [generatingId, setGeneratingId] = useState(null);
    const [modal,        setModal]        = useState(null);
    const [mLoading,     setMLoading]     = useState(false);
    const [matchResult,  setMatchResult]  = useState(null); // result of last match run
    const [confirm,      setConfirm]      = useState({ isOpen: false, id: null, status: null, actionName: '' });

    useEffect(() => { fetchRecipients(); }, [filter]);

    const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

    const fetchRecipients = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter) params.status = filter;
            if (search) params.search = search;
            const res = await api.get('/recipients', { params });
            setRecipients(res.data?.data || res.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const requestStatusChange = (id, status) => {
        const actionName = status === 'approved' ? 'approve' : (status === 'suspended' ? 'suspend' : status);
        setConfirm({ isOpen: true, id, status, actionName });
    };

    const confirmStatusChange = async () => {
        const { id, status } = confirm;
        setConfirm({ isOpen: false, id: null, status: null, actionName: '' });
        
        try {
            await api.patch(`/recipients/${id}/status`, { status });
            flash('success', `Recipient ${status} successfully`);
            fetchRecipients();
            if (modal?.id === id) setModal(m => ({ ...m, status }));
        } catch (err) {
            flash('error', err.response?.data?.message || 'Action failed');
        }
    };

    const generateMatches = async (recipientId) => {
        setGeneratingId(recipientId);
        setMatchResult(null);
        try {
            const res = await api.post(`/matches/generate/${recipientId}`);
            const s = res.data.summary;
            if (s.matches_saved > 0) {
                setMatchResult({ type: 'success', saved: s.matches_saved, evaluated: s.donors_evaluated });
                flash('success', `✅ ${s.matches_saved} match${s.matches_saved > 1 ? 'es' : ''} generated from ${s.donors_evaluated} donors`);
                setTimeout(() => {
                    navigate('/clinician/matches');
                }, 1200);
            } else {
                setMatchResult({ type: 'none', evaluated: s.donors_evaluated });
                flash('error', `No matches found — ${s.donors_evaluated} donors evaluated, none passed filters`);
            }
        } catch (err) {
            flash('error', err.response?.data?.message || 'Matching engine failed');
        } finally {
            setGeneratingId(null);
        }
    };

    const openModal = async (id) => {
        setMLoading(true);
        setMatchResult(null);
        try {
            const res = await api.get(`/recipients/${id}`);
            setModal(res.data);
        } catch { flash('error', 'Failed to load recipient'); }
        finally { setMLoading(false); }
    };

    const closeModal = () => { setModal(null); setMatchResult(null); };

    const total    = recipients.length;
    const approved = recipients.filter(r => r.status === 'approved').length;
    const pending  = recipients.filter(r => r.status === 'pending').length;

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    return (
        <div className="page rc-page">

            {/* ── Header ── */}
            <div className="rc-header">
                <div>
                    <h1 className="rc-title">Recipient Management</h1>
                    <p className="rc-subtitle">Review profiles, approve recipients, and run the matching engine</p>
                </div>
            </div>

            {/* ── Summary Bar ── */}
            <div className="rc-summary-bar">
                {[
                    { 
                        label: 'Total',    
                        val: total,     
                        icon: (
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        ), 
                        color: '#6366f1' 
                    },
                    { 
                        label: 'Approved',         
                        val: approved,  
                        icon: (
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        ), 
                        color: '#16a34a' 
                    },
                    { 
                        label: 'Pending',         
                        val: pending,  
                        icon: (
                            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        ), 
                        color: '#d97706' 
                    },
                ].map(s => (
                    <div className="rc-summary-card" key={s.label}>
                        <span className="rc-summary-icon" style={{ color: s.color, display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                        <div>
                            <div className="rc-summary-val" style={{ color: s.color }}>{s.val}</div>
                            <div className="rc-summary-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Controls ── */}
            <div className="rc-controls">
                <TabSlider tabs={STATUS_TABS} active={filter} onChange={setFilter} />
                <form className="rc-search" onSubmit={e => { e.preventDefault(); fetchRecipients(); }}>
                    <input className="rc-search-input" placeholder="Search name or code…" value={search} onChange={e => setSearch(e.target.value)} />
                    <button type="submit" className="rc-search-btn">Search</button>
                </form>
            </div>

            {/* ── Grid ── */}
            {recipients.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><svg viewBox="0 0 24 24" width="44" height="44" stroke="#ec4899" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg></div>
                    <div className="empty-state-text">No recipients found</div>
                    <div className="empty-state-sub">Adjust your filter or search</div>
                </div>
            ) : (
                <div className="rc-grid">
                    {recipients.map((r, i) => (
                        <RecipientCard key={r.id} r={r} delay={i * 40}
                            onView={openModal} onStatusChange={requestStatusChange} onMatch={generateMatches} generatingId={generatingId} />
                    ))}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {(modal || mLoading) && (
                <div className="rc-modal-overlay" onClick={closeModal}>
                    <div className="rc-modal" onClick={e => e.stopPropagation()}>
                        <button className="rc-modal-close" onClick={closeModal}>✕</button>

                        {mLoading ? <div className="rc-modal-loading"><div className="spinner" /></div> : (
                            <>
                                {/* Modal Hero */}
                                <div className="rc-modal-hero">
                                    <div className="rc-modal-avatar">{initials(modal)}</div>
                                    <div className="rc-modal-hero-info">
                                        <h2 className="rc-modal-name">{modal.user?.first_name} {modal.user?.last_name}</h2>
                                        <div className="rc-modal-tags">
                                            <span className="rc-code-tag">{modal.recipient_code}</span>
                                            <span className="rc-chip" style={{
                                                background: (STATUS_COLOR[modal.status]||STATUS_COLOR.pending).bg,
                                                color:      (STATUS_COLOR[modal.status]||STATUS_COLOR.pending).text,
                                            }}>{modal.status}</span>
                                            <span className="rc-chip" style={{
                                                background: (PRIORITY_COLOR[modal.priority_level]||PRIORITY_COLOR.normal).bg,
                                                color:      (PRIORITY_COLOR[modal.priority_level]||PRIORITY_COLOR.normal).text,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontWeight: 600,
                                            }}>
                                                <span style={{
                                                    background: (PRIORITY_COLOR[modal.priority_level]||PRIORITY_COLOR.normal).dot,
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    display: 'inline-block'
                                                }} />
                                                {(modal.priority_level || 'normal')} priority
                                            </span>
                                            {modal.is_international && (
                                                <span className="rc-intl-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                                                    International
                                                </span>
                                            )}
                                        </div>
                                        <div className="rc-modal-contact">
                                            {modal.user?.email && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                                    {modal.user.email}
                                                </span>
                                            )}
                                            {modal.user?.phone && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
                                                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                    {modal.user.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Match result banner */}
                                {matchResult && (
                                    <div className={`rc-match-banner rc-match-${matchResult.type}`}>
                                        {matchResult.type === 'success'
                                            ? `✅ ${matchResult.saved} match${matchResult.saved > 1 ? 'es' : ''} found from ${matchResult.evaluated} donors evaluated`
                                            : `⚠️ No compatible donors found — ${matchResult.evaluated} donors evaluated`
                                        }
                                    </div>
                                )}

                                <div className="rc-modal-body">

                                    {/* Medical */}
                                    <div className="rc-modal-section">
                                        <h4 className="rc-section-title">🩺 Medical Information</h4>
                                        <div className="rc-field-block">
                                            <div>
                                                <span className="rc-field-label">Diagnosis</span>
                                                <span className="rc-field-val">{modal.diagnosis || '—'}</span>
                                            </div>
                                            <div>
                                                <span className="rc-field-label">Treatment History</span>
                                                <span className="rc-field-val">{modal.treatment_history || '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Donor Preferences */}
                                    <div className="rc-modal-section">
                                        <h4 className="rc-section-title">🎯 Donor Preferences</h4>
                                        <div className="rc-pref-grid">
                                            {[
                                                ['Blood Type',    modal.preferred_blood_type     || 'Any'],
                                                ['Genotype',      modal.preferred_genotype        || 'Any'],
                                                ['Ethnicity',     modal.preferred_ethnicity       || 'Any'],
                                                ['Skin Tone',     modal.preferred_skin_tone       || 'Any'],
                                                ['Hair Colour',   modal.preferred_hair_color      || 'Any'],
                                                ['Eye Colour',    modal.preferred_eye_color       || 'Any'],
                                                ['Education',     modal.preferred_education_level || 'Any'],
                                                ['Age Range',     `${modal.preferred_age_min||18}–${modal.preferred_age_max||45} yrs`],
                                                ['Max Donations', modal.max_previous_donations ?? 'Any'],
                                            ].map(([label, val]) => (
                                                <div className="rc-pref-item" key={label}>
                                                    <span className="rc-field-label">{label}</span>
                                                    <span className="rc-field-val rc-pref-val">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Clinician */}
                                    {modal.clinician && (
                                        <div className="rc-modal-section">
                                            <h4 className="rc-section-title">👨‍⚕️ Assigned Clinician</h4>
                                            <div className="rc-clinician-row">
                                                <div className="rc-clin-avatar">
                                                    {modal.clinician.first_name?.[0]}{modal.clinician.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {modal.clinician.first_name} {modal.clinician.last_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                        {modal.clinician.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="rc-modal-footer">
                                    {modal.status === 'approved' && (
                                        <button
                                            className="rc-btn rc-btn-match rc-btn-lg"
                                            onClick={() => generateMatches(modal.id)}
                                            disabled={generatingId === modal.id}
                                        >
                                            {generatingId === modal.id
                                                ? <><span className="rc-spinner" />Running matching engine…</>
                                                : '🔬 Generate Donor Matches'}
                                        </button>
                                    )}
                                    {/* Footer */}
                                    <div className="rc-modal-footer">
                                        {modal.status === 'pending' && <>
                                            <button className="rc-btn rc-btn-approve" onClick={() => { requestStatusChange(modal.id, 'approved'); closeModal(); }}>Approve Recipient</button>
                                            <button className="rc-btn rc-btn-suspend" onClick={() => { requestStatusChange(modal.id, 'suspended'); closeModal(); }}>Decline</button>
                                        </>}
                                        {modal.status === 'approved' && <button className="rc-btn rc-btn-suspend" onClick={() => { requestStatusChange(modal.id, 'suspended'); closeModal(); }}>Suspend</button>}
                                        {modal.status === 'suspended' && <button className="rc-btn rc-btn-approve" onClick={() => { requestStatusChange(modal.id, 'approved'); closeModal(); }}>Reactivate</button>}
                                        <button className="rc-btn rc-btn-view" onClick={closeModal}>Close</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirm.isOpen}
                title={`Confirm Action`}
                message={`Are you sure you want to ${confirm.actionName} this recipient profile? This action will take effect immediately.`}
                onConfirm={confirmStatusChange}
                onCancel={() => setConfirm({ isOpen: false, id: null, status: null, actionName: '' })}
            />

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
