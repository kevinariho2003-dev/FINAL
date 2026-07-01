import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import { IconFlower } from '../../components/Icons';
import '../Dashboard.css';
import './ClinicianDashboard.css';
import './ClinicianDonorList.css';

const STATUS_TABS = [
    { key: '', label: 'All Donors' },
    { key: 'pending', label: 'Pending Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'suspended', label: 'Suspended' },
];

/* ─── helpers ─── */
const BASE = 'http://127.0.0.1:8000';

function photoUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE}/storage/${path}`;
}

function initials(d) {
    return ((d?.user?.first_name?.[0] || '') + (d?.user?.last_name?.[0] || '')).toUpperCase() || 'DN';
}

function age(dob) {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function fmtDate(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const STATUS_COLOR = {
    approved:  { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
    pending:   { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
    suspended: { bg: '#fff1f2', text: '#e11d48', dot: '#f43f5e' },
    inactive:  { bg: '#f8fafc', text: '#64748b', dot: '#94a3b8' },
};

const SCREEN_COLOR = {
    clear:   '#16a34a',
    flagged: '#dc2626',
    pending: '#d97706',
};

/* ─── Confirm Modal ─── */
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
    if (!isOpen) return null;
    return createPortal(
        <div className="dnr-modal-overlay" style={{ zIndex: 9999 }}>
            <div className="dnr-modal" style={{ width: '400px', height: 'auto', maxHeight: 'none', padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center', borderRadius: '24px' }}>
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
        </div>,
        document.body
    );
}

/* ─── Donor Profile Card ─── */
function DonorCard({ donor, delay, onView, onStatusChange }) {
    const img   = photoUrl(donor.photo_path);
    const ini   = initials(donor);
    const yrs   = age(donor.date_of_birth);
    const sc    = STATUS_COLOR[donor.status] || STATUS_COLOR.inactive;
    const name  = `${donor.user?.first_name || ''} ${donor.user?.last_name || ''}`.trim();

    return (
        <div className="dnr-card" style={{ animationDelay: `${delay}ms` }}>
            {/* Photo */}
            <div className="dnr-photo-wrap">
                {img
                    ? <img src={img} alt="" loading="lazy" className="dnr-photo" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    : null
                }
                <div className="dnr-initials" style={{ display: img ? 'none' : 'flex' }}>{ini}</div>

                {/* status dot */}
                <span className="dnr-dot" style={{ background: sc.dot }} title={donor.status} />

                {/* no-photo warning */}
                {!donor.photo_path && (
                    <div className="dnr-no-photo-chip">No photo</div>
                )}
            </div>

            {/* Content Right Side */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Body */}
                <div className="dnr-body">
                <div className="dnr-body-header">
                    <div className="dnr-identity">
                        <div className="dnr-name">{name || '—'}</div>
                        <div className="dnr-code">{donor.donor_code}</div>
                    </div>
                    <span className="dnr-status-badge" style={{ background: sc.bg, color: sc.text }}>
                        {donor.status}
                    </span>
                </div>

                <div className="dnr-clinical-grid">
                    <div className="dnr-spec">
                        <span className="spec-label">Blood</span>
                        <span className="spec-value">{donor.blood_type || '--'}</span>
                    </div>
                    <div className="dnr-spec">
                        <span className="spec-label">Age</span>
                        <span className="spec-value">{yrs ? `${yrs} yrs` : '--'}</span>
                    </div>
                    <div className="dnr-spec">
                        <span className="spec-label">Genotype</span>
                        <span className="spec-value">{donor.genotype || '--'}</span>
                    </div>
                </div>

                <div className="dnr-meta-list">
                    <div className="dnr-meta-item">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                        <span>{donor.ethnicity || 'Ethnicity N/A'}</span>
                    </div>
                    <div className="dnr-meta-item">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>
                        <span>{donor.education_level || 'Education N/A'}</span>
                    </div>
                </div>

                <div className="dnr-screening-bar">
                    <div className="screen-dot" style={{ background: SCREEN_COLOR[donor.genetic_screening_status] || '#94a3b8' }} />
                    <span className="screen-text">Screening: <strong style={{ color: SCREEN_COLOR[donor.genetic_screening_status] || '#64748b' }}>{donor.genetic_screening_status || 'pending'}</strong></span>
                </div>
            </div>

            {/* Actions */}
            <div className="dnr-actions">
                <button className="dnr-btn dnr-btn-view" onClick={() => onView(donor.id)}>
                    View Profile
                </button>
                {donor.status === 'pending' && (
                    <>
                        <button className="dnr-btn dnr-btn-approve" onClick={() => onStatusChange(donor.id, 'approved')}>
                            Approve
                        </button>
                        <button className="dnr-btn dnr-btn-suspend" onClick={() => onStatusChange(donor.id, 'suspended')}>
                            Decline
                        </button>
                    </>
                )}
                {donor.status === 'approved' && (
                    <button className="dnr-btn dnr-btn-suspend" onClick={() => onStatusChange(donor.id, 'suspended')}>
                        Suspend
                    </button>
                )}
                {donor.status === 'suspended' && (
                    <button className="dnr-btn dnr-btn-approve" onClick={() => onStatusChange(donor.id, 'approved')}>
                        Reactivate
                    </button>
                )}
            </div>
            </div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function ClinicianDonorList() {
    const { user } = useAuth();
    const [donors,    setDonors]    = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [filter,    setFilter]    = useState('');
    const [search,    setSearch]    = useState('');
    const [toast,     setToast]     = useState(null);
    const [modal,     setModal]     = useState(null);   // full donor object
    const [mDocs,     setMDocs]     = useState([]);
    const [mAppts,    setMAppts]    = useState([]);
    const [mLoading,  setMLoading]  = useState(false);
    const [confirm,   setConfirm]   = useState({ isOpen: false, id: null, status: null, actionName: '' });

    useEffect(() => { fetchDonors(); }, [filter]);

    const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchDonors = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filter) params.status = filter;
            if (search) params.search = search;
            const res = await api.get('/donors', { params });
            setDonors(res.data?.data || res.data || []);
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
            await api.patch(`/donors/${id}/status`, { status });
            flash('success', `Donor ${status} successfully`);
            fetchDonors();
            if (modal?.id === id) setModal(m => ({ ...m, status }));
        } catch (err) {
            flash('error', err.response?.data?.message || 'Action failed');
        }
    };

    const openModal = async (id) => {
        setMLoading(true);
        try {
            const [dr, docsR, appR] = await Promise.allSettled([
                api.get(`/donors/${id}`),
                api.get(`/donors/${id}/screening-documents`),
                api.get(`/donors/${id}/appointments`),
            ]);
            if (dr.status === 'fulfilled') setModal(dr.value.data);
            setMDocs(docsR.status === 'fulfilled' ? docsR.value.data || [] : []);
            setMAppts(appR.status === 'fulfilled'  ? appR.value.data  || [] : []);
        } catch { flash('error', 'Failed to load donor'); }
        finally { setMLoading(false); }
    };

    const closeModal = () => { setModal(null); setMDocs([]); setMAppts([]); };

    const reviewDoc = async (docId, status) => {
        try {
            await api.patch(`/screening-documents/${docId}/review`, { status });
            flash('success', `Document ${status}`);
            const r = await api.get(`/donors/${modal.id}/screening-documents`);
            setMDocs(r.data || []);
        } catch (err) { flash('error', err.response?.data?.message || 'Failed'); }
    };

    const confirmAppt = async (apptId, status) => {
        try {
            await api.patch(`/appointments/${apptId}/status`, { status });
            flash('success', `Appointment ${status}`);
            const r = await api.get(`/donors/${modal.id}/appointments`);
            setMAppts(r.data || []);
        } catch (err) { flash('error', err.response?.data?.message || 'Failed'); }
    };

    /* counts */
    const total    = donors.length;
    const approved  = donors.filter(d => d.status === 'approved').length;

    if (loading) return <div className="page-loader"><div className="spinner" /></div>;

    return (
        <div className="page dnr-page">

            {/* ── Page Header ── */}
            <div className="dnr-header">
                <div>
                    <h1 className="dnr-title">Donor Profiles</h1>
                    <p className="dnr-subtitle">Review and manage all registered egg donors</p>
                </div>
            </div>

            {/* ── Summary Bar ── */}
            <div className="dnr-summary-bar">
                {[
                    { 
                        label: 'Total Donors',    
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
                ].map(s => (
                    <div className="dnr-summary-card" key={s.label}>
                        <span className="dnr-summary-icon" style={{ color: s.color, display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                        <div>
                            <div className="dnr-summary-val" style={{ color: s.color }}>{s.val}</div>
                            <div className="dnr-summary-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="dnr-controls">
                <TabSlider tabs={STATUS_TABS} active={filter} onChange={setFilter} />
                <form className="dnr-search" onSubmit={e => { e.preventDefault(); fetchDonors(); }}>
                    <input className="dnr-search-input" placeholder="Search name or code…" value={search} onChange={e => setSearch(e.target.value)} />
                    <button type="submit" className="dnr-search-btn">Search</button>
                </form>
            </div>

            {/* ── Grid ── */}
            {donors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><IconFlower size={44} color="#ec4899" /></div>
                    <div className="empty-state-text">No donors found</div>
                    <div className="empty-state-sub">Adjust your filter or search</div>
                </div>
            ) : (
                <div className="dnr-grid">
                    {donors.map((d, i) => (
                        <DonorCard key={d.id} donor={d} delay={i * 40}
                            onView={openModal} onStatusChange={requestStatusChange} />
                    ))}
                </div>
            )}

            {/* ── Detail Modal ── */}
            {(modal || mLoading) && createPortal(
                <div className="dnr-modal-overlay" onClick={closeModal}>
                    <div className="dnr-modal" onClick={e => e.stopPropagation()}>
                        <button className="dnr-modal-close" onClick={closeModal}>✕</button>

                        {mLoading ? <div className="dnr-modal-loading"><div className="spinner" /></div> : (
                            <>
                                {/* Modal Hero */}
                                <div className="dnr-modal-hero">
                                    {photoUrl(modal.photo_path)
                                        ? <img src={photoUrl(modal.photo_path)} loading="lazy" alt="" className="dnr-modal-photo" />
                                        : <div className="dnr-modal-initials">{initials(modal)}</div>
                                    }
                                    <div className="dnr-modal-hero-info">
                                        <h2 className="dnr-modal-name">{modal.user?.first_name} {modal.user?.last_name}</h2>
                                        <div className="dnr-modal-meta-row">
                                            <span className="dnr-code-tag">{modal.donor_code}</span>
                                            <span className="dnr-chip" style={{ background: (STATUS_COLOR[modal.status]||STATUS_COLOR.inactive).bg, color: (STATUS_COLOR[modal.status]||STATUS_COLOR.inactive).text }}>
                                                {modal.status}
                                            </span>
                                            {!modal.photo_path && (
                                                <span className="dnr-warn-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                    No photo — cannot approve
                                                </span>
                                            )}
                                        </div>
                                        <div className="dnr-modal-quick">
                                            {modal.blood_type && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg> {modal.blood_type}</span>}
                                            {modal.genotype   && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg> {modal.genotype}</span>}
                                            {age(modal.date_of_birth) && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {age(modal.date_of_birth)} years</span>}
                                            {modal.height_cm  && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18"></path><path d="M16 3v18"></path><path d="M4 8h16"></path><path d="M4 16h16"></path></svg> {modal.height_cm} cm</span>}
                                            {modal.bmi        && <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg> BMI {modal.bmi}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="dnr-modal-body">
                                    {/* Contact */}
                                    <div className="dnr-modal-section">
                                        <h4 className="dnr-modal-section-title">Contact</h4>
                                        <div className="dnr-modal-grid2">
                                            <div><span className="dnr-field-label">Email</span><span className="dnr-field-val">{modal.user?.email || '—'}</span></div>
                                            <div><span className="dnr-field-label">Phone</span><span className="dnr-field-val">{modal.user?.phone || '—'}</span></div>
                                        </div>
                                    </div>

                                    {/* Physical */}
                                    <div className="dnr-modal-section">
                                        <h4 className="dnr-modal-section-title">Physical Traits</h4>
                                        <div className="dnr-modal-grid3">
                                            {[['Ethnicity', modal.ethnicity], ['Skin Tone', modal.skin_tone], ['Hair Colour', modal.hair_color], ['Hair Texture', modal.hair_texture], ['Eye Colour', modal.eye_color]].map(([l, v]) => (
                                                <div key={l}><span className="dnr-field-label">{l}</span><span className="dnr-field-val">{v || '—'}</span></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Medical */}
                                    <div className="dnr-modal-section">
                                        <h4 className="dnr-modal-section-title">Medical</h4>
                                        <div className="dnr-modal-grid3">
                                            <div><span className="dnr-field-label">Blood Type</span><span className="dnr-field-val dnr-field-hl">{modal.blood_type || '—'}</span></div>
                                            <div><span className="dnr-field-label">Genotype</span><span className="dnr-field-val dnr-field-hl">{modal.genotype || '—'}</span></div>
                                            <div><span className="dnr-field-label">Weight</span><span className="dnr-field-val">{modal.weight_kg ? `${modal.weight_kg} kg` : '—'}</span></div>
                                            <div><span className="dnr-field-label">BMI</span><span className="dnr-field-val">{modal.bmi || '—'}</span></div>
                                            <div><span className="dnr-field-label">Genetic Screen</span>
                                                <span className="dnr-field-val" style={{ color: SCREEN_COLOR[modal.genetic_screening_status] || '#64748b', fontWeight: 600 }}>
                                                    {modal.genetic_screening_status || 'pending'}
                                                </span>
                                            </div>
                                            <div><span className="dnr-field-label">Prev. Donations</span><span className="dnr-field-val">{modal.previous_donations ?? 0}</span></div>
                                        </div>
                                    </div>

                                    {/* Background */}
                                    <div className="dnr-modal-section">
                                        <h4 className="dnr-modal-section-title">Background</h4>
                                        <div className="dnr-modal-grid2">
                                            <div><span className="dnr-field-label">Education</span><span className="dnr-field-val">{modal.education_level || '—'}</span></div>
                                            <div><span className="dnr-field-label">Occupation</span><span className="dnr-field-val">{modal.occupation || '—'}</span></div>
                                        </div>
                                    </div>

                                    {/* Documents */}
                                    <div className="dnr-modal-section">
                                        <h4 className="dnr-modal-section-title">Screening Documents ({mDocs.length})</h4>
                                        {mDocs.length === 0
                                            ? <p className="dnr-empty-note">No documents uploaded yet</p>
                                            : mDocs.map(doc => (
                                                <div key={doc.id} className="dnr-doc-row">
                                                    <span className="dnr-doc-icon">{doc.document_type === 'genetic_screening' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 10-6 4"></path><path d="m9 10 6 4"></path><path d="M15 10a2 2 0 1 0-4-4"></path><path d="M13 18a2 2 0 1 0-4-4"></path><path d="M15 22a2 2 0 1 0-4-4"></path><path d="M13 6a2 2 0 1 0-4-4"></path></svg> : doc.document_type === 'blood_test' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}</span>
                                                    <div className="dnr-doc-info">
                                                        <span className="dnr-doc-name">{doc.original_filename}</span>
                                                        <span className="dnr-doc-type">{doc.document_type.replace(/_/g, ' ')} · {fmtDate(doc.created_at)}</span>
                                                    </div>
                                                    <span className={`dnr-doc-status dnr-doc-${doc.status}`}>{doc.status.replace('_', ' ')}</span>
                                                    {doc.status === 'pending_review' && (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="dnr-doc-btn dnr-doc-btn-ok" onClick={() => reviewDoc(doc.id, 'verified')}>✓ Verify</button>
                                                            <button className="dnr-doc-btn dnr-doc-btn-no" onClick={() => reviewDoc(doc.id, 'rejected')}>✗ Reject</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        }
                                    </div>

                                    {/* Appointments */}
                                    <div className="dnr-modal-section">
                                        <h4 className="dnr-modal-section-title">Appointments ({mAppts.length})</h4>
                                        {mAppts.length === 0
                                            ? <p className="dnr-empty-note">No appointments scheduled</p>
                                            : mAppts.map(a => (
                                                <div key={a.id} className="dnr-doc-row">
                                                    <span className="dnr-doc-icon">🗓</span>
                                                    <div className="dnr-doc-info">
                                                        <span className="dnr-doc-name" style={{ textTransform: 'capitalize' }}>{a.appointment_type.replace(/_/g,' ')}</span>
                                                        <span className="dnr-doc-type">{fmtDate(a.preferred_date)} · {a.preferred_time_slot}</span>
                                                    </div>
                                                    <span className={`dnr-doc-status dnr-doc-${a.status}`}>{a.status}</span>
                                                    {a.status === 'requested' && <button className="dnr-doc-btn dnr-doc-btn-ok" onClick={() => confirmAppt(a.id, 'confirmed')}>Confirm</button>}
                                                    {a.status === 'confirmed' && <button className="dnr-doc-btn dnr-doc-btn-ok" onClick={() => confirmAppt(a.id, 'completed')}>Complete</button>}
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                {/* Modal Footer Actions */}
                                <div className="dnr-modal-footer">
                                    {modal.status === 'pending' && <>
                                        <button className="dnr-btn dnr-btn-approve" onClick={() => { requestStatusChange(modal.id, 'approved'); closeModal(); }}>
                                            {modal.photo_path ? '✅ Approve Donor' : '📷 Upload photo first'}
                                        </button>
                                        <button className="dnr-btn dnr-btn-suspend" onClick={() => { requestStatusChange(modal.id, 'suspended'); closeModal(); }}>Decline</button>
                                    </>}
                                    {modal.status === 'approved' && <button className="dnr-btn dnr-btn-suspend" onClick={() => { requestStatusChange(modal.id, 'suspended'); closeModal(); }}>Suspend Donor</button>}
                                    {modal.status === 'suspended' && <button className="dnr-btn dnr-btn-approve" onClick={() => { requestStatusChange(modal.id, 'approved'); closeModal(); }}>Reactivate</button>}
                                    <button className="dnr-btn dnr-btn-view" onClick={closeModal}>Close</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}

            <ConfirmModal 
                isOpen={confirm.isOpen}
                title={`Confirm Action`}
                message={`Are you sure you want to ${confirm.actionName} this donor profile? This action will take effect immediately.`}
                onConfirm={confirmStatusChange}
                onCancel={() => setConfirm({ isOpen: false, id: null, status: null, actionName: '' })}
            />

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
