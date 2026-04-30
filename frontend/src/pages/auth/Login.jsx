import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconDNA, IconHeartPulse, IconFlower, IconSparkles, IconMicroscope, IconLock, IconHospital, IconFlag } from '../../components/Icons';
import './Auth.css';

const BG_IMAGES = [
    '/images/auth/bg1.png',
    '/images/auth/bg2.png',
    '/images/auth/bg3.png',
];

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(form.email, form.password);
            navigate(`/${user.role}/dashboard`);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
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

            {/* Floating form card */}
            <div className="auth-overlay-content">
                <Link to="/" className="auth-back-btn">
                    ← Back to Home
                </Link>

                <div className="auth-glass-card">
                    <div className="auth-card-header">
                        <img src="/images/brand/logo.png" alt="EDRMS" className="auth-card-logo" />
                        <h1>Welcome Back</h1>
                        <p>Sign in to the EDRMS platform</p>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
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
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                            {loading ? 'Signing in...' : '🔐 Sign In'}
                        </button>
                    </form>

                    <div className="auth-trust-badges">
                        <span><IconLock size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> 256-bit SSL</span>
                        <span><IconHospital size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> HIPAA Ready</span>
                        <span><IconFlag size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Made in Uganda</span>
                    </div>

                    <p className="auth-footer">
                        Don't have an account? <Link to="/register">Create one</Link>
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
