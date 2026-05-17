import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import { IconFlower, IconShieldCheck, IconBan } from '../../components/Icons';
import '../Dashboard.css';
import './ClinicianDashboard.css';

// renderConsultationCard 

const STATUS_TABS = [
    { key: '', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
    { key: 'suspended', label: 'Suspended' },
];

const SECTIONS = [
    { id: 'consultations', label: '📅 Donor Consultations', icon: '📅' },
    { id: 'profiles', label: '👤 Donor Profiles', icon: '👤' },
    { id: 'physical', label: '🏥 Awaiting Physical', icon: '🏥' },
    { id: 'post_physical', label: '✅ Post Physical', icon: '✅' },
];

export default function ClinicianDonorList() {
    const { user } = useAuth();
    const [consultations, setConsultations] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [awaitingPhysical, setAwaitingPhysical] = useState([]);
    const [postPhysical, setPostPhysical] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState(null);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [screeningDocs, setScreeningDocs] = useState([]);
    const [donorAppointments, setDonorAppointments] = useState([]);
    const [expandedSections, setExpandedSections] = useState({
    consultations: false,   // ✅ Collapsed by default
    profiles: false,        // ✅ Collapsed by default
    physical: false,        // ✅ Collapsed by default
    post_physical: false,   // ✅ Collapsed by default
});

    useEffect(() => {fetchAllDonors(); }, [filter]);

    // In the fetchAllDonors function, update consultations fetch:
    const fetchAllDonors = async (donorId) => {
        try {
            setLoading(true);
            
            // Fetch consultations from consultations table
            const consultRes = await api.get('/consultations', { 
                params: search ? { search } : {}
            });
            setConsultations(consultRes.data?.data || []);

            // Fetch pending profile approvals
            const profileRes = await api.get('/donors/pending-profiles', { 
                params: { 
                    ...(search && { search }),
                    ...(filter && filter !== '' && { approval_status: filter })
                }
            });
            setProfiles(profileRes.data?.data || []);

            // Fetch awaiting physical
            const physicalRes = await api.get('/donors/awaiting-physical', { 
                params: { 
                    ...(search && { search }),
                    ...(filter && filter !== '' && { approval_status: filter })
                }
            });
            setAwaitingPhysical(physicalRes.data?.data || []);

            // Fetch active donors
            const activeRes = await api.get('/donors/active-donors', { 
                params: search ? { search } : {}
            });
            setPostPhysical(activeRes.data?.data || []);
        } catch (err) {
            console.error('Error fetching donors:', err);
            setToast({ type: 'error', msg: 'Failed to fetch donor data' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchAllDonors(); };

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const updateConsultationStatus = async (donorId, status) => {
        try {
            await api.patch(`/donors/${donorId}/consultation-status`, { consultation_status: status });
            setToast({ type: 'success', msg: `Consultation marked as ${status}` });
            fetchAllDonors();
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to update consultation' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const updateApprovalStatus = async (id, stage, status) => {
        try {
            await api.patch(`/donors/${id}/approval-status`, { stage, approval_status: status });
            setToast({ type: 'success', msg: `Donor ${status} successfully` });
            fetchAllDonors();
            if (selectedDonor?.id === id) {
                setSelectedDonor(prev => ({ ...prev, approval_status: status }));
            }
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Failed to update status' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const viewDetails = async (donorId) => {
        setDetailLoading(true);
        try {
            const [donorRes, docsRes, apptsRes] = await Promise.allSettled([
                api.get(`/donors/${donorId}`),
                api.get(`/donors/${donorId}/screening-documents`),
                api.get(`/donors/${donorId}/appointments`),
            ]);
            if (donorRes.status === 'fulfilled') setSelectedDonor(donorRes.value.data);
            if (docsRes.status === 'fulfilled') setScreeningDocs(docsRes.value.data || []);
            if (apptsRes.status === 'fulfilled') setDonorAppointments(apptsRes.value.data || []);
        } catch {
            setToast({ type: 'error', msg: 'Failed to load donor details' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeModal = () => { setSelectedDonor(null); setScreeningDocs([]); setDonorAppointments([]); };

    const reviewDocument = async (docId, status) => {
        try {
            await api.patch(`/screening-documents/${docId}/review`, { status });
            setToast({ type: 'success', msg: `Document ${status}` });
            const res = await api.get(`/donors/${selectedDonor.id}/screening-documents`);
            setScreeningDocs(res.data || []);
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Failed' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const updateAppointmentStatus = async (apptId, status) => {
        try {
            await api.patch(`/appointments/${apptId}/status`, { status });
            setToast({ type: 'success', msg: `Appointment ${status}` });
            const res = await api.get(`/donors/${selectedDonor.id}/appointments`);
            setDonorAppointments(res.data || []);
        } catch (err) {
            setToast({ type: 'error', msg: err.response?.data?.message || 'Failed' });
        }
        setTimeout(() => setToast(null), 3000);
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    const calculateAge = (dob) => {
        if (!dob) return '—';
        const diff = Date.now() - new Date(dob).getTime();
        return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    };

    const renderConsultationCard = (consultation, index) => (
        <div key={consultation.id} className="profile-card" style={{ animationDelay: `${index * 60}ms` }}>
            <div className="profile-card-header">
                <div className="profile-card-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)' }}>
                    <img src="/assets/avatars/donor_default.png" alt="Donor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                    <div className="profile-card-name">{consultation.donor?.user?.first_name} {consultation.donor?.user?.last_name}</div>
                    <div className="profile-card-code">{consultation.donor?.donor_code}</div>
                </div>
                <span className="badge badge-pending">Consultation Pending</span>
            </div>

            <div className="profile-card-details">
                <div className="profile-detail">
                    <div className="profile-detail-label">Type</div>
                    <div className="profile-detail-value" style={{ textTransform: 'capitalize' }}>
                        {consultation.consultation_type?.replace('_', ' ') || '—'}
                    </div>
                </div>
                <div className="profile-detail">
                    <div className="profile-detail-label">Date</div>
                    <div className="profile-detail-value">{formatDate(consultation.scheduled_date)}</div>
                </div>
                <div className="profile-detail">
                    <div className="profile-detail-label">Time</div>
                    <div className="profile-detail-value">{consultation.scheduled_time || '—'}</div>
                </div>
            </div>

            {consultation.consultation_type === 'call' && consultation.phone_number && (
                <div className="profile-card-details" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
                    <div className="profile-detail">
                        <div className="profile-detail-label">Contact</div>
                        <div className="profile-detail-value">{consultation.phone_number}</div>
                    </div>
                </div>
            )}

            {consultation.consultation_type === 'virtual' && consultation.email && (
                <div className="profile-card-details" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '0.75rem' }}>
                    <div className="profile-detail">
                        <div className="profile-detail-label">Send Link To</div>
                        <div className="profile-detail-value">{consultation.email}</div>
                    </div>
                </div>
            )}

            <div className="profile-card-actions">
                <button className="btn btn-success btn-sm" onClick={() => updateConsultationStatus(consultation.donor?.id, 'completed')}>
                    ✓ Mark Done
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => updateConsultationStatus(consultation.donor?.id, 'not_done')}>
                    ✗ Mark Not Done
                </button>
            </div>
        </div>
    );

    const renderDonorCard = (donor, index, stage) => (
        <div key={donor.id} className="profile-card" style={{ animationDelay: `${index * 60}ms` }}>
            <div className="profile-card-header">
                <div className="profile-card-avatar" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                    <img src="/assets/avatars/donor_default.png" alt="Donor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                    <div className="profile-card-name">{donor.user?.first_name} {donor.user?.last_name}</div>
                    <div className="profile-card-code">{donor.donor_code}</div>
                </div>
                <span className={`badge badge-${donor.approval_status}`}>{donor.approval_status}</span>
            </div>

            <div className="profile-card-details">
                <div className="profile-detail">
                    <div className="profile-detail-label">Blood</div>
                    <div className="profile-detail-value">{donor.blood_type || '—'}</div>
                </div>
                <div className="profile-detail">
                    <div className="profile-detail-label">Genotype</div>
                    <div className="profile-detail-value">{donor.genotype || '—'}</div>
                </div>
                <div className="profile-detail">
                    <div className="profile-detail-label">Ethnicity</div>
                    <div className="profile-detail-value">{donor.ethnicity || '—'}</div>
                </div>
            </div>

            <div className="profile-card-actions">
                <button className="btn btn-outline btn-sm" onClick={() => viewDetails(donor.id)}>
                    👁️ Details
                </button>
                {donor.approval_status === 'pending' && (
                    <>
                        <button className="btn btn-success btn-sm" onClick={() => updateApprovalStatus(donor.id, stage, 'approved')}>
                            Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => updateApprovalStatus(donor.id, stage, 'denied')}>
                            Deny
                        </button>
                    </>
                )}
                {donor.approval_status === 'approved' && (
                    <button className="btn btn-danger btn-sm" onClick={() => updateApprovalStatus(donor.id, stage, 'suspended')}>
                        Suspend
                    </button>
                )}
                {donor.approval_status === 'denied' && (
                    <button className="btn btn-success btn-sm" onClick={() => updateApprovalStatus(donor.id, stage, 'approved')}>
                        Reconsider
                    </button>
                )}
                {donor.approval_status === 'suspended' && (
                    <button className="btn btn-success btn-sm" onClick={() => updateApprovalStatus(donor.id, stage, 'approved')}>
                        Reactivate
                    </button>
                )}
            </div>
        </div>
    );

    const renderAccordionSection = (sectionId, sectionLabel, data, stage) => {
        const isExpanded = expandedSections[sectionId];
        const isEmpty = data.length === 0;

        return (
            <div key={sectionId} className="accordion-section" style={{ marginBottom: '1.5rem' }}>
                <button 
                    className="accordion-header"
                    onClick={() => toggleSection(sectionId)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '1rem 1.5rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                    }}
                >
                    <span>{sectionLabel} ({data.length})</span>
                    <span style={{ fontSize: '1.2rem', transition: 'transform 0.3s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                    </span>
                </button>

                {isExpanded && (
                    <div style={{ paddingTop: '1rem', animation: 'fadeIn 0.3s ease' }}>
                        {isEmpty ? (
                            <div className="empty-state">
                                <div className="empty-state-icon"><IconFlower size={48} color="#ec4899" /></div>
                                <div className="empty-state-text">No donors in this section</div>
                                <div className="empty-state-sub">Check back later for updates</div>
                            </div>
                        ) : sectionId === 'consultations' ? (
                            <div className="profile-cards-grid">
                                {data.map((donor, i) => renderConsultationCard(donor, i))}
                            </div>
                        ) : (
                            <div className="profile-cards-grid">
                                {data.map((donor, i) => renderDonorCard(donor, i, stage))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

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
                <h1 className="page-title">Donor Management <IconFlower size={24} color="#ec4899" style={{ verticalAlign: 'middle' }} /></h1>
                <p className="page-subtitle">Review and manage donor applications through each stage</p>
            </div>

            {/* Search Bar */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                        className="form-input" 
                        placeholder="Search by name or code..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Search</button>
                </form>
            </div>

            {/* Status Filter Tabs - Only for sections 2-4 */}
            <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Filter by Status (Profiles, Physical, Post-Physical)
                </p>
                <TabSlider tabs={STATUS_TABS} active={filter} onChange={setFilter} />
            </div>

            {/* Accordion Sections */}
            {renderAccordionSection('consultations', '📅 Donor Consultations', consultations, 'pre_consultation')}
            {renderAccordionSection('profiles', '👤 Donor Profiles', profiles, 'profile_completion')}
            {renderAccordionSection('physical', '🏥 Awaiting Physical', awaitingPhysical, 'physical_appointment')}
            {renderAccordionSection('post_physical', '✅ Post Physical', postPhysical, 'physical_appointment')}

            {/* ── Detail Modal ── */}
            {selectedDonor && (
                <div className="detail-modal-overlay" onClick={closeModal}>
                    <div className="detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="detail-modal-close" onClick={closeModal}>✕</button>

                        <div className="detail-modal-header">
                            <div className="detail-modal-avatar" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                                <img src="/assets/avatars/donor_default.png" alt="Donor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                                <h2 className="detail-modal-name">{selectedDonor.user?.first_name} {selectedDonor.user?.last_name}</h2>
                                <span className="detail-modal-code">{selectedDonor.donor_code}</span>
                                <span className={`badge badge-${selectedDonor.approval_status}`} style={{ marginLeft: 8 }}>{selectedDonor.approval_status}</span>
                            </div>
                        </div>

                        <div className="detail-modal-body">
                            {/* Personal Info */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">👤 Personal Information</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Email</span>
                                        <span className="detail-value">{selectedDonor.user?.email || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Phone</span>
                                        <span className="detail-value">{selectedDonor.user?.phone || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Date of Birth</span>
                                        <span className="detail-value">{selectedDonor.date_of_birth || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Age</span>
                                        <span className="detail-value">{calculateAge(selectedDonor.date_of_birth)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Medical Info */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">🩺 Medical Profile</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Blood Type</span>
                                        <span className="detail-value highlight">{selectedDonor.blood_type || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Genotype</span>
                                        <span className="detail-value highlight">{selectedDonor.genotype || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Height</span>
                                        <span className="detail-value">{selectedDonor.height_cm ? `${selectedDonor.height_cm} cm` : '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Weight</span>
                                        <span className="detail-value">{selectedDonor.weight_kg ? `${selectedDonor.weight_kg} kg` : '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">BMI</span>
                                        <span className="detail-value">{selectedDonor.bmi || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Genetic Screening</span>
                                        <span className={`detail-value ${selectedDonor.genetic_screening_status === 'clear' ? 'text-success' : selectedDonor.genetic_screening_status === 'flagged' ? 'text-danger' : ''}`}>
                                            {selectedDonor.genetic_screening_status || 'pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Screening Status */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">🔬 Screening Status</h3>
                                
                                {screeningDocs.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documents</div>
                                        {screeningDocs.map(doc => (
                                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <span style={{ fontSize: '1.1rem' }}>
                                                    {doc.document_type === 'medical_report' ? '📋' : doc.document_type === 'genetic_screening' ? '🧬' : doc.document_type === 'blood_test' ? '🩸' : '📄'}
                                                </span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{doc.original_filename}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {doc.document_type.replace(/_/g, ' ')} • {formatDate(doc.created_at)}
                                                    </div>
                                                </div>
                                                <span className={`badge badge-${doc.status}`} style={{ fontSize: '0.7rem' }}>{doc.status.replace('_', ' ')}</span>
                                                {doc.status === 'pending_review' && (
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn btn-success btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => reviewDocument(doc.id, 'verified')}>✓ Verify</button>
                                                        <button className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => reviewDocument(doc.id, 'rejected')}>✗ Reject</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>No screening documents uploaded</p>
                                )}

                                {donorAppointments.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appointments</div>
                                        {donorAppointments.map(appt => (
                                            <div key={appt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <span style={{ fontSize: '1.1rem' }}>🗓️</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>{appt.appointment_type.replace(/_/g, ' ')}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {formatDate(appt.preferred_date)} • {appt.preferred_time_slot}
                                                    </div>
                                                </div>
                                                <span className={`badge badge-${appt.status}`} style={{ fontSize: '0.7rem' }}>{appt.status}</span>
                                                {appt.status === 'requested' && (
                                                    <button className="btn btn-success btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => updateAppointmentStatus(appt.id, 'confirmed')}>Confirm</button>
                                                )}
                                                {appt.status === 'confirmed' && (
                                                    <button className="btn btn-primary btn-sm" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => updateAppointmentStatus(appt.id, 'completed')}>Complete</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No appointments booked</p>
                                )}
                            </div>

                            {/* Phenotype */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">🎨 Physical Traits</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Ethnicity</span>
                                        <span className="detail-value">{selectedDonor.ethnicity || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Skin Tone</span>
                                        <span className="detail-value">{selectedDonor.skin_tone || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Hair Color</span>
                                        <span className="detail-value">{selectedDonor.hair_color || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Hair Texture</span>
                                        <span className="detail-value">{selectedDonor.hair_texture || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Eye Color</span>
                                        <span className="detail-value">{selectedDonor.eye_color || '—'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Education & Donation */}
                            <div className="detail-section">
                                <h3 className="detail-section-title">📋 Additional Info</h3>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="detail-label">Education</span>
                                        <span className="detail-value">{selectedDonor.education_level || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Occupation</span>
                                        <span className="detail-value">{selectedDonor.occupation || '—'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Previous Donations</span>
                                        <span className="detail-value">{selectedDonor.previous_donations ?? 0}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Availability</span>
                                        <span className={`badge badge-${selectedDonor.availability_status === 'available' ? 'approved' : 'pending'}`}>
                                            {selectedDonor.availability_status || '—'}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Anonymous</span>
                                        <span className="detail-value">{selectedDonor.is_anonymous ? 'Yes' : 'No'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Medical History */}
                            {selectedDonor.medical_history && Object.keys(selectedDonor.medical_history).length > 0 && (
                                <div className="detail-section">
                                    <h3 className="detail-section-title">📝 Medical History</h3>
                                    <div className="detail-history-box">
                                        {typeof selectedDonor.medical_history === 'object'
                                            ? Object.entries(selectedDonor.medical_history).map(([key, val]) => (
                                                <div key={key} className="detail-history-item">
                                                    <span className="detail-label">{key.replace(/_/g, ' ')}</span>
                                                    <span className="detail-value">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}</span>
                                                </div>
                                            ))
                                            : <p>{String(selectedDonor.medical_history)}</p>
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="detail-modal-actions">
                            {selectedDonor.approval_status === 'pending' && (
                                <>
                                    <button className="btn btn-success" onClick={() => { updateApprovalStatus(selectedDonor.id, selectedDonor.stage || 'profile_completion', 'approved'); closeModal(); }}>
                                        ✅ Approve Donor
                                    </button>
                                    <button className="btn btn-danger" onClick={() => { updateApprovalStatus(selectedDonor.id, selectedDonor.stage || 'profile_completion', 'denied'); closeModal(); }}>
                                        🚫 Deny Donor
                                    </button>
                                </>
                            )}
                            {selectedDonor.approval_status === 'approved' && (
                                <button className="btn btn-danger" onClick={() => { updateApprovalStatus(selectedDonor.id, selectedDonor.stage || 'profile_completion', 'suspended'); closeModal(); }}>
                                    🚫 Suspend Donor
                                </button>
                            )}
                            {selectedDonor.approval_status === 'denied' && (
                                <button className="btn btn-success" onClick={() => { updateApprovalStatus(selectedDonor.id, selectedDonor.stage || 'profile_completion', 'approved'); closeModal(); }}>
                                    ✅ Reconsider Donor
                                </button>
                            )}
                            {selectedDonor.approval_status === 'suspended' && (
                                <button className="btn btn-success" onClick={() => { updateApprovalStatus(selectedDonor.id, selectedDonor.stage || 'profile_completion', 'approved'); closeModal(); }}>
                                    ✅ Reactivate Donor
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
