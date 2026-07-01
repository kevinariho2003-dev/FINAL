import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconDNA, IconHeartPulse, IconFlower, IconSparkles, IconMicroscope } from '../../components/Icons';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import './Auth.css';

const BG_IMAGES = [
    '/images/auth/bg1.png',
    '/images/auth/bg2.png',
    '/images/auth/bg3.png',
];

export default function Login() {
    const { login, setUserFromToken } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentBg, setCurrentBg] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [forgotStatus, setForgotStatus] = useState('');

    // OTP verification states
    const [showOtp, setShowOtp] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const DIGITS = 6;
    const [digits, setDigits] = useState(Array(DIGITS).fill(''));
    const [resendCooldown, setResendCooldown] = useState(60);
    const [resending, setResending] = useState(false);
    const [devOtp, setDevOtp] = useState(null);
    const [showDevTip, setShowDevTip] = useState(false);
    const inputRefs = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentBg(prev => (prev + 1) % BG_IMAGES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (showOtp) {
            setResendCooldown(60);
            timerRef.current = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        }
        
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [showOtp]);

    const resetCooldown = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setResendCooldown(60);
        timerRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(form.email, form.password);
            if (res && res.requires_otp) {
                setOtpEmail(res.email || form.email);
                setShowOtp(true);
            } else {
                navigate(`/${res.role}/dashboard`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setShowOtp(false);
        setShowForgot(false);
        setForgotStatus('');
        setError('');
        setDigits(Array(DIGITS).fill(''));
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        if (!form.email) {
            setError('Please enter your email address to recover your password.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: form.email }).catch(() => {});
            setForgotStatus('sent');
        } finally {
            setLoading(false);
        }
    };

    const handleDigitChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const v = value.slice(-1);
        const next = [...digits];
        next[index] = v;
        setDigits(next);
        setError('');
        if (v && index < DIGITS - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < DIGITS - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
        if (!pasted) return;
        const next = Array(DIGITS).fill('');
        pasted.split('').forEach((ch, i) => {
            next[i] = ch;
        });
        setDigits(next);
        inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
    };

    const handleVerify = async () => {
        const otp = digits.join('');
        if (otp.length !== DIGITS) {
            setError('Please enter all 6 digits.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/verify-otp', { email: otpEmail, otp });
            const { user, token } = res.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUserFromToken(user);
            navigate(`/${user.role}/dashboard`);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
            setDigits(Array(DIGITS).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setResending(true);
        setError('');
        try {
            await api.post('/auth/resend-otp', { email: otpEmail });
            resetCooldown();
            setDigits(Array(DIGITS).fill(''));
            setDevOtp(null);
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not resend. Try again.');
        } finally {
            setResending(false);
        }
    };

    const fetchDevOtp = async () => {
        try {
            const res = await api.get('/auth/dev/otp', { params: { email: otpEmail } });
            const code = res.data.otp;
            setDevOtp(code);
            setDigits(code.split(''));
            inputRefs.current[DIGITS - 1]?.focus();
        } catch {
            setDevOtp('Error');
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setError('');
            setLoading(true);
            try {
                // Send the access_token to our backend
                const res = await api.post('/auth/google', { token: tokenResponse.access_token });
                if (res.data && res.data.requires_otp) {
                    setOtpEmail(res.data.email);
                    setShowOtp(true);
                } else {
                    const { user, token } = res.data;
                    localStorage.setItem('auth_token', token);
                    localStorage.setItem('user', JSON.stringify(user));
                    setUserFromToken(user);
                    navigate(`/${user.role}/dashboard`);
                }
            } catch (err) {
                if (err.response?.status === 404 && err.response?.data?.email) {
                    // Redirect to register, pre-filling email if possible
                    navigate('/register', { state: { googleEmail: err.response.data.email } });
                } else {
                    setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        },
        onError: () => {
            setError('Google sign-in was cancelled or failed.');
        }
    });

    const handleGoogle = () => {
        loginWithGoogle();
    };

    return (
        <div className="auth-fullscreen">
            <div className="auth-bg-slideshow">
                {BG_IMAGES.map((img, i) => (
                    <div
                        key={i}
                        className={`auth-bg-slide ${i === currentBg ? 'active' : ''}`}
                        style={{ backgroundImage: `url(${img})` }}
                    />
                ))}
                <div className="auth-bg-overlay" />
                <div className="auth-float-shapes">
                    <div className="float-shape shape-1"><IconDNA size={28} color="rgba(139,92,246,0.7)" /></div>
                    <div className="float-shape shape-2"><IconHeartPulse size={28} color="rgba(168,85,247,0.7)" /></div>
                    <div className="float-shape shape-3"><IconFlower size={28} color="rgba(236,72,153,0.7)" /></div>
                    <div className="float-shape shape-4"><IconSparkles size={26} color="rgba(251,191,36,0.7)" /></div>
                    <div className="float-shape shape-5"><IconMicroscope size={28} color="rgba(34,211,238,0.7)" /></div>
                </div>
            </div>

            <div className="auth-split-shell auth-login-shell">
                <aside className="auth-split-copy">
                    <img src="/images/brand/logo.png" alt="EDRMS" className="auth-split-logo" />
                    <span className="auth-split-kicker">Welcome back</span>
                    <h1>Continue your fertility matching journey.</h1>
                    <p>
                        Sign in to manage profiles, review matches, complete forms, and track your
                        EDRMS dashboard.
                    </p>
                    <div className="auth-split-points">
                        <span>Role-aware dashboards</span>
                        <span>Saved matching progress</span>
                        <span>Clinician and admin workflows</span>
                    </div>
                    <p className="auth-split-switch">New here? <Link to="/register">Create an account</Link></p>
                </aside>

                <main className="auth-split-panel">
                    <div className="auth-flow-card auth-login-card">
                        {showForgot ? (
                            <div className="otp-active-panel" style={{ padding: '2rem' }}>
                                <div className="otp-header">
                                    <div className="otp-icon-ring" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                                        <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', stroke: 'currentColor', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                            <path d="M12 17v-3m-5-3V7a5 5 0 0 1 10 0v4m-12 0h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z" />
                                        </svg>
                                    </div>
                                    <h2>Recover Password</h2>
                                    <p>Enter the email address you used to register. We will send you a secure link to reset your password.</p>
                                </div>
                                {forgotStatus === 'sent' ? (
                                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: '8px', color: '#065f46', marginBottom: '1.5rem' }}>
                                            <strong>✓ Recovery link sent!</strong>
                                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>Please check your inbox (and spam folder) for further instructions.</p>
                                        </div>
                                        <button className="btn btn-primary btn-block" onClick={handleBack}>Return to Login</button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleForgot} className="auth-wizard-form" style={{ marginTop: '1.5rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Email Address</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="you@example.com"
                                                value={form.email}
                                                onChange={handleChange}
                                                name="email"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        {error && <div className="alert alert-error">{error}</div>}
                                        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                                            {loading ? 'Sending link...' : 'Send Recovery Link'}
                                        </button>
                                        <button type="button" className="otp-back-btn" onClick={handleBack} style={{ marginTop: '1rem' }}>
                                            ← Back to Login
                                        </button>
                                    </form>
                                )}
                            </div>
                        ) : !showOtp ? (
                            <>
                                <div className="auth-card-header auth-flow-header">
                                    <img src="/images/brand/logo.png" alt="EDRMS" className="auth-card-logo" />
                                    <div>
                                        <h1>Sign In</h1>
                                        <p>Use your email and password to access your account.</p>
                                    </div>
                                </div>

                                {error && <div className="alert alert-error">{error}</div>}

                                <button type="button" className="google-auth-btn google-auth-btn-full" onClick={handleGoogle}>
                                    <span>G</span> Sign in with Google
                                </button>

                                <div className="auth-divider"><span>or</span></div>

                                <form onSubmit={handleSubmit} className="auth-wizard-form">
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                                            <button 
                                                type="button" 
                                                onClick={() => { setShowForgot(true); setError(''); }}
                                                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="password-input-wrap">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                className="form-input"
                                                placeholder="Enter your password"
                                                value={form.password}
                                                onChange={handleChange}
                                                required
                                            />
                                            <button type="button" onClick={() => setShowPassword(show => !show)}>
                                                {showPassword ? 'Hide' : 'Show'}
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                                        {loading ? 'Signing in...' : 'Sign In'}
                                    </button>
                                </form>

                                <p className="auth-footer">
                                    Don't have an account? <Link to="/register">Create one</Link>
                                </p>
                            </>
                        ) : (
                            <div className="otp-active-panel otp-verify-panel">
                                <div className="otp-header">
                                    <div className="otp-icon-ring"><span>✉️</span></div>
                                    <h2>2-Step Verification</h2>
                                    <p>A 6-digit verification code has been sent to your email:</p>
                                    <div className="otp-email-chip">{otpEmail}</div>
                                </div>

                                <div className="otp-inputs" onPaste={handlePaste}>
                                    {digits.map((d, i) => (
                                        <input key={i}
                                            ref={el => inputRefs.current[i] = el}
                                            type="text" inputMode="numeric" maxLength={1}
                                            className={`otp-digit ${d ? 'filled' : ''} ${error ? 'has-error' : ''}`}
                                            value={d}
                                            onChange={e => handleDigitChange(i, e.target.value)}
                                            onKeyDown={e => handleKeyDown(i, e)}
                                            autoComplete="off"
                                            id={`otp-digit-${i}`}
                                        />
                                    ))}
                                </div>

                                {error && <div className="otp-error"><span>⚠️</span> {error}</div>}

                                <button className="btn btn-primary btn-block otp-verify-btn"
                                    disabled={digits.join('').length !== DIGITS || loading} onClick={handleVerify}>
                                    {loading ? <><span className="otp-spinner" /> Verifying...</> : 'Verify & Sign In'}
                                </button>

                                <div className="otp-resend-row">
                                    <span className="otp-resend-label">Didn't receive it?</span>
                                    {resendCooldown > 0
                                        ? <span className="otp-resend-timer">Resend in <strong>{resendCooldown}s</strong></span>
                                        : <button className="otp-resend-btn" onClick={handleResend} disabled={resending}>
                                            {resending ? 'Sending...' : '🔄 Resend Code'}
                                          </button>
                                    }
                                </div>

                                <div className="otp-dev-section">
                                    <button className="otp-dev-toggle" onClick={() => setShowDevTip(v => !v)}>
                                        🧪 Dev mode
                                    </button>
                                    {showDevTip && (
                                        <div className="otp-dev-box">
                                            <p>Mail is set to <code>log</code> — click to auto-fill from server.</p>
                                            <button className="otp-dev-peek-btn" onClick={fetchDevOtp}>
                                                🔍 Peek OTP &amp; Auto-fill
                                            </button>
                                            {devOtp && <div className="otp-dev-result">Code: <strong>{devOtp}</strong> (auto-filled ↑)</div>}
                                        </div>
                                    )}
                                </div>

                                <button className="otp-back-btn" onClick={handleBack}>← Go back to login</button>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
