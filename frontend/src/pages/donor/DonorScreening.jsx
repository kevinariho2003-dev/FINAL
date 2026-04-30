import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import './DonorScreening.css';

const DOC_TYPES = [
    { value: 'medical_report', label: 'Medical Report', icon: '📋' },
    { value: 'genetic_screening', label: 'Genetic Screening', icon: '🧬' },
    { value: 'blood_test', label: 'Blood Test', icon: '🩸' },
    { value: 'other', label: 'Other Document', icon: '📄' },
];

const APPT_TYPES = [
    { value: 'initial_screening', label: 'Initial Screening' },
    { value: 'follow_up', label: 'Follow-up Visit' },
    { value: 'genetic_test', label: 'Genetic Test' },
];

const TIME_SLOTS = [
    { value: 'morning', label: '🌅 Morning (8am – 12pm)' },
    { value: 'afternoon', label: '☀️ Afternoon (12pm – 4pm)' },
    { value: 'evening', label: '🌆 Evening (4pm – 7pm)' },
];

export default function DonorScreening() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [toast, setToast] = useState(null);
    const [dragging, setDragging] = useState(false);

    // Upload form state
    const [selectedFile, setSelectedFile] = useState(null);
    const [docType, setDocType] = useState('medical_report');
    const [docNotes, setDocNotes] = useState('');
    const fileInputRef = useRef(null);

    // Appointment form state
    const [apptType, setApptType] = useState('initial_screening');
    const [apptDate, setApptDate] = useState('');
    const [apptTimeSlot, setApptTimeSlot] = useState('morning');
    const [apptNotes, setApptNotes] = useState('');

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
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    // ── File Upload ──
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

            showToast('success', 'Document uploaded successfully!');
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

    // ── Appointments ──
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

            showToast('success', 'Appointment requested!');
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

    // ── Helpers ──
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getDocIcon = (type) => DOC_TYPES.find(d => d.value === type)?.icon || '📄';
    const getDocLabel = (type) => DOC_TYPES.find(d => d.value === type)?.label || type;

    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    const getTomorrowDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    if (!profile) {
        return (
            <div className="page">
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">Complete your donor profile first</div>
                    <div className="empty-state-sub">You need to create a donor profile before uploading screening documents</div>
                </div>
            </div>
        );
    }

    const verifiedDocs = documents.filter(d => d.status === 'verified').length;
    const completedAppts = appointments.filter(a => a.status === 'completed').length;

    return (
        <div className="page">
            <div className="page-header fade-in">
                <h1 className="page-title">Medical Screening 🔬</h1>
                <p className="page-subtitle">
                    Upload your medical documents or book a clinic appointment for screening
                </p>
            </div>

            {/* ── Status Summary ── */}
            <div className="donor-stats-row" style={{ marginBottom: '0.5rem' }}>
                <div className="donor-stat fade-in fade-in-delay-1">
                    <div className="stat-icon">📑</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>{documents.length}</div>
                    <div className="stat-desc">Documents Uploaded</div>
                </div>
                <div className="donor-stat fade-in fade-in-delay-2">
                    <div className="stat-icon">✅</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>{verifiedDocs}</div>
                    <div className="stat-desc">Verified</div>
                </div>
                <div className="donor-stat fade-in fade-in-delay-3">
                    <div className="stat-icon">🗓️</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>{appointments.length}</div>
                    <div className="stat-desc">Appointments</div>
                </div>
                <div className="donor-stat fade-in fade-in-delay-4">
                    <div className="stat-icon">🏥</div>
                    <div className="stat-number" style={{
                        background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>{completedAppts}</div>
                    <div className="stat-desc">Completed Visits</div>
                </div>
            </div>

            <div className="screening-page-grid">
                {/* ═══ LEFT: Upload Documents ═══ */}
                <div className="card fade-in fade-in-delay-2">
                    <div className="card-header">
                        <h3 className="card-title">📄 Upload Screening Documents</h3>
                    </div>

                    <form onSubmit={handleUpload} className="upload-form">
                        {!selectedFile ? (
                            <div
                                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileSelect}
                                />
                                <div className="upload-zone-icon">📁</div>
                                <div className="upload-zone-text">
                                    Click or drag a file here
                                </div>
                                <div className="upload-zone-hint">
                                    PDF, JPG, PNG • Max 5MB
                                </div>
                            </div>
                        ) : (
                            <div className="selected-file">
                                <span className="selected-file-icon">
                                    {selectedFile.name.endsWith('.pdf') ? '📕' : '🖼️'}
                                </span>
                                <div className="selected-file-info">
                                    <div className="selected-file-name">{selectedFile.name}</div>
                                    <div className="selected-file-size">{formatFileSize(selectedFile.size)}</div>
                                </div>
                                <button type="button" className="selected-file-remove" onClick={() => {
                                    setSelectedFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}>✕</button>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Document Type</label>
                                <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
                                    {DOC_TYPES.map(dt => (
                                        <option key={dt.value} value={dt.value}>{dt.icon} {dt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <input
                                className="form-input"
                                placeholder="e.g. Screening done at Mulago Hospital, March 2026"
                                value={docNotes}
                                onChange={e => setDocNotes(e.target.value)}
                                maxLength={500}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={!selectedFile || uploading}>
                            {uploading ? 'Uploading...' : '📤 Upload Document'}
                        </button>
                    </form>

                    {/* Document list */}
                    {documents.length > 0 && (
                        <div className="doc-list">
                            <div className="doc-list-title">Uploaded Documents</div>
                            {documents.map(doc => (
                                <div key={doc.id} className="doc-item">
                                    <div className={`doc-item-icon ${doc.document_type}`}>
                                        {getDocIcon(doc.document_type)}
                                    </div>
                                    <div className="doc-item-info">
                                        <div className="doc-item-name">{doc.original_filename}</div>
                                        <div className="doc-item-meta">
                                            <span>{getDocLabel(doc.document_type)}</span>
                                            <span>•</span>
                                            <span>{formatDate(doc.created_at)}</span>
                                            <span className={`badge badge-${doc.status}`}>{doc.status.replace('_', ' ')}</span>
                                        </div>
                                        {doc.review_notes && (
                                            <div className="doc-item-meta" style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                                                💬 {doc.review_notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="doc-item-actions">
                                        {doc.status === 'pending_review' && (
                                            <button className="btn btn-danger btn-sm" onClick={() => deleteDocument(doc.id)}>🗑️</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {documents.length === 0 && (
                        <div className="screening-empty">
                            <div className="screening-empty-icon">📑</div>
                            No documents uploaded yet
                        </div>
                    )}
                </div>

                {/* ═══ RIGHT: Book Appointment ═══ */}
                <div className="card fade-in fade-in-delay-3">
                    <div className="card-header">
                        <h3 className="card-title">🗓️ Book Clinic Appointment</h3>
                    </div>

                    <form onSubmit={handleBookAppointment} className="appt-form">
                        <div className="form-group">
                            <label className="form-label">Appointment Type</label>
                            <select className="form-select" value={apptType} onChange={e => setApptType(e.target.value)}>
                                {APPT_TYPES.map(at => (
                                    <option key={at.value} value={at.value}>{at.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Preferred Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={apptDate}
                                    onChange={e => setApptDate(e.target.value)}
                                    min={getTomorrowDate()}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Time Slot</label>
                                <select className="form-select" value={apptTimeSlot} onChange={e => setApptTimeSlot(e.target.value)}>
                                    {TIME_SLOTS.map(ts => (
                                        <option key={ts.value} value={ts.value}>{ts.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Additional Notes (optional)</label>
                            <input
                                className="form-input"
                                placeholder="e.g. First-time donor, any accessibility needs..."
                                value={apptNotes}
                                onChange={e => setApptNotes(e.target.value)}
                                maxLength={500}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" disabled={!apptDate || booking}>
                            {booking ? 'Booking...' : '📅 Request Appointment'}
                        </button>
                    </form>

                    {/* Appointment list */}
                    {appointments.length > 0 && (
                        <div className="appt-list">
                            <div className="doc-list-title">Your Appointments</div>
                            {appointments.map(appt => {
                                const d = new Date(appt.preferred_date);
                                return (
                                    <div key={appt.id} className="appt-item">
                                        <div className="appt-item-date">
                                            <span className="day">{d.getDate()}</span>
                                            <span className="month">{d.toLocaleString('en', { month: 'short' })}</span>
                                        </div>
                                        <div className="appt-item-info">
                                            <div className="appt-item-type">
                                                {appt.appointment_type.replace(/_/g, ' ')}
                                            </div>
                                            <div className="appt-item-time">
                                                {appt.preferred_time_slot.charAt(0).toUpperCase() + appt.preferred_time_slot.slice(1)} slot
                                                <span className={`badge badge-${appt.status}`} style={{ marginLeft: '0.5rem' }}>
                                                    {appt.status}
                                                </span>
                                            </div>
                                            {appt.clinic_notes && (
                                                <div className="appt-item-time" style={{ marginTop: '0.2rem', fontStyle: 'italic' }}>
                                                    💬 {appt.clinic_notes}
                                                </div>
                                            )}
                                        </div>
                                        <div className="appt-item-actions">
                                            {appt.status === 'requested' && (
                                                <button className="btn btn-danger btn-sm" onClick={() => cancelAppointment(appt.id)}>Cancel</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {appointments.length === 0 && (
                        <div className="screening-empty">
                            <div className="screening-empty-icon">🗓️</div>
                            No appointments booked yet
                        </div>
                    )}
                </div>
            </div>

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
