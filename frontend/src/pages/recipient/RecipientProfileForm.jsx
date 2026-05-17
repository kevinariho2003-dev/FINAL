import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import '../Dashboard.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'AC', 'SS', 'SC', 'CC'];
const EDUCATION_LEVELS = ['Primary', 'Secondary', 'Certificate', 'Diploma', 'Bachelor', 'Master', 'Doctorate'];
const SKIN_TONES = ['Very Fair', 'Fair', 'Light Brown', 'Medium Brown', 'Dark Brown', 'Very Dark'];
const HAIR_COLORS = ['Black', 'Dark Brown', 'Brown', 'Auburn', 'Blonde', 'Red', 'Grey'];
const EYE_COLORS = ['Black', 'Dark Brown', 'Brown', 'Hazel', 'Green', 'Blue', 'Grey'];

export default function RecipientProfileForm() {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [errors, setErrors] = useState({});

    const [isEditing, setIsEditing] = useState(false);

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

    useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success, error]);

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
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        
        try {
            const payload = { ...form };
            Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

            if (profile) {
                await api.put(`/recipients/${profile.id}`, payload);
                setSuccess('Profile updated successfully! 🎉');
            } else {
                await api.post('/recipients', payload);
                setSuccess('Profile created successfully! 💜');
            }
            setIsEditing(false); // Switch back to static view
            await fetchProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save profile.');
        } finally { setSaving(false); }
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            {/* 🔔 FLOATING BANNER NOTIFICATIONS */}
            <div className="banner-container">
                {success && <div className="alert alert-success" style={{ boxShadow: '0 10px 30px rgba(16,185,129,0.2)' }}>{success}</div>}
                {error && <div className="alert alert-error" style={{ boxShadow: '0 10px 30px rgba(239,68,68,0.2)' }}>{error}</div>}
            </div>

            <div className="page-header">
                <h1 className="page-title">Recipient Profile 💜</h1>
                <p className="page-subtitle">
                    {profile ? `Code: ${profile.recipient_code}` : 'Set up your profile'}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Medical Context Section */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header card-header-flex">
                        <h3 className="card-title">🩺 Medical Context</h3>
                        <button 
                            type="button" 
                            className="btn-edit-toggle" 
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing ? 'Cancel' : 'Edit Info'}
                        </button>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Diagnosis</label>
                        <textarea 
                            name="diagnosis" 
                            className="form-textarea" 
                            disabled={!isEditing} 
                            value={form.diagnosis} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Treatment History</label>
                        <textarea 
                            name="treatment_history" 
                            className="form-textarea" 
                            disabled={!isEditing} 
                            value={form.treatment_history} 
                            onChange={handleChange} 
                        />
                    </div>
                </div>

                {/* Donor Preferences */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header card-header-flex">
                        <h3 className="card-title">🎯 Donor Preferences</h3>
                        {!isEditing && <button type="button" className="btn-edit-toggle" onClick={() => setIsEditing(true)}>Edit Preferences</button>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preferred Blood Type</label>
                            <select name="preferred_blood_type" className="form-select" disabled={!isEditing} value={form.preferred_blood_type} onChange={handleChange}>
                                <option value="">No preference</option>
                                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Preferred Genotype</label>
                            <select name="preferred_genotype" className="form-select" disabled={!isEditing} value={form.preferred_genotype} onChange={handleChange}>
                                <option value="">No preference</option>
                                {GENOTYPES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preferred Ethnicity</label>
                            <input type="text" name="preferred_ethnicity" className="form-input" placeholder="e.g. Baganda" disabled={!isEditing} value={form.preferred_ethnicity} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preferred Skin Tone</label>
                            <select name="preferred_skin_tone" className="form-select" disabled={!isEditing} value={form.preferred_skin_tone} onChange={handleChange}>
                                <option value="">No preference</option>
                                {SKIN_TONES.map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preferred Hair Color</label>
                            <select name="preferred_hair_color" className="form-select" disabled={!isEditing} value={form.preferred_hair_color} onChange={handleChange}>
                                <option value="">No preference</option>
                                {HAIR_COLORS.map(hc => <option key={hc} value={hc}>{hc}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preferred Eye Color</label>
                            <select name="preferred_eye_color" className="form-select" disabled={!isEditing} value={form.preferred_eye_color} onChange={handleChange}>
                                <option value="">No preference</option>
                                {EYE_COLORS.map(ec => <option key={ec} value={ec}>{ec}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preferred Donor Age (Min)</label>
                            <input type="number" name="preferred_age_min" className="form-input" placeholder="18" disabled={!isEditing} value={form.preferred_age_min} onChange={handleChange} min="18" max="45" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preferred Donor Age (Max)</label>
                            <input type="number" name="preferred_age_max" className="form-input" placeholder="35" disabled={!isEditing} value={form.preferred_age_max} onChange={handleChange} min="18" max="45" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Preferred Education Level</label>
                            <select name="preferred_education_level" className="form-select" disabled={!isEditing} value={form.preferred_education_level} onChange={handleChange}>
                                <option value="">No preference</option>
                                {EDUCATION_LEVELS.map(el => <option key={el} value={el}>{el}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Previous Donations</label>
                            <input type="number" name="max_previous_donations" className="form-input" placeholder="e.g. 5" disabled={!isEditing} value={form.max_previous_donations} onChange={handleChange} min="0" max="20" />
                        </div>
                    </div>
                </div>
                

                {/* Additional */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header"><h3 className="card-title">📌 Additional</h3></div>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" name="is_international" checked={form.is_international} onChange={handleChange} />
                            <span className="form-label" style={{ margin: 0 }}>I am an international recipient</span>
                        </label>
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
