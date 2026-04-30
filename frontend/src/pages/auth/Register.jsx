import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconDNA, IconHeartPulse, IconFlower, IconSparkles, IconMicroscope, IconRocket, IconLock, IconHospital, IconFlag } from '../../components/Icons';
import './Auth.css';

const BG_IMAGES = [
    '/images/auth/bg1.png',
    '/images/auth/bg2.png',
    '/images/auth/bg3.png',
];

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'recipient',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentBg, setCurrentBg] = useState(0);

    // Auto-rotate background images every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBg(prev => (prev + 1) % BG_IMAGES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setErrors({});
        setLoading(true);
        try {
            const user = await register(form);
            navigate(`/${user.role}/dashboard`);
        } catch (err) {
            if (err.response?.data?.errors) {
                setErrors(err.response.data.errors);
            } else {
                setError(err.response?.data?.message || 'Registration failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-fullscreen">
            {/* Full-screen sliding background images */}
            <div className="auth-bg-slideshow">
                {BG_IMAGES.map((img, i) => (
                    <div
                        key={i}
                        className={`auth-bg-slide ${i === currentBg ? 'active' : ''}`}
                        style={{ backgroundImage: `url(${img})` }}
                    />
                ))}
                <div className="auth-bg-overlay" />
                {/* Animated floating shapes */}
                <div className="auth-float-shapes">
                    <div className="float-shape shape-1"><IconDNA size={28} color="rgba(139,92,246,0.7)" /></div>
                    <div className="float-shape shape-2"><IconHeartPulse size={28} color="rgba(168,85,247,0.7)" /></div>
                    <div className="float-shape shape-3"><IconFlower size={28} color="rgba(236,72,153,0.7)" /></div>
                    <div className="float-shape shape-4"><IconSparkles size={26} color="rgba(251,191,36,0.7)" /></div>
                    <div className="float-shape shape-5"><IconMicroscope size={28} color="rgba(34,211,238,0.7)" /></div>
                </div>
            </div>

            {/* Floating form card — wider for registration */}
            <div className="auth-overlay-content auth-register-content">
                <Link to="/" className="auth-back-btn">
                    ← Back to Home
                </Link>

                <div className="auth-glass-card auth-register-card">
                    <div className="auth-card-header">
                        <img src="/images/brand/logo.png" alt="EDRMS" className="auth-card-logo" />
                        <h1>Create Account</h1>
                        <p>Join Uganda's leading egg donation platform</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    className="form-input"
                                    placeholder="First name"
                                    value={form.first_name}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.first_name && <span className="form-error">{errors.first_name[0]}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    className="form-input"
                                    placeholder="Last name"
                                    value={form.last_name}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.last_name && <span className="form-error">{errors.last_name[0]}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.email && <span className="form-error">{errors.email[0]}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone (optional)</label>
                                <input
                                    type="text"
                                    name="phone"
                                    className="form-input"
                                    placeholder="+256 7XX XXX XXX"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">I am a...</label>
                            <div className="role-selector">
                                <label className={`role-option ${form.role === 'recipient' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="recipient"
                                        checked={form.role === 'recipient'}
                                        onChange={handleChange}
                                    />
                                    <span className="role-icon" style={{ overflow: 'hidden', borderRadius: '12px' }}><img src="/assets/avatars/recipient_default.png" alt="Recipient" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
                                    <span className="role-label">Recipient</span>
                                    <span className="role-desc">Looking for an egg donor</span>
                                </label>
                                <label className={`role-option ${form.role === 'donor' ? 'active' : ''}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="donor"
                                        checked={form.role === 'donor'}
                                        onChange={handleChange}
                                    />
                                    <span className="role-icon" style={{ overflow: 'hidden', borderRadius: '12px' }}><img src="/assets/avatars/donor_default.png" alt="Donor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
                                    <span className="role-label">Donor</span>
                                    <span className="role-desc">Willing to donate eggs</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    className="form-input"
                                    placeholder="Min 8 characters"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.password && <span className="form-error">{errors.password[0]}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input
                                    type="password"
                                    name="password_confirmation"
                                    className="form-input"
                                    placeholder="Confirm password"
                                    value={form.password_confirmation}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? 'Creating Account...' : <><IconRocket size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Create Account</>}
                        </button>
                    </form>

                    <div className="auth-trust-badges">
                        <span><IconLock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> 256-bit SSL</span>
                        <span><IconHospital size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> HIPAA Ready</span>
                        <span><IconFlag size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Made in Uganda</span>
                    </div>

                    <p className="auth-footer">
                        Already have an account? <Link to="/login">Sign In</Link>
                    </p>
                </div>

                {/* Slide indicators */}
                <div className="auth-slide-dots">
                    {BG_IMAGES.map((_, i) => (
                        <button
                            key={i}
                            className={`slide-dot ${i === currentBg ? 'active' : ''}`}
                            onClick={() => setCurrentBg(i)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
