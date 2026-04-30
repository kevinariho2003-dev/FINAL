import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (email.trim()) {
            setSubscribed(true);
            setEmail('');
            setTimeout(() => setSubscribed(false), 3000);
        }
    };

    return (
        <footer className="app-footer">
            {/* ── Newsletter CTA Bar ── */}
            <div className="footer-newsletter">
                <div className="footer-newsletter-inner">
                    <h3 className="footer-newsletter-heading">
                        Want to receive news and updates?
                    </h3>
                    <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
                        <input
                            type="email"
                            className="footer-newsletter-input"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" className="footer-newsletter-btn">
                            {subscribed ? '✓ Subscribed!' : 'Stay in the loop'}
                        </button>
                    </form>
                </div>
                {/* Accent divider */}
                <div className="footer-accent-divider"></div>
            </div>

            {/* ── Main Footer Grid ── */}
            <div className="footer-main">
                <div className="footer-container">
                    {/* Brand Column */}
                    <div className="footer-brand">
                        <div className="footer-logo-row">
                            <img src="/images/brand/logo.png" alt="EDRMS" className="footer-logo-img" />
                            <span className="footer-brand-name">EDRMS</span>
                        </div>
                        <p className="footer-tagline">
                            Connecting Dreams,<br />
                            Building Families
                        </p>
                        <div className="footer-contact-info">
                            <span>+256 700 000 000</span>
                            <span>support@edrms.ug</span>
                        </div>
                        {/* Social Icons */}
                        <div className="footer-social-icons">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Facebook">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                                </svg>
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="Instagram">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                                </svg>
                            </a>
                            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer-social-icon" aria-label="YouTube">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z" />
                                    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#1a1a2e" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Platform Column */}
                    <div className="footer-links-group">
                        <h4 className="footer-heading">Platform</h4>
                        <ul className="footer-links">
                            <li><Link to="/">Home</Link></li>
                            <li><Link to="/login">Login</Link></li>
                            <li><Link to="/register">Register</Link></li>
                        </ul>
                    </div>

                    {/* Features Column */}
                    <div className="footer-links-group">
                        <h4 className="footer-heading">Features</h4>
                        <ul className="footer-links">
                            <li><a href="#donors">Donors</a></li>
                            <li><a href="#recipients">Recipients</a></li>
                            <li><a href="#matching">Matching</a></li>
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div className="footer-links-group">
                        <h4 className="footer-heading">Resources</h4>
                        <ul className="footer-links">
                            <li><a href="#privacy">Privacy Policy</a></li>
                            <li><a href="#terms">Terms of Service</a></li>
                            <li><a href="#support">Support</a></li>
                        </ul>
                    </div>

                    {/* Social Column */}
                    <div className="footer-links-group">
                        <h4 className="footer-heading">Social</h4>
                        <ul className="footer-links">
                            <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
                            <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                            <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ── Bottom Bar ── */}
            <div className="footer-bottom">
                <p>&copy; {currentYear} EDRMS. All rights reserved.</p>
                <p className="footer-credit">Built with ❤️ for reproductive healthcare in Uganda</p>
            </div>
        </footer>
    );
}
