import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../Dashboard.css';
import './DonorProfile.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC', 'CC'];
const EDUCATION_LEVELS = ['Primary', 'Secondary', 'Certificate', 'Diploma', 'Bachelor', 'Master', 'Doctorate'];
const SKIN_TONES = ['Very Fair', 'Fair', 'Light Brown', 'Medium Brown', 'Dark Brown', 'Very Dark'];
const HAIR_COLORS = ['Black', 'Dark Brown', 'Brown', 'Auburn', 'Blonde', 'Red', 'Grey'];
const HAIR_TEXTURES = ['Straight', 'Wavy', 'Curly', 'Coily', 'Kinky'];
const EYE_COLORS = ['Black', 'Dark Brown', 'Brown', 'Hazel', 'Green', 'Blue', 'Grey'];

const PROFILE_STEPS = [
    { number: '01', title: 'Health Basics', desc: 'Birth date, blood type and body details', icon: 'heart' },
    { number: '02', title: 'Appearance Details', desc: 'Physical characteristics used for matching', icon: 'spark' },
    { number: '03', title: 'Background', desc: 'Education, work and availability', icon: 'briefcase' },
];

function SvgIcon({ name, className = '' }) {
    const paths = {
        heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
        spark: 'M12 2l1.9 5.7L20 10l-6.1 2.3L12 18l-1.9-5.7L4 10l6.1-2.3L12 2zm7 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
        briefcase: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 0h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm-2 6h18',
        camera: 'M4 8h4l2-3h4l2 3h4v11H4V8zm8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
        user: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
        check: 'M20 6 9 17l-5-5',
        arrow: 'M5 12h14m-6-6 6 6-6 6',
        back: 'M19 12H5m6-6-6 6 6 6',
    };

    return (
        <svg className={`dp-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function DonorProfileForm() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [justCreated, setJustCreated] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const navigate = useNavigate();
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const photoInputRef = useRef(null);
    const topRef = useRef(null);
    const touchStartX = useRef(null);

    const [form, setForm] = useState({
        date_of_birth: '',
        blood_type: '',
        genotype: '',
        height_cm: '',
        weight_kg: '',
        ethnicity: '',
        skin_tone: '',
        hair_color: '',
        hair_texture: '',
        eye_color: '',
        education_level: '',
        occupation: '',
        medical_history: [],
        family_medical_history: [],
        availability_status: 'available',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const scrollTop = () => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get('/donors');
            if (res.data && res.data.id) {
                setProfile(res.data);
                setForm({
                    date_of_birth: res.data.date_of_birth?.split('T')[0] || '',
                    blood_type: res.data.blood_type || '',
                    genotype: res.data.genotype || '',
                    height_cm: res.data.height_cm || '',
                    weight_kg: res.data.weight_kg || '',
                    ethnicity: res.data.ethnicity || '',
                    skin_tone: res.data.skin_tone || '',
                    hair_color: res.data.hair_color || '',
                    hair_texture: res.data.hair_texture || '',
                    eye_color: res.data.eye_color || '',
                    education_level: res.data.education_level || '',
                    occupation: res.data.occupation || '',
                    medical_history: res.data.medical_history || [],
                    family_medical_history: res.data.family_medical_history || [],
                    availability_status: res.data.availability_status || 'available',
                });
                if (res.data.photo_path) {
                    setPhotoPreview(`http://127.0.0.1:8000/storage/${res.data.photo_path}`);
                }
            }
        } catch {
            /* no profile yet */
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    };

    const handlePhotoSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);

        setUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const res = await api.post(`/donors/${profile.id}/photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPhotoPreview(res.data.photo_url);
            setSuccess('Photo updated successfully.');
            scrollTop();
        } catch (err) {
            setError(err.response?.data?.message || 'Photo upload failed');
            setPhotoPreview(profile.photo_path ? `http://127.0.0.1:8000/storage/${profile.photo_path}` : null);
            scrollTop();
        } finally {
            setUploading(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!profile && !showConfirmModal) {
            setShowConfirmModal(true);
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');
        setErrors({});

        try {
            const payload = { ...form };
            Object.keys(payload).forEach(k => {
                if (payload[k] === '') payload[k] = null;
            });

            if (profile) {
                await api.put(`/donors/${profile.id}`, payload);
                setSuccess('Details updated successfully. Redirecting...');
                setTimeout(() => navigate('/donor/dashboard'), 1500);
            } else {
                await api.post('/donors', payload);
                setJustCreated(true);
                setShowConfirmModal(false);
                setSuccess('Profile created successfully. Redirecting to dashboard...');
                setTimeout(() => navigate('/donor/dashboard'), 1500);
            }
            await fetchProfile();
            scrollTop();
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setError(err.response?.data?.message || 'Failed to save profile.');
            }
            scrollTop();
        } finally {
            setSaving(false);
        }
    };

    const goToStep = (index) => {
        setActiveStep(Math.max(0, Math.min(PROFILE_STEPS.length - 1, index)));
        scrollTop();
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;
        if (Math.abs(diff) < 45) return;
        if (diff > 0) goToStep(activeStep + 1);
        if (diff < 0) goToStep(activeStep - 1);
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const bmi = form.height_cm && form.weight_kg
        ? (form.weight_kg / ((form.height_cm / 100) ** 2)).toFixed(1)
        : null;

    const currentStep = PROFILE_STEPS[activeStep];
    const isFinalStep = activeStep === PROFILE_STEPS.length - 1;
    const isLocked = !!profile;

    return (
        <div className="page donor-profile-page dp-modern" ref={topRef}>
            <div className="dp-hero">
                <div>
                    <p className="dp-kicker">Donor profile setup</p>
                    <h1>Complete Your Profile</h1>
                    <p>
                        Move through each phase, save your profile, then add or update your photo from the side panel.
                    </p>
                </div>
                {profile && (
                    <div className="dp-profile-state">
                        <span>{profile ? 'Created' : 'Draft'}</span>
                        <strong>{profile.donor_code}</strong>
                    </div>
                )}
            </div>

            {success && <div className="alert alert-success">{success}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            {isLocked && (
                <div className="alert" style={{
                    background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                    border: '1.5px solid #facc15',
                    borderRadius: 14,
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                }}>
                    <span style={{ fontSize: '1.5rem' }}>🔒</span>
                    <div>
                        <div style={{ fontWeight: 800, color: '#854d0e', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                            Profile Locked &amp; Submitted
                        </div>
                        <div style={{ color: '#a16207', fontSize: '0.84rem', lineHeight: 1.55 }}>
                            Your profile has been submitted and is locked for clinical review and matching accuracy.
                            To request changes to these details, please contact your clinician.
                        </div>
                    </div>
                </div>
            )}

            <div className="dp-step-tracker dp-carousel-tracker" aria-label="Donor profile phases">
                {PROFILE_STEPS.map((step, index) => (
                    <button
                        type="button"
                        className={`dp-track-step ${index === activeStep ? 'active' : index < activeStep ? 'complete' : ''}`}
                        key={step.number}
                        onClick={() => goToStep(index)}
                    >
                        <div className="dp-track-index">{index < activeStep ? <SvgIcon name="check" /> : step.number}</div>
                        <div className="dp-track-copy">
                            <strong>{step.title}</strong>
                            <span>{step.desc}</span>
                        </div>
                    </button>
                ))}
            </div>

            <div className="dp-profile-shell">
                <form onSubmit={handleSubmit} className="dp-carousel-card">
                    <div className="dp-card-header-modern">
                        <div className="dp-card-icon"><SvgIcon name={currentStep.icon} /></div>
                        <div>
                            <span>Phase {currentStep.number}</span>
                            <h2>{currentStep.title}</h2>
                        </div>
                    </div>

                    <div
                        className="dp-swipe-window"
                        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                        onTouchEnd={handleTouchEnd}
                    >
                        {activeStep === 0 && (
                            <section className="dp-step-pane">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Weight (kg) <span className="req">*</span></label>
                                        <input type="number" name="weight_kg" className="form-input" placeholder="e.g. 65" value={form.weight_kg} onChange={handleChange} disabled={false} />
                                        {errors.weight_kg && <span className="form-error">{errors.weight_kg[0]}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Blood Type</label>
                                        <select name="blood_type" className="form-select" value={form.blood_type} onChange={handleChange} disabled={isLocked}>
                                            <option value="">Select...</option>
                                            {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Genotype</label>
                                        <select name="genotype" className="form-select" value={form.genotype} onChange={handleChange} disabled={isLocked}>
                                            <option value="">Select...</option>
                                            {GENOTYPES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Height (cm)</label>
                                        <input type="number" name="height_cm" className="form-input" placeholder="e.g. 165" value={form.height_cm} onChange={handleChange} min="100" max="250" disabled={isLocked} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Date of Birth *</label>
                                        <input type="date" name="date_of_birth" className="form-input" value={form.date_of_birth} onChange={handleChange} required disabled={isLocked} />
                                        {errors.date_of_birth && <span className="form-error">{errors.date_of_birth[0]}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">BMI (auto-calculated)</label>
                                        <input type="text" className="form-input" value={bmi ? `${bmi} kg/m2` : '-'} disabled />
                                    </div>
                                </div>
                            </section>
                        )}

                        {activeStep === 1 && (
                            <section className="dp-step-pane">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Ethnicity</label>
                                        <input type="text" name="ethnicity" className="form-input" placeholder="e.g. Baganda, Acholi..." value={form.ethnicity} onChange={handleChange} disabled={isLocked} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Skin Tone</label>
                                        <select name="skin_tone" className="form-select" value={form.skin_tone} onChange={handleChange} disabled={isLocked}>
                                            <option value="">Select...</option>
                                            {SKIN_TONES.map(st => <option key={st} value={st}>{st}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Hair Color</label>
                                        <select name="hair_color" className="form-select" value={form.hair_color} onChange={handleChange} disabled={isLocked}>
                                            <option value="">Select...</option>
                                            {HAIR_COLORS.map(hc => <option key={hc} value={hc}>{hc}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Hair Texture</label>
                                        <select name="hair_texture" className="form-select" value={form.hair_texture} onChange={handleChange} disabled={isLocked}>
                                            <option value="">Select...</option>
                                            {HAIR_TEXTURES.map(ht => <option key={ht} value={ht}>{ht}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Eye Color</label>
                                    <select name="eye_color" className="form-select" value={form.eye_color} onChange={handleChange} disabled={isLocked}>
                                        <option value="">Select...</option>
                                        {EYE_COLORS.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                                    </select>
                                </div>
                            </section>
                        )}

                        {activeStep === 2 && (
                            <section className="dp-step-pane">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Education Level</label>
                                        <select name="education_level" className="form-select" value={form.education_level} onChange={handleChange} disabled={false}>
                                            <option value="">Select Level...</option>
                                            {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Occupation</label>
                                        <input type="text" name="occupation" className="form-input" placeholder="e.g. Nurse, Teacher..." value={form.occupation} onChange={handleChange} disabled={false} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Availability</label>
                                    <select name="availability_status" className="form-select" value={form.availability_status} onChange={handleChange} disabled={false}>
                                        <option value="available">Available</option>
                                        <option value="unavailable">Unavailable</option>
                                        <option value="on_cycle">On Cycle</option>
                                    </select>
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="dp-carousel-actions">
                        <button type="button" className="dp-nav-btn" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}>
                            <SvgIcon name="back" /> Back
                        </button>
                        {!isFinalStep ? (
                            <button type="button" className="dp-primary-btn" onClick={() => goToStep(activeStep + 1)}>
                                Continue <SvgIcon name="arrow" />
                            </button>
                        ) : (
                            <button type="submit" className={`dp-primary-btn ${justCreated ? 'is-created' : ''}`} disabled={saving}>
                                {saving ? 'Saving...' : profile ? 'Update Details' : 'Create Profile'}
                            </button>
                        )}
                    </div>
                </form>

                <aside className="dp-photo-panel">
                    <div className="dp-photo-head">
                        <SvgIcon name="camera" />
                        <div>
                            <h2>Profile Photo</h2>
                            <p>{profile ? 'Click the photo area to upload or update it.' : 'Create your profile first, then add your photo.'}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={`donor-photo-container ${uploading ? 'uploading' : ''} ${!profile ? 'disabled' : ''}`}
                        onClick={() => profile && photoInputRef.current?.click()}
                        disabled={!profile || uploading}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Donor" className="donor-photo-img" />
                        ) : (
                            <div className="donor-photo-placeholder">
                                <SvgIcon name="user" className="donor-photo-svg" />
                                <span className="donor-photo-text">
                                    {profile ? 'Click to add photo' : 'Save profile first'}
                                </span>
                            </div>
                        )}
                        {uploading && (
                            <div className="donor-photo-overlay">
                                <div className="spinner" style={{ width: 28, height: 28 }}></div>
                            </div>
                        )}
                        {profile && !uploading && (
                            <span className="donor-photo-edit-badge"><SvgIcon name="camera" /></span>
                        )}
                    </button>

                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handlePhotoSelect}
                        style={{ display: 'none' }}
                    />
                    <p className="donor-photo-hint">
                        Upload a clear, front-facing photo. This helps clinicians during the matching process.
                    </p>
                    <p className="donor-photo-specs">JPG or PNG - Max 5MB</p>
                </aside>
            </div>

            {showConfirmModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', borderRadius: '12px', maxWidth: 450, padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#111827', fontSize: '1.5rem' }}>Create Profile?</h2>
                        <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            Are you sure you want to submit your profile? Core physical attributes and medical data will be locked for clinical review and cannot be changed later.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowConfirmModal(false)} disabled={saving} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
                                No, Review Again
                            </button>
                            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}>
                                {saving ? 'Creating...' : 'Yes, Submit Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
