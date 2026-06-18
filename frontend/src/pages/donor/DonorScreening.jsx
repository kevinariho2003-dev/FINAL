import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import '../Dashboard.css';
import './DonorScreening.css';

const DOC_TYPES = [
    { value: 'medical_report', label: 'Medical Report', icon: 'file' },
    { value: 'genetic_screening', label: 'Genetic Screening', icon: 'dna' },
    { value: 'blood_test', label: 'Blood Test', icon: 'drop' },
    { value: 'other', label: 'Other Document', icon: 'folder' },
];

const APPT_TYPES = [
    { value: 'initial_screening', label: 'Initial Screening (Blood Type, Genotype, Infectious Diseases, Hormonal Profile)' },
    { value: 'follow_up', label: 'Follow-up Visit' },
];

const TIME_SLOTS = [
    { value: 'morning', label: 'Morning (8am - 12pm)' },
    { value: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
    { value: 'evening', label: 'Evening (4pm - 7pm)' },
];

function SvgIcon({ name, className = '' }) {
    const paths = {
        file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 0v6h6',
        dna: 'M7 3c6 3 4 15 10 18M17 3C11 6 13 18 7 21M8 7h8M8 12h8M8 17h8',
        drop: 'M12 2s7 7.2 7 12a7 7 0 1 1-14 0c0-4.8 7-12 7-12z',
        folder: 'M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
        upload: 'M12 16V4m-5 5 5-5 5 5M4 20h16',
        calendar: 'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
        check: 'M20 6 9 17l-5-5',
        clinic: 'M12 3v18M3 9h18M5 21V7l7-4 7 4v14',
        image: 'M4 5h16v14H4V5zm3 10 3-3 2 2 3-4 2 5',
        trash: 'M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14',
    };

    return (
        <svg className={`screen-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function DonorScreening() {
    const [profile, setProfile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [toast, setToast] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [docType, setDocType] = useState('medical_report');
    const [docNotes, setDocNotes] = useState('');
    const [apptType, setApptType] = useState('initial_screening');
    const [apptDate, setApptDate] = useState('');
    const [apptTimeSlot, setApptTimeSlot] = useState('morning');
    const [apptNotes, setApptNotes] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const profileRes = await api.get('/donors');
            if (profileRes.data?.id) {
                setProfile(profileRes.data);
                const [docsRes, apptsRes] = await Promise.allSettled([
                    api.get(`/donors/${profileRes.data.id}/screening-documents`),
                    api.get(`/donors/${profileRes.data.id}/appointments`),
                ]);
                if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.data || []);
                if (apptsRes.status === 'fulfilled') setAppointments(apptsRes.value.data || []);
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile || !profile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', selectedFile);
            formData.append('document_type', docType);
            if (docNotes) formData.append('notes', docNotes);

            await api.post(`/donors/${profile.id}/screening-documents`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            showToast('success', 'Document uploaded successfully.');
            setSelectedFile(null);
            setDocNotes('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchAll();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const deleteDocument = async (id) => {
        try {
            await api.delete(`/screening-documents/${id}`);
            showToast('success', 'Document deleted');
            fetchAll();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to delete');
        }
    };

    const handleBookAppointment = async (e) => {
        e.preventDefault();
        if (!profile || !apptDate) return;

        setBooking(true);
        try {
            await api.post(`/donors/${profile.id}/appointments`, {
                appointment_type: apptType,
                preferred_date: apptDate,
                preferred_time_slot: apptTimeSlot,
                donor_notes: apptNotes || null,
            });

            showToast('success', 'Appointment requested.');
            setApptDate('');
            setApptNotes('');
            fetchAll();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Booking failed');
        } finally {
            setBooking(false);
        }
    };

    const cancelAppointment = async (id) => {
        try {
            await api.delete(`/appointments/${id}`);
            showToast('success', 'Appointment cancelled');
            fetchAll();
        } catch (err) {
            showToast('error', err.response?.data?.message || 'Failed to cancel');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getDocIcon = (type) => DOC_TYPES.find(d => d.value === type)?.icon || 'file';
    const getDocLabel = (type) => DOC_TYPES.find(d => d.value === type)?.label || type;
    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };
    const getTomorrowDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    const getApptTypeLabel = (type) => {
        if (type === 'initial_screening') return 'Initial Screening (Blood Type, Genotype, Infectious Diseases, Hormonal Profile)';
        if (type === 'follow_up') return 'Follow-up Visit';
        return type.replace(/_/g, ' ');
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    if (!profile) {
        return (
            <div className="page donor-screening-page">
                <div className="empty-state ds-empty-card">
                    <div className="empty-state-icon"><SvgIcon name="file" /></div>
                    <div className="empty-state-text">Complete your donor profile first</div>
                    <div className="empty-state-sub">Create a donor profile before uploading screening documents.</div>
                </div>
            </div>
        );
    }

    const verifiedDocs = documents.filter(d => d.status === 'verified').length;
    const completedAppts = appointments.filter(a => a.status === 'completed').length;

    return (
        <div className="page donor-screening-page">
            <section className="ds-hero">
                <div>
                    <p className="ds-kicker">Screening center</p>
                    <h1>Medical Screening</h1>
                    <p>Upload medical documents or request a clinic appointment for screening.</p>
                </div>
            </section>

            <div className="donor-stats-row ds-stats">
                {[
                    { icon: 'file', value: documents.length, label: 'Documents Uploaded' },
                    { icon: 'check', value: verifiedDocs, label: 'Verified' },
                    { icon: 'calendar', value: appointments.length, label: 'Appointments' },
                    { icon: 'clinic', value: completedAppts, label: 'Completed Visits' },
                ].map(stat => (
                    <div className="donor-stat" key={stat.label}>
                        <div className="stat-icon"><SvgIcon name={stat.icon} /></div>
                        <div className="stat-number">{stat.value}</div>
                        <div className="stat-desc">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="screening-page-grid">
                <div className="card ds-card">
                    <div className="card-header">
                        <h3 className="card-title"><SvgIcon name="upload" /> Upload Screening Documents</h3>
                    </div>

                    <form onSubmit={handleUpload} className="upload-form">
                        {!selectedFile ? (
                            <label
                                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                            >
                                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                                <div className="upload-zone-icon"><SvgIcon name="folder" /></div>
                                <div className="upload-zone-text">Click or drag a file here</div>
                                <div className="upload-zone-hint">PDF, JPG, PNG - Max 5MB</div>
                            </label>
                        ) : (
                            <div className="selected-file">
                                <span className="selected-file-icon"><SvgIcon name={selectedFile.name.endsWith('.pdf') ? 'file' : 'image'} /></span>
                                <div className="selected-file-info">
                                    <div className="selected-file-name">{selectedFile.name}</div>
                                    <div className="selected-file-size">{formatFileSize(selectedFile.size)}</div>
                                </div>
                                <button type="button" className="selected-file-remove" onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}>x</button>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Document Type</label>
                            <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
                                {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <input className="form-input" placeholder="e.g. Screening done at Mulago Hospital" value={docNotes} onChange={e => setDocNotes(e.target.value)} maxLength={500} />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={!selectedFile || uploading}>
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </button>
                    </form>

                    <div className="doc-list">
                        <div className="doc-list-title">Uploaded Documents</div>
                        {documents.length === 0 ? (
                            <div className="screening-empty"><SvgIcon name="file" /> No documents uploaded yet</div>
                        ) : documents.map(doc => (
                            <div key={doc.id} className="doc-item">
                                <div className={`doc-item-icon ${doc.document_type}`}><SvgIcon name={getDocIcon(doc.document_type)} /></div>
                                <div className="doc-item-info">
                                    <div className="doc-item-name">{doc.original_filename}</div>
                                    <div className="doc-item-meta">
                                        <span>{getDocLabel(doc.document_type)}</span>
                                        <span>-</span>
                                        <span>{formatDate(doc.created_at)}</span>
                                        <span className={`badge badge-${doc.status}`}>{doc.status.replace('_', ' ')}</span>
                                    </div>
                                    {doc.review_notes && <div className="doc-item-meta">{doc.review_notes}</div>}
                                </div>
                                {doc.status === 'pending_review' && (
                                    <button className="btn btn-danger btn-sm" onClick={() => deleteDocument(doc.id)}><SvgIcon name="trash" /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card ds-card">
                    <div className="card-header">
                        <h3 className="card-title"><SvgIcon name="calendar" /> Book Clinic Appointment</h3>
                    </div>

                    {profile.status !== 'approved' ? (
                        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
                            <h4 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Booking Restricted</h4>
                            <p style={{ fontSize: '0.88rem', lineHeight: 1.5, maxWidth: '320px', margin: '0 auto' }}>
                                Clinic appointment scheduling is locked until your profile has been officially approved by a clinician.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleBookAppointment} className="appt-form">
                            <div className="form-group">
                                <label className="form-label">Appointment Type</label>
                                <select className="form-select" value={apptType} onChange={e => setApptType(e.target.value)}>
                                    {APPT_TYPES.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Date</label>
                                    <input type="date" className="form-input" value={apptDate} onChange={e => setApptDate(e.target.value)} min={getTomorrowDate()} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Time Slot</label>
                                    <select className="form-select" value={apptTimeSlot} onChange={e => setApptTimeSlot(e.target.value)}>
                                        {TIME_SLOTS.map(ts => <option key={ts.value} value={ts.value}>{ts.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Additional Notes (optional)</label>
                                <input className="form-input" placeholder="e.g. First-time donor, accessibility needs..." value={apptNotes} onChange={e => setApptNotes(e.target.value)} maxLength={500} />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={!apptDate || booking}>
                                {booking ? 'Booking...' : 'Request Appointment'}
                            </button>
                        </form>
                    )}

                    <div className="appt-list">
                        <div className="doc-list-title">Your Appointments</div>
                        {appointments.length === 0 ? (
                            <div className="screening-empty"><SvgIcon name="calendar" /> No appointments booked yet</div>
                        ) : appointments.map(appt => {
                            const d = new Date(appt.preferred_date);
                            return (
                                <div key={appt.id} className="appt-item">
                                    <div className="appt-item-date">
                                        <span className="day">{d.getDate()}</span>
                                        <span className="month">{d.toLocaleString('en', { month: 'short' })}</span>
                                    </div>
                                    <div className="appt-item-info">
                                        <div className="appt-item-type">{getApptTypeLabel(appt.appointment_type)}</div>
                                        <div className="appt-item-time">
                                            {appt.preferred_time_slot.charAt(0).toUpperCase() + appt.preferred_time_slot.slice(1)} slot
                                            <span className={`badge badge-${appt.status}`} style={{ marginLeft: '0.5rem' }}>{appt.status}</span>
                                        </div>
                                        {appt.clinic_notes && <div className="appt-item-time">{appt.clinic_notes}</div>}
                                    </div>
                                    {appt.status === 'requested' && (
                                        <button className="btn btn-danger btn-sm" onClick={() => cancelAppointment(appt.id)}>Cancel</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
