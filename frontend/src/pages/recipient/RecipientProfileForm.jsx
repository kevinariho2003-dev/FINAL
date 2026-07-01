import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';
import './RecipientProfile.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC', 'CC'];
const EDUCATION_LEVELS = ['Primary', 'Secondary', 'Certificate', 'Diploma', 'Bachelor', 'Master', 'Doctorate'];
const SKIN_TONES = ['Very Fair', 'Fair', 'Light Brown', 'Medium Brown', 'Dark Brown', 'Very Dark'];
const HAIR_COLORS = ['Black', 'Dark Brown', 'Brown', 'Auburn', 'Blonde', 'Red', 'Grey'];
const EYE_COLORS = ['Black', 'Dark Brown', 'Brown', 'Hazel', 'Green', 'Blue', 'Grey'];

const PROFILE_STEPS = [
    { number: '01', title: 'Medical Context', desc: 'Diagnosis & treatment history', icon: 'heart' },
    { number: '02', title: 'Donor Preferences', desc: 'Physical and background qualities', icon: 'spark' },
    { number: '03', title: 'Additional Settings', desc: 'Location, priority & submission', icon: 'briefcase' },
];

function SvgIcon({ name, className = '' }) {
    const paths = {
        heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
        spark: 'M12 2l1.9 5.7L20 10l-6.1 2.3L12 18l-1.9-5.7L4 10l6.1-2.3L12 2zm7 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
        briefcase: 'M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 0h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm-2 6h18',
        check: 'M20 6 9 17l-5-5',
        arrow: 'M5 12h14m-6-6 6 6-6 6',
        back: 'M19 12H5m6-6-6 6 6 6',
        lock: 'M12 17v-3m-5-3V7a5 5 0 0 1 10 0v4m-12 0h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z',
        user: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
    };

    return (
        <svg className={`rp-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true" style={arguments[0]?.style}>
            <path d={paths[name]} />
        </svg>
    );
}

export default function RecipientProfileForm() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const navigate = useNavigate();
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [activeStep, setActiveStep] = useState(0);
    const touchStartX = useRef(null);
    const topRef = useRef(null);

    const [form, setForm] = useState({
        diagnosis: '',
        treatment_history: '',
        preferred_blood_type: '',
        preferred_genotype: '',
        preferred_ethnicity: '',
        preferred_skin_tone: '',
        preferred_hair_color: '',
        preferred_eye_color: '',
        preferred_age_min: '',
        preferred_age_max: '',
        preferred_education_level: '',
        max_previous_donations: '',
        priority_level: 'normal',
        is_international: false,
    });

    useEffect(() => { fetchProfile(); }, []);

    const scrollTop = () => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const goToStep = (index) => {
        setActiveStep(Math.max(0, Math.min(PROFILE_STEPS.length - 1, index)));
        scrollTop();
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        touchStartX.current = null;
        if (Math.abs(diff) < 45) return;
        if (diff > 0) goToStep(activeStep + 1);
        if (diff < 0) goToStep(activeStep - 1);
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get('/recipients');
            if (res.data && res.data.id) {
                setProfile(res.data);
                setForm({
                    diagnosis: res.data.diagnosis || '',
                    treatment_history: res.data.treatment_history || '',
                    preferred_blood_type: res.data.preferred_blood_type || '',
                    preferred_genotype: res.data.preferred_genotype || '',
                    preferred_ethnicity: res.data.preferred_ethnicity || '',
                    preferred_skin_tone: res.data.preferred_skin_tone || '',
                    preferred_hair_color: res.data.preferred_hair_color || '',
                    preferred_eye_color: res.data.preferred_eye_color || '',
                    preferred_age_min: res.data.preferred_age_min || '',
                    preferred_age_max: res.data.preferred_age_max || '',
                    preferred_education_level: res.data.preferred_education_level || '',
                    max_previous_donations: res.data.max_previous_donations || '',
                    priority_level: res.data.priority_level || 'normal',
                    is_international: res.data.is_international || false,
                });
            }
        } catch (err) { /* no profile yet */ }
        finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm({ ...form, [e.target.name]: val });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!showConfirmModal) {
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
                await api.put(`/recipients/${profile.id}`, payload);
                setSuccess('Details updated successfully. Redirecting...');
                setTimeout(() => navigate('/recipient/dashboard'), 1500);
            } else {
                await api.post('/recipients', payload);
                setShowConfirmModal(false);
                setSuccess('Profile created successfully. Redirecting to dashboard...');
                setTimeout(() => navigate('/recipient/dashboard'), 1500);
            }
            await fetchProfile();
            scrollTop();
        } catch (err) {
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
            else setError(err.response?.data?.message || 'Failed to save profile.');
            scrollTop();
        } finally { setSaving(false); }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const isLocked = !!profile;

    return (
        <div ref={topRef} className="recipient-profile-page rp-modern">
            <div className="rp-hero">
                <div>
                    <span className="rp-kicker">Recipient Setup</span>
                    <h1>Recipient Profile <SvgIcon name="user" style={{ width: '0.85em', height: '0.85em', marginLeft: '0.2rem', verticalAlign: '-0.1em', strokeWidth: 2.5 }} /></h1>
                    <p>
                        {profile
                            ? <>Code: <strong>{profile.recipient_code}</strong> — Status: <span className={`badge badge-${profile.status}`}>{profile.status}</span></>
                            : 'Complete all phases to publish your preferences to the matching engine.'
                        }
                    </p>
                </div>
                {profile && (
                    <div className="rp-profile-state">
                        <span>Database Registry</span>
                        <strong>{profile.recipient_code}</strong>
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
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        <SvgIcon name="lock" style={{ width: '24px', height: '24px', stroke: '#854d0e', strokeWidth: 2 }} />
                    </span>
                    <div>
                        <div style={{ fontWeight: 800, color: '#854d0e', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                            Profile &amp; Preferences Locked
                        </div>
                        <div style={{ color: '#a16207', fontSize: '0.84rem', lineHeight: 1.55 }}>
                            Your profile and donor preferences have been submitted and are locked to ensure matching accuracy.
                            If you need to make changes, please contact your assigned clinician.
                        </div>
                    </div>
                </div>
            )}

            <div className="rp-step-tracker">
                {PROFILE_STEPS.map((step, idx) => {
                    const isComplete = idx < activeStep || isLocked;
                    const isActive = idx === activeStep;
                    return (
                        <button
                            key={idx}
                            type="button"
                            className={`rp-track-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
                            onClick={() => goToStep(idx)}
                        >
                            <span className="rp-track-index" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isComplete ? <SvgIcon name="check" style={{ width: '16px', height: '16px', strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round' }} /> : step.number}
                            </span>
                            <span className="rp-track-copy">
                                <strong>{step.title}</strong>
                                <span>{step.desc}</span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="rp-carousel-card">
                <div className="rp-card-header-modern">
                    <span className="rp-card-icon">
                        <SvgIcon name={PROFILE_STEPS[activeStep].icon} />
                    </span>
                    <div>
                        <span>Step {PROFILE_STEPS[activeStep].number}</span>
                        <h2>{PROFILE_STEPS[activeStep].title}</h2>
                    </div>
                </div>

                <div 
                    className="rp-swipe-window"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {activeStep === 0 && (
                        <div className="rp-step-pane" key="step0">
                            <div className="form-group">
                                <label className="form-label">Diagnosis</label>
                                <textarea 
                                    name="diagnosis" 
                                    className="form-textarea" 
                                    placeholder="Brief description of your fertility diagnosis..." 
                                    value={form.diagnosis} 
                                    onChange={handleChange} 
                                    disabled={isLocked}
                                    style={{ minHeight: '120px' }}
                                />
                                {errors.diagnosis && <span className="form-error">{errors.diagnosis[0]}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Treatment History</label>
                                <textarea 
                                    name="treatment_history" 
                                    className="form-textarea" 
                                    placeholder="Previous treatments, IVF cycles, etc." 
                                    value={form.treatment_history} 
                                    onChange={handleChange} 
                                    disabled={isLocked}
                                    style={{ minHeight: '120px' }}
                                />
                                {errors.treatment_history && <span className="form-error">{errors.treatment_history[0]}</span>}
                            </div>
                        </div>
                    )}

                    {activeStep === 1 && (
                        <div className="rp-step-pane" key="step1">
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                These preferences help the matching engine find suitable donors. Leave blank for no preference.
                            </p>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Blood Type</label>
                                    <select name="preferred_blood_type" className="form-select" value={form.preferred_blood_type} onChange={handleChange} disabled={isLocked}>
                                        <option value="">No preference</option>
                                        {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                    </select>
                                    {errors.preferred_blood_type && <span className="form-error">{errors.preferred_blood_type[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferred Genotype</label>
                                    <select name="preferred_genotype" className="form-select" value={form.preferred_genotype} onChange={handleChange} disabled={isLocked}>
                                        <option value="">No preference</option>
                                        {GENOTYPES.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    {errors.preferred_genotype && <span className="form-error">{errors.preferred_genotype[0]}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Ethnicity</label>
                                    <input type="text" name="preferred_ethnicity" className="form-input" placeholder="e.g. Baganda" value={form.preferred_ethnicity} onChange={handleChange} disabled={isLocked} />
                                    {errors.preferred_ethnicity && <span className="form-error">{errors.preferred_ethnicity[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferred Skin Tone</label>
                                    <select name="preferred_skin_tone" className="form-select" value={form.preferred_skin_tone} onChange={handleChange} disabled={isLocked}>
                                        <option value="">No preference</option>
                                        {SKIN_TONES.map(st => <option key={st} value={st}>{st}</option>)}
                                    </select>
                                    {errors.preferred_skin_tone && <span className="form-error">{errors.preferred_skin_tone[0]}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Hair Color</label>
                                    <select name="preferred_hair_color" className="form-select" value={form.preferred_hair_color} onChange={handleChange} disabled={isLocked}>
                                        <option value="">No preference</option>
                                        {HAIR_COLORS.map(hc => <option key={hc} value={hc}>{hc}</option>)}
                                    </select>
                                    {errors.preferred_hair_color && <span className="form-error">{errors.preferred_hair_color[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferred Eye Color</label>
                                    <select name="preferred_eye_color" className="form-select" value={form.preferred_eye_color} onChange={handleChange} disabled={isLocked}>
                                        <option value="">No preference</option>
                                        {EYE_COLORS.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                                    </select>
                                    {errors.preferred_eye_color && <span className="form-error">{errors.preferred_eye_color[0]}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Donor Age (Min)</label>
                                    <input type="number" name="preferred_age_min" className="form-input" placeholder="18" value={form.preferred_age_min} onChange={handleChange} min="18" max="45" disabled={isLocked} />
                                    {errors.preferred_age_min && <span className="form-error">{errors.preferred_age_min[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferred Donor Age (Max)</label>
                                    <input type="number" name="preferred_age_max" className="form-input" placeholder="35" value={form.preferred_age_max} onChange={handleChange} min="18" max="45" disabled={isLocked} />
                                    {errors.preferred_age_max && <span className="form-error">{errors.preferred_age_max[0]}</span>}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Education Level</label>
                                    <select name="preferred_education_level" className="form-select" value={form.preferred_education_level} onChange={handleChange} disabled={isLocked}>
                                        <option value="">No preference</option>
                                        {EDUCATION_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
                                    </select>
                                    {errors.preferred_education_level && <span className="form-error">{errors.preferred_education_level[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Max Previous Donations</label>
                                    <input type="number" name="max_previous_donations" className="form-input" placeholder="e.g. 5" value={form.max_previous_donations} onChange={handleChange} min="0" max="20" disabled={isLocked} />
                                    {errors.max_previous_donations && <span className="form-error">{errors.max_previous_donations[0]}</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeStep === 2 && (
                        <div className="rp-step-pane" key="step2">
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        name="is_international" 
                                        checked={form.is_international} 
                                        onChange={handleChange} 
                                        disabled={isLocked}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span className="form-label" style={{ margin: 0, fontWeight: 700 }}>I am an international recipient</span>
                                </label>
                                {errors.is_international && <span className="form-error">{errors.is_international[0]}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Priority Level (Assigned by Clinician)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    value={form.priority_level === 'high' ? 'High Priority' : 'Normal Priority'} 
                                    disabled 
                                />
                                {errors.priority_level && <span className="form-error">{errors.priority_level[0]}</span>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="rp-carousel-actions">
                    <button
                        type="button"
                        className="rp-nav-btn"
                        onClick={() => goToStep(activeStep - 1)}
                        disabled={activeStep === 0}
                    >
                        <SvgIcon name="back" /> Back
                    </button>

                    {activeStep < PROFILE_STEPS.length - 1 ? (
                        <button
                            type="button"
                            className="rp-primary-btn"
                            onClick={() => goToStep(activeStep + 1)}
                        >
                            Continue <SvgIcon name="arrow" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="rp-primary-btn"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : profile ? 'Update Details' : 'Create Profile'}
                        </button>
                    )}
                </div>
            </form>

            {showConfirmModal && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ background: 'white', borderRadius: '12px', maxWidth: 450, padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#111827', fontSize: '1.5rem' }}>
                            {profile ? 'Submit Preferences?' : 'Create Profile?'}
                        </h2>
                        <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                            {profile 
                                ? 'Are you sure you want to submit your updated preferences? This will be used by the matching engine to find suitable donors.'
                                : 'Are you sure you want to submit your profile? Your medical diagnosis will be locked for clinical review. You can still update your donor preferences later.'}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-secondary" onClick={() => setShowConfirmModal(false)} disabled={saving} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>
                                No, Review Again
                            </button>
                            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', background: '#9333ea', color: 'white', border: 'none', cursor: 'pointer' }}>
                                {saving ? (profile ? 'Updating...' : 'Creating...') : (profile ? 'Yes, Submit Preferences' : 'Yes, Submit Profile')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
