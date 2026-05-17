import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Lock, FileText, ChevronRight } from 'lucide-react';
import '../Dashboard.css';
import './DonorProfile.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC', 'CC'];
const EDUCATION_LEVELS = ['Primary', 'Secondary', 'Certificate', 'Diploma', 'Bachelor', 'Master', 'Doctorate'];
const SKIN_TONES = ['Very Fair', 'Fair', 'Light Brown', 'Medium Brown', 'Dark Brown', 'Very Dark'];
const HAIR_COLORS = ['Black', 'Dark Brown', 'Brown', 'Auburn', 'Blonde', 'Red', 'Grey'];
const HAIR_TEXTURES = ['Straight', 'Wavy', 'Curly', 'Coily', 'Kinky'];
const EYE_COLORS = ['Black', 'Dark Brown', 'Brown', 'Hazel', 'Green', 'Blue', 'Grey'];

export default function DonorProfileForm() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const photoInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(false);

    const [consentsDone, setConsentsDone] = useState(false);

    // FIXED: Added the missing fields to the initial state
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
        medical_history: '', // Changed to string to work with textarea
        family_medical_history: [],
        availability_status: 'available',
        menstrual_regularity: 'regular',
        prev_pregnancies: '',
        smoking: 'never',
        blood_group: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/donors');
            if (res.data && res.data.id) {
                setProfile(res.data);

                // CHECK STATUS: 
                // If status is NOT 'pre_consultation' or 'signing_consents', they can see this page.
                const restrictedStatuses = ['pre_consultation', 'signing_consents'];
                if (!restrictedStatuses.includes(res.data.status)) {
                    setConsentsDone(true);
                }

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
                    medical_history: res.data.medical_history || '',
                    family_medical_history: res.data.family_medical_history || [],
                    availability_status: res.data.availability_status || 'available',
                    menstrual_regularity: res.data.menstrual_regularity || 'regular',
                    prev_pregnancies: res.data.prev_pregnancies || '',
                    smoking: res.data.smoking || 'never',
                    blood_group: res.data.blood_group || ''
                });
                if (res.data.photo_path) {
                    setPhotoPreview(`http://127.0.0.1:8000/storage/${res.data.photo_path}`);
                }
            }
        } catch (err) {
            // No profile yet — that's fine
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

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            const formDataPayload = new FormData();
            formDataPayload.append('photo', file);
            const res = await api.post(`/donors/${profile.id}/photo`, formDataPayload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPhotoPreview(res.data.photo_url);
            setSuccess('Photo uploaded successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Photo upload failed');
            setPhotoPreview(profile.photo_path ? `http://127.0.0.1:8000/storage/${profile.photo_path}` : null);
            setTimeout(() => setError(''), 3000);
        } finally {
            setUploading(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        setErrors({});

        try {
            const payload = { ...form };
            // Convert empty strings to null
            Object.keys(payload).forEach(k => {
                if (payload[k] === '') payload[k] = null;
            });

            if (profile) {
                await api.put(`/donors/${profile.id}`, payload);
                setSuccess('Profile updated successfully!');
            } else {
                await api.post('/donors', payload);
                setSuccess('Profile created successfully! Awaiting clinician approval.');
            }
            setIsEditing(false); // Switch back to static view
            await fetchProfile();
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setError(err.response?.data?.message || 'Failed to save profile.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    // ── Gated Access Check ──
    if (!consentsDone) {
        return (
            <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
                <div className="card text-center" style={{ maxWidth: '500px', padding: '3rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ 
                            width: '80px', 
                            height: '80px', 
                            background: 'var(--bg-input)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            margin: '0 auto' 
                        }}>
                            <Lock size={40} color="var(--text-secondary)" />
                        </div>
                    </div>
                    <h2 style={{ marginBottom: '1rem' }}>Profile Locked</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                        To ensure legal compliance and donor safety, you must first finish filling the 
                        <Link to="/donor/consents" style={{ 
                            color: 'var(--accent)', 
                            fontWeight: 'bold', 
                            textDecoration: 'underline',
                            margin: '0 5px'
                        }}>
                            Consents
                        </Link> 
                        before you can complete your phenotypic profile.
                    </p>
                    <Link to="/donor/consents" className="btn-edit-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        Go to Consents <ChevronRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    const bmi = form.height_cm && form.weight_kg
        ? (form.weight_kg / ((form.height_cm / 100) ** 2)).toFixed(1)
        : null;

    return (
        <div className="page">
             {/* 🔔 FLOATING BANNER NOTIFICATIONS */}
            <div className="banner-container">
                {success && <div className="alert alert-success" style={{ boxShadow: '0 10px 30px rgba(16,185,129,0.2)' }}>{success}</div>}
                {error && <div className="alert alert-error" style={{ boxShadow: '0 10px 30px rgba(239,68,68,0.2)' }}>{error}</div>}
            </div>

            <div className="page-header">
                <h1 className="page-title">Donor Profile 🌸</h1>
                <p className="page-subtitle">
                    {profile
                        ? <>Code: <strong>{profile.donor_code}</strong> — Status: <span className={`badge badge-${profile.status}`}>{profile.status}</span></>
                        : 'Complete your profile to begin the matching process'
                    }
                </p>
            </div>


            {/* ── Photo Upload Section ── */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header"><h3 className="card-title">📸 Profile Photo</h3></div>
                <div className="donor-photo-section">
                    <div
                        className={`donor-photo-container ${uploading ? 'uploading' : ''}`}
                        onClick={() => profile && photoInputRef.current?.click()}
                        style={{ cursor: profile ? 'pointer' : 'default' }}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Donor" className="donor-photo-img" />
                        ) : (
                            <div className="donor-photo-placeholder">
                                <span className="donor-photo-icon">👤</span>
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
                            <div className="donor-photo-edit-badge">
                                📷
                            </div>
                        )}
                    </div>
                    <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handlePhotoSelect}
                        style={{ display: 'none' }}
                    />
                    <div className="donor-photo-info">
                        <p className="donor-photo-hint">
                            Upload a clear, front-facing photo. This helps clinicians during the matching process.
                        </p>
                        <p className="donor-photo-specs">JPG or PNG • Max 5MB</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Medical Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header card-header-flex">
                        <h3 className="card-title">🩺 Medical Information</h3>
                        <button 
                            type="button" 
                            className="btn-edit-toggle" 
                            onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? 'Cancel' : 'Edit Info'}
                        </button>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date of Birth *</label>
                            <input type="date" name="date_of_birth" className="form-input" disabled={!isEditing} value={form.date_of_birth} onChange={handleChange} required />
                            {errors.date_of_birth && <span className="form-error">{errors.date_of_birth[0]}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Blood Type</label>
                            <select name="blood_type" className="form-select" disabled={!isEditing} value={form.blood_type} onChange={handleChange}>
                                <option value="">Select...</option>
                                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Genotype</label>
                            <select name="genotype" className="form-select" disabled={!isEditing} value={form.genotype} onChange={handleChange}>
                                <option value="">Select...</option>
                                {GENOTYPES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Height (cm)</label>
                            <input type="number" name="height_cm" className="form-input" placeholder="e.g. 165" disabled={!isEditing} value={form.height_cm} onChange={handleChange} min="100" max="250" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Weight (kg)</label>
                            <input type="number" name="weight_kg" className="form-input" placeholder="e.g. 58" disabled={!isEditing} value={form.weight_kg} onChange={handleChange} min="30" max="200" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">BMI (auto-calculated)</label>
                            <input type="text" className="form-input" value={bmi ? `${bmi} kg/m²` : '—'} disabled />
                        </div>
                    </div>
                </div>

                {/* Phenotypic Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header"><h3 className="card-title">🎨 Phenotypic Information</h3></div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Ethnicity</label>
                            <input type="text" name="ethnicity" className="form-input" placeholder="e.g. Baganda, Acholi..." disabled={!isEditing} value={form.ethnicity} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Skin Tone</label>
                            <select name="skin_tone" className="form-select" disabled={!isEditing} value={form.skin_tone} onChange={handleChange}>
                                <option value="">Select...</option>
                                {SKIN_TONES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Hair Color</label>
                            <select name="hair_color" className="form-select" disabled={!isEditing} value={form.hair_color} onChange={handleChange}>
                                <option value="">Select...</option>
                                {HAIR_COLORS.map(hc => <option key={hc} value={hc}>{hc}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hair Texture</label>
                            <select name="hair_texture" className="form-select" disabled={!isEditing} value={form.hair_texture} onChange={handleChange}>
                                <option value="">Select...</option>
                                {HAIR_TEXTURES.map(ht => <option key={ht} value={ht}>{ht}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Eye Color</label>
                        <select name="eye_color" className="form-select" disabled={!isEditing} value={form.eye_color} onChange={handleChange}>
                            <option value="">Select...</option>
                            {EYE_COLORS.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                        </select>
                    </div>
                </div>

                {/* Demographic Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header"><h3 className="card-title">📋 Demographic Information</h3></div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Highest Education Level</label>
                            <select name="education_level" className="form-select" disabled={!isEditing} value={form.education_level} onChange={handleChange}>
                                <option value="">Select...</option>
                                {EDUCATION_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Occupation</label>
                            <input type="text" name="occupation" className="form-input" placeholder="e.g. Nurse, Teacher..." disabled={!isEditing} value={form.occupation} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* 1. Fertility & Reproductive History */}
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-white"><h5>Fertility & Reproductive History</h5></div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label">Menstrual Cycle Regularity</label>
                                {/* FIXED: changed formData to form and added disabled prop */}
                                <select className="form-select" name="menstrual_regularity" value={form.menstrual_regularity} onChange={handleChange} disabled={!isEditing}>
                                    <option value="regular">Regular</option>
                                    <option value="irregular">Irregular</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Previous Pregnancies (Count)</label>
                                {/* FIXED: changed formData to form and added disabled prop */}
                                <input type="number" className="form-input" name="prev_pregnancies" value={form.prev_pregnancies} onChange={handleChange} disabled={!isEditing} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Medical & Lifestyle Information */}
                <div className="card shadow-sm mb-4">
                    <div className="card-header bg-white"><h5>Medical & Lifestyle</h5></div>
                    <div className="card-body">
                        <div className="row g-3">
                            <div className="col-md-12">
                                <label className="form-label">Chronic Illnesses or Allergies</label>
                                {/* FIXED: changed formData to form and added disabled prop */}
                                <textarea className="form-input" name="medical_history" value={form.medical_history} onChange={handleChange} placeholder="List any medical conditions..." disabled={!isEditing}></textarea>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Smoking Status</label>
                                {/* FIXED: changed formData to form and added disabled prop */}
                                <select className="form-select" name="smoking" value={form.smoking} onChange={handleChange} disabled={!isEditing}>
                                    <option value="never">Never</option>
                                    <option value="former">Former</option>
                                    <option value="active">Active</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Blood Group</label>
                                {/* FIXED: changed formData to form and added disabled prop */}
                                <input type="text" className="form-input" name="blood_group" value={form.blood_group} onChange={handleChange} placeholder="e.g. O+" disabled={!isEditing} />
                            </div>
                        </div>
                    </div>
                    <div className="form-group" style={{ padding: '1rem' }}>
                        <label className="form-label">Availability</label>
                        <select name="availability_status" className="form-select" disabled={!isEditing} value={form.availability_status} onChange={handleChange}>
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                            <option value="on_cycle">On Cycle</option>
                        </select>
                    </div>
                </div>

                {isEditing && (
                    <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                )}

            </form>
        </div>
    );
}
