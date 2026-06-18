import { Link } from 'react-router-dom';
import './Footer.css';

function FooterIcon({ name }) {
    const paths = {
        mail: 'M4 4h16v16H4V4zm0 4 8 5 8-5',
        phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 2 2.3z',
        shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        status: 'M3 12h4l3-8 4 16 3-8h4',
        arrow: 'M5 12h14m-6-6 6 6-6 6',
    };

    return (
        <svg className="footer-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer auth-footer">
            <div className="auth-footer-inner">
                <div className="auth-footer-brand">
                    <div className="footer-logo-shell">
                        <img src="/images/brand/logo.png" alt="EDRMS" className="footer-logo-img" />
                    </div>
                    <div>
                        <strong>EDRMS</strong>
                        <span>Egg Donor-Recipient Match System</span>
                    </div>
                </div>

                <div className="auth-footer-links" aria-label="Footer links">
                    <Link to="/" className="auth-footer-link">
                        Home <FooterIcon name="arrow" />
                    </Link>
                    <a href="#privacy" className="auth-footer-link">Privacy</a>
                    <a href="#terms" className="auth-footer-link">Terms</a>
                    <a href="#support" className="auth-footer-link">Support</a>
                </div>

                <div className="auth-footer-contact">
                    <a href="mailto:support@edrms.ug"><FooterIcon name="mail" /> support@edrms.ug</a>
                    <a href="tel:+256700000000"><FooterIcon name="phone" /> +256 700 000 000</a>
                </div>
            </div>

            <div className="auth-footer-bottom">
                <span>&copy; {currentYear} EDRMS. All rights reserved.</span>
                <span><FooterIcon name="shield" /> Secure reproductive healthcare workflows</span>
                <span><FooterIcon name="status" /> System online</span>
            </div>
        </footer>
    );
}
