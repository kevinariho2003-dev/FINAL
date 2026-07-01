import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IconDNA, IconHeartPulse, IconFlower, IconSparkles, IconMicroscope, IconRocket } from '../../components/Icons';
import api from '../../services/api';
import './Auth.css';

const BG_IMAGES = [
    '/images/auth/bg1.png',
    '/images/auth/bg2.png',
    '/images/auth/bg3.png',
];

// ─── Step 1: Registration Form ────────────────────────────────────────────────
function PasswordChecklist({ password, confirmation }) {
    const checks = [
        { label: 'At least 8 characters', valid: password.length >= 8 },
        { label: 'Uppercase and lowercase letters', valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
        { label: 'At least one number', valid: /\d/.test(password) },
        { label: 'Special character', valid: /[^A-Za-z0-9]/.test(password) },
        { label: 'Passwords match', valid: password.length > 0 && password === confirmation },
    ];
    const score = checks.filter(check => check.valid).length;

    return (
        <div className="password-meter">
            <div className="password-meter-track">
                <span style={{ width: `${(score / checks.length) * 100}%` }} />
            </div>
            <div className="password-meter-label">
                {score < 3 ? 'Weak password' : score < 5 ? 'Almost there' : 'Strong password'}
            </div>
            <div className="password-checks">
                {checks.map(check => (
                    <span key={check.label} className={check.valid ? 'valid' : ''}>
                        {check.valid ? 'OK' : '--'} {check.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function RegistrationForm({ onOtpSent, initialEmail }) {
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: initialEmail || '',
        phone: '', role: 'recipient',
        password: '', password_confirmation: '',
    });
    const [formStep, setFormStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState({});
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setErrors({}); setLoading(true);
        try {
            await api.post('/register', form);
            onOtpSent(form.email);
        } catch (err) {
            if (err.response?.data?.errors) setErrors(err.response.data.errors);
            else setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally { setLoading(false); }
    };

    const steps = ['Role', 'Details', 'Password'];
    const passwordReady =
        form.password.length >= 8 &&
        /[A-Z]/.test(form.password) &&
        /[a-z]/.test(form.password) &&
        /\d/.test(form.password) &&
        /[^A-Za-z0-9]/.test(form.password) &&
        form.password === form.password_confirmation;

    const canContinue = () => {
        if (formStep === 0) return Boolean(form.role);
        if (formStep === 1) return form.first_name.trim() && form.last_name.trim() && form.email.trim();
        return passwordReady;
    };

    const nextStep = () => {
        setError('');
        if (!canContinue()) {
            setError(formStep === 1 ? 'Please enter your name and email before continuing.' : 'Please complete this step before continuing.');
            return;
        }
        setFormStep(step => Math.min(step + 1, steps.length - 1));
    };

    const handleWizardSubmit = (e) => {
        e.preventDefault();
        if (formStep < steps.length - 1) {
            nextStep();
            return;
        }
        handleSubmit(e);
    };

    return (
        <div className="auth-flow-card">
            <div className="auth-card-header auth-flow-header">
                <div>
                    <h1>Create Account</h1>
                    <p>Choose your path, add your details, then create a password.</p>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleWizardSubmit} className="auth-wizard-form">
                {formStep === 0 && (
                    <div className="wizard-panel">
                        <div className="wizard-panel-copy">
                            <h2>What brings you here?</h2>
                            <p>Pick the option that best describes you. You can continue after choosing one.</p>
                        </div>
                        <div className="role-selector role-selector-modern">
                            <label className={`role-option ${form.role === 'recipient' ? 'active' : ''}`}>
                                <input type="radio" name="role" value="recipient" checked={form.role === 'recipient'} onChange={handleChange} />
                                <span className="role-icon">
                                    <img src="/assets/avatars/recipient_default.png" alt="Recipient" />
                                </span>
                                <span className="role-label">Recipient</span>
                                <span className="role-desc">I am looking for an egg donor</span>
                            </label>
                            <label className={`role-option ${form.role === 'donor' ? 'active' : ''}`}>
                                <input type="radio" name="role" value="donor" checked={form.role === 'donor'} onChange={handleChange} />
                                <span className="role-icon">
                                    <img src="/assets/avatars/donor_default.png" alt="Donor" />
                                </span>
                                <span className="role-label">Donor</span>
                                <span className="role-desc">I want to become an egg donor</span>
                            </label>
                        </div>
                    </div>
                )}

                {formStep === 1 && (
                    <div className="wizard-panel wizard-panel-single">
                        <div className="wizard-fields">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input type="text" name="first_name" className="form-input" placeholder="First name" value={form.first_name} onChange={handleChange} required />
                                    {errors.first_name && <span className="form-error">{errors.first_name[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input type="text" name="last_name" className="form-input" placeholder="Last name" value={form.last_name} onChange={handleChange} required />
                                    {errors.last_name && <span className="form-error">{errors.last_name[0]}</span>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email Address</label>
                                    <input type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                                    {errors.email && <span className="form-error">{errors.email[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone Number</label>
                                    <input type="text" name="phone" className="form-input" placeholder="+256 7XX XXX XXX" value={form.phone} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {formStep === 2 && (
                    <div className="wizard-panel">
                        <div className="wizard-panel-copy">
                            <h2>Create your password</h2>
                            <p>Choose a password that is easy for you to remember and hard for others to guess.</p>
                            <PasswordChecklist password={form.password} confirmation={form.password_confirmation} />
                        </div>
                        <div className="wizard-fields">
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div className="password-input-wrap">
                                    <input type={showPassword ? 'text' : 'password'} name="password" className="form-input" placeholder="Create a strong password" value={form.password} onChange={handleChange} required />
                                    <button type="button" onClick={() => setShowPassword(show => !show)}>{showPassword ? 'Hide' : 'Show'}</button>
                                </div>
                                {errors.password && <span className="form-error">{errors.password[0]}</span>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <div className="password-input-wrap">
                                    <input type={showConfirm ? 'text' : 'password'} name="password_confirmation" className="form-input" placeholder="Repeat your password" value={form.password_confirmation} onChange={handleChange} required />
                                    <button type="button" onClick={() => setShowConfirm(show => !show)}>{showConfirm ? 'Hide' : 'Show'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="wizard-actions">
                    {formStep > 0 && <button type="button" className="btn-step-secondary" onClick={() => setFormStep(step => step - 1)}>Back</button>}
                    {formStep < steps.length - 1 ? (
                        <button type="button" className="btn btn-primary btn-lg" onClick={nextStep}>Continue</button>
                    ) : (
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading || !passwordReady}>
                            {loading ? <><span className="otp-spinner" /> Sending verification code...</> : <><IconRocket size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Create Account</>}
                        </button>
                    )}
                </div>
            </form>

        </div>
    );
}

// ─── Step 2: OTP Verification Panel ──────────────────────────────────────────
function OtpVerifyPanel({ email, onBack, onSuccess }) {
    const DIGITS = 6;
    const [digits, setDigits]         = useState(Array(DIGITS).fill(''));
    const [error, setError]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [resendCooldown, setResendCooldown] = useState(60);
    const [resending, setResending]   = useState(false);
    const [devOtp, setDevOtp]         = useState(null);
    const [showDevTip, setShowDevTip] = useState(false);
    const inputRefs = useRef([]);
    const timerRef  = useRef(null);

    useEffect(() => {
        timerRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, []);

    useEffect(() => { setTimeout(() => inputRefs.current[0]?.focus(), 100); }, []);

    const resetCooldown = () => {
        clearInterval(timerRef.current);
        setResendCooldown(60);
        timerRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleDigitChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const v = value.slice(-1);
        const next = [...digits];
        next[index] = v;
        setDigits(next);
        setError('');
        if (v && index < DIGITS - 1) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowLeft'  && index > 0)          inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < DIGITS - 1) inputRefs.current[index + 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
        if (!pasted) return;
        const next = Array(DIGITS).fill('');
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
    };

    const otp = digits.join('');
    const isComplete = otp.length === DIGITS;

    const handleVerify = async () => {
        if (!isComplete) { setError('Please enter all 6 digits.'); return; }
        setLoading(true); setError('');
        try {
            const res = await api.post('/auth/verify-otp', { email, otp });
            const { user, token } = res.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            onSuccess(user);
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed.');
            setDigits(Array(DIGITS).fill(''));
            inputRefs.current[0]?.focus();
        } finally { setLoading(false); }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setResending(true); setError('');
        try {
            await api.post('/auth/resend-otp', { email });
            resetCooldown();
            setDigits(Array(DIGITS).fill(''));
            setDevOtp(null);
            inputRefs.current[0]?.focus();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not resend. Try again.');
        } finally { setResending(false); }
    };

    const fetchDevOtp = async () => {
        try {
            const res = await api.get('/auth/dev/otp', { params: { email } });
            const code = res.data.otp;
            setDevOtp(code);
            setDigits(code.split(''));
            inputRefs.current[DIGITS - 1]?.focus();
        } catch { setDevOtp('Error'); }
    };

    return (
        <div className="otp-active-panel otp-verify-panel">
            <div className="otp-header">
                <div className="otp-icon-ring"><span>✉️</span></div>
                <h2>Check your email</h2>
                <p>We sent a 6-digit verification code to</p>
                <div className="otp-email-chip">{email}</div>
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
                disabled={!isComplete || loading} onClick={handleVerify}>
                {loading ? <><span className="otp-spinner" /> Verifying...</> : '✅ Verify Email & Create Account'}
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

            <button className="otp-back-btn" onClick={onBack}>← Change email address</button>
        </div>
    );
}

// ─── Main Register Component ──────────────────────────────────────────────────
export default function Register() {
    const { setUserFromToken } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const initialEmail = location.state?.googleEmail || '';
    
    const [step, setStep]         = useState('form');  // 'form' | 'otp'
    const [slideDir, setSlideDir] = useState('right'); // direction of incoming panel
    const [pendingEmail, setPendingEmail] = useState('');
    const [currentBg, setCurrentBg] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setCurrentBg(p => (p + 1) % BG_IMAGES.length), 5000);
        return () => clearInterval(id);
    }, []);

    const goToOtp = (email) => {
        setSlideDir('right');
        setPendingEmail(email);
        setStep('otp');
    };

    const goBack = () => {
        setSlideDir('left');
        setStep('form');
    };

    const handleSuccess = (user) => {
        setUserFromToken(user);
        navigate(`/${user.role}/dashboard`);
    };

    return (
        <div className="auth-fullscreen">
            {/* Background slideshow */}
            <div className="auth-bg-slideshow">
                {BG_IMAGES.map((img, i) => (
                    <div key={i}
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

            <div className="auth-split-shell">
                <aside className="auth-split-copy">
                    <div className="auth-brand-lockup auth-brand-lockup-stacked">
                        <img src="/images/brand/logo.png" alt="EDRMS" className="auth-split-logo" />
                        <span className="auth-split-kicker">Egg Donor-Recipient Match System</span>
                        <h1>Join a guided fertility matching platform.</h1>
                    </div>
                    <p>
                        Create your account in a few short steps. Choose whether you are here as a
                        recipient or donor, then add your details.
                    </p>
                    <p className="auth-split-switch">Already registered? <Link to="/login">Sign in</Link></p>
                </aside>

                <main className="auth-split-panel">
                    <div className="auth-panel-host">

                    {/* Step progress bar */}
                    <div className="otp-step-indicator">
                        <div className={`otp-step-dot ${step === 'form' ? 'active' : 'done'}`}>
                            {step === 'otp' ? '✓' : '1'}
                        </div>
                        <div className={`otp-step-line ${step === 'otp' ? 'active' : ''}`} />
                        <div className={`otp-step-dot ${step === 'otp' ? 'active' : ''}`}>2</div>
                        <span className="otp-step-label">
                            {step === 'form' ? 'Fill in your details' : 'Verify your email'}
                        </span>
                    </div>

                    {/* Only one panel renders at a time — slides in from the correct direction */}
                    <div className="otp-panel-host">
                        {step === 'form'
                            ? <div key="form" className={`otp-panel-anim slide-in-from-${slideDir === 'left' ? 'right' : 'left'}`}>
                                <RegistrationForm onOtpSent={goToOtp} initialEmail={initialEmail} />
                              </div>
                            : <div key="otp" className={`otp-panel-anim slide-in-from-${slideDir === 'right' ? 'right' : 'left'}`}>
                                <OtpVerifyPanel email={pendingEmail} onBack={goBack} onSuccess={handleSuccess} />
                              </div>
                        }
                    </div>
                </div>

                </main>
            </div>
        </div>
    );
}
