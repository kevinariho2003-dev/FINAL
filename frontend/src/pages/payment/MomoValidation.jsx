import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import './MomoValidation.css';

export default function MomoValidation() {
    const [searchParams] = useSearchParams();
    const txRef = searchParams.get('tx_ref') || '';
    const amountStr = searchParams.get('amount') || '500000';
    const paymentId = searchParams.get('payment_id') || '';

    const DIGITS = 6;
    const [digits, setDigits] = useState(Array(DIGITS).fill(''));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Auto focus first input
        inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (v, index) => {
        const val = v.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = val;
        setDigits(next);

        if (val && index < DIGITS - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            const next = [...digits];
            next[index - 1] = '';
            setDigits(next);
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < DIGITS - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
        const next = Array(DIGITS).fill('');
        for (let i = 0; i < pasted.length; i++) {
            next[i] = pasted[i];
        }
        setDigits(next);
        inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
    };

    const processPayment = (otpString) => {
        if (otpString.length !== DIGITS) {
            setError('Please enter all 6 digits.');
            return;
        }

        setError(null);
        setLoading(true);

        // Simulate secure verification process before redirecting to callback
        setTimeout(() => {
            const mockTxId = `mock-flw-${Math.floor(10000000 + Math.random() * 90000000)}`;
            const callbackUrl = `${api.defaults.baseURL}/payments/callback?status=successful&tx_ref=${txRef}&transaction_id=${mockTxId}`;
            window.location.href = callbackUrl;
        }, 2000);
    };

    const handleVerify = () => processPayment(digits.join(''));

    const handleCancel = () => {
        const callbackUrl = `${api.defaults.baseURL}/payments/callback?status=cancelled&tx_ref=${txRef}`;
        window.location.href = callbackUrl;
    };

    const formattedAmount = Number(amountStr).toLocaleString();

    return (
        <div className="flw-momo-container">
            <div className="flw-momo-card">
                {/* Brand Header */}
                <div className="flw-momo-header">
                    <div className="flw-brand">
                        <span className="flw-brand-accent">flutter</span>wave
                    </div>
                    <div className="flw-security">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Secured Payment
                    </div>
                </div>

                {/* Amount Row */}
                <div className="flw-momo-summary">
                    <div className="flw-summary-label">EDRMS Donor Compensation</div>
                    <div className="flw-summary-amount">UGX {formattedAmount}</div>
                    <div className="flw-summary-ref">Ref: {txRef || 'PAY-SIMULATION'}</div>
                </div>

                {/* Mobile Money Provider */}
                <div className="flw-momo-provider">
                    <div className="flw-momo-network">
                        <div className="flw-network-badge mtn">
                            <span>MTN</span>
                        </div>
                        <div className="flw-network-badge airtel">
                            <span>airtel</span>
                        </div>
                    </div>
                    <span className="flw-momo-type">Mobile Money Uganda</span>
                </div>

                {/* Prompt Info */}
                <div className="flw-momo-prompt">
                    <p>
                        Please enter the MOMO validation OTP sent to you via SMS and Whatsapp to complete this transaction.
                    </p>
                    <div className="flw-secured-label">Secured by Flutterwave</div>
                </div>

                {/* OTP Digits Grid */}
                <div className="flw-momo-otp-area">
                    <label className="flw-otp-label">Enter 6-Digit OTP</label>
                    <div className="flw-digits-grid">
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                type="text"
                                maxLength="1"
                                className="flw-digit-input"
                                value={d}
                                onChange={e => handleChange(e.target.value, i)}
                                onKeyDown={e => handleKeyDown(e, i)}
                                onPaste={handlePaste}
                                ref={el => inputRefs.current[i] = el}
                                disabled={loading}
                            />
                        ))}
                    </div>
                    {error && <div className="flw-error">{error}</div>}

                    {/* Developer Peek */}
                    <div className="flw-dev-peek">
                        <span>💡 Sandbox Code: <strong>123456</strong> (click to autofill)</span>
                        <button
                            type="button"
                            className="flw-peek-btn"
                            onClick={() => {
                                setDigits(['1', '2', '3', '4', '5', '6']);
                            }}
                            disabled={loading}
                        >
                            Autofill Code
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flw-momo-actions">
                    <button
                        className="flw-btn flw-btn-pay"
                        onClick={handleVerify}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="flw-spinner-container">
                                <span className="flw-spinner"></span>
                                Authenticating...
                            </div>
                        ) : (
                            `Authorize Payment`
                        )}
                    </button>
                    <button
                        className="flw-btn flw-btn-cancel"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        Cancel Transaction
                    </button>
                </div>

                {/* Footer terms */}
                <div className="flw-momo-footer">
                    By clicking Authorize, you agree to Flutterwave's terms of service.
                </div>
            </div>
        </div>
    );
}
