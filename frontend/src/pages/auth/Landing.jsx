import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

/* ── Floating Particle System ── */
function Particles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 0.8;
                this.speedY = (Math.random() - 0.5) * 0.8;
                this.opacity = Math.random() * 0.5 + 0.1;
                this.hue = Math.random() * 60 + 230; // blue-purple range
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                    this.reset();
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${this.hue}, 80%, 70%, ${this.opacity})`;
                ctx.fill();
            }
        }

        for (let i = 0; i < 80; i++) particles.push(new Particle());

        const drawConnections = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(139, 92, 246, ${0.15 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            drawConnections();
            animId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} className="landing-particles" />;
}

/* ── Animated Counter (bold + visible) ── */
function AnimCounter({ target, suffix = '', label = '' }) {
    const [count, setCount] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !hasAnimated) {
                setHasAnimated(true);
                const duration = 2500;
                const startTime = performance.now();
                const step = (now) => {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 4);
                    setCount(Math.round(eased * target));
                    if (progress < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
                observer.disconnect();
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, hasAnimated]);

    return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{count}{suffix}</span>;
}

/* ── Feature Card ── */
function FeatureCard({ icon, image, title, desc, delay }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setVisible(true); observer.disconnect(); }
        }, { threshold: 0.2 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={`landing-feature-card ${visible ? 'visible' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
            <div className="feature-card-icon">
                {image ? <img src={image} alt={title} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 10 }} /> : icon}
            </div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <div className="feature-card-glow" />
        </div>
    );
}

/* ── Role Preview Card ── */
function RoleCard({ icon, image, title, desc, color, delay }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            className={`landing-role-card ${hovered ? 'hovered' : ''}`}
            style={{ '--role-color': color, animationDelay: `${delay}ms` }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="role-card-icon" style={image ? { overflow: 'hidden', borderRadius: '50%', background: `${color}20` } : {}}>
                {image ? <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : icon}
            </div>
            <h4>{title}</h4>
            <p>{desc}</p>
        </div>
    );
}

/* ── Main Landing Page ── */
export default function Landing() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="landing-page">
            {/* ── Background Image Slider (pushed behind overlay) ── */}
            <div className="hero-visual">
                <div className="hero-image-slider">
                    <div className="hero-image-track">
                        <div className="hero-img-wrapper"><img src="/images/hero/1.png" alt="Medical team" className="hero-img" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/3.png" alt="Doctor" className="hero-img" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/4.png" alt="Happy couple" className="hero-img" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/2.png" alt="Happy family" className="hero-img" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/1.png" alt="Medical team" className="hero-img" aria-hidden="true" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/3.png" alt="Doctor" className="hero-img" aria-hidden="true" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/4.png" alt="Happy couple" className="hero-img" aria-hidden="true" /></div>
                        <div className="hero-img-wrapper"><img src="/images/hero/2.png" alt="Happy family" className="hero-img" aria-hidden="true" /></div>
                    </div>
                </div>
            </div>

            <Particles />

            {/* ── Hero Section ── */}
            <section className="landing-hero">
                <div className="hero-content" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
                    <div className="hero-badge">🧬 Egg Donor–Recipient Match System</div>
                    <h1 className="hero-title">
                        <span className="hero-title-line">Connecting</span>
                        <span className="hero-title-gradient">Donors & Recipients</span>
                        <span className="hero-title-line">with Intelligence</span>
                    </h1>
                    <p className="hero-description">
                        A secure, clinician-reviewed platform automating egg donor–recipient matching
                        in Uganda. Powered by multi-criteria decision analysis for transparent,
                        ethical, and intelligent pairings.
                    </p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn-hero-primary">
                            <span>Get Started</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/login" className="btn-hero-secondary">
                            Sign In
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <div className="hero-stat-value">24/7</div>
                            <div className="hero-stat-label">System Uptime</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features Section ── */}
            <section className="landing-features">
                <div className="section-header">
                    <span className="section-badge">Features</span>
                    <h2>Everything You Need</h2>
                    <p>A comprehensive platform designed for every stakeholder in the egg donation process.</p>
                </div>
                <div className="features-grid">
                    <FeatureCard image="/assets/landing/features/security.png" title="Data Protection" desc="HIPAA-compliant encryption and role-based access control safeguard all sensitive medical data." delay={0} />
                    <FeatureCard image="/assets/landing/features/matching.png" title="Smart Matching" desc="Multi-criteria decision analysis engine matches donors and recipients based on medical, genetic, and preference factors." delay={100} />
                    <FeatureCard image="/assets/landing/features/consent.png" title="Consent Management" desc="Digital consent workflows with full audit trails ensure ethical compliance and transparent record-keeping." delay={200} />
                    <FeatureCard image="/assets/landing/features/clinician.png" title="Clinician Oversight" desc="Every match is reviewed and approved by qualified clinicians before being finalized." delay={300} />
                    <FeatureCard image="/assets/landing/features/analytics.png" title="Real-time Analytics" desc="Live dashboards and reporting tools give administrators complete system visibility." delay={400} />
                    <FeatureCard image="/assets/landing/features/accessibility.png" title="Accessibility" desc="Designed for Ugandan fertility clinics with internationalization support and mobile-first responsive design." delay={500} />
                </div>
            </section>

            {/* ── Roles Section ── */}
            <section className="landing-roles">
                <div className="section-header">
                    <span className="section-badge">User Roles</span>
                    <h2>Built for Everyone</h2>
                    <p>Four distinct interfaces tailored to each user's needs.</p>
                </div>
                <div className="roles-grid">
                    <RoleCard image="/assets/landing/roles/donor.png" title="Egg Donor" desc="Register your profile, manage consents, and track your donation journey." color="#ec4899" delay={0} />
                    <RoleCard image="/assets/landing/roles/recipient.png" title="Recipient" desc="Set your preferences, view matched donors, and track your matching progress." color="#8b5cf6" delay={150} />
                    <RoleCard image="/assets/landing/roles/clinician.png" title="Clinician" desc="Review donor profiles, approve matches, and oversee the entire matching process." color="#06b6d4" delay={300} />
                    <RoleCard image="/assets/landing/roles/admin.png" title="Administrator" desc="Manage users, configure matching weights, and monitor system-wide analytics." color="#f59e0b" delay={450} />
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="landing-how">
                <div className="section-header">
                    <span className="section-badge">Process</span>
                    <h2>How It Works</h2>
                    <p>A streamlined journey from registration to match.</p>
                </div>
                <div className="how-steps">
                    {[
                        { num: '01', title: 'Register', desc: 'Create your account and select your role in the system.', icon: '📝' },
                        { num: '02', title: 'Build Profile', desc: 'Fill in medical, genetic, and personal details for accurate matching.', icon: '🧪' },
                        { num: '03', title: 'Consent', desc: 'Digitally sign and manage consent forms with full transparency.', icon: '✅' },
                        { num: '04', title: 'Match', desc: 'Our MCDA engine generates scored matches for clinician review.', icon: '🔗' },
                    ].map((step, i) => (
                        <div key={i} className="how-step" style={{ animationDelay: `${i * 200}ms` }}>
                            <div className="how-step-number">{step.num}</div>
                            <div className="how-step-icon">{step.icon}</div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                            {i < 3 && <div className="how-step-connector" />}
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA Section ── */}
            <section className="landing-cta">
                <div className="cta-content">
                    <h2>Ready to Get Started?</h2>
                    <p>Join EDRMS today and be part of Uganda's leading egg donation matching platform.</p>
                    <div className="cta-actions">
                        <Link to="/register" className="btn-hero-primary">
                            <span>Create Account</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </Link>
                        <Link to="/login" className="btn-hero-secondary">
                            Sign In Instead
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-top">
                        <div className="footer-brand">
                            <img src="/images/brand/logo.png" alt="EDRMS" style={{ height: 36, borderRadius: 8, objectFit: 'contain' }} />
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>EDRMS</span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.88rem', maxWidth: 320, lineHeight: 1.6 }}>
                            Uganda's leading egg donor–recipient matching platform. Connecting donors, recipients, and clinicians with intelligent, ethical matching.
                        </p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-col">
                            <h4>Platform</h4>
                            <Link to="/register">Get Started</Link>
                            <Link to="/login">Sign In</Link>
                        </div>
                        <div className="footer-col">
                            <h4>Roles</h4>
                            <span>Donors</span>
                            <span>Recipients</span>
                            <span>Clinicians</span>
                        </div>
                        <div className="footer-col">
                            <h4>Security</h4>
                            <span>HIPAA Compliant</span>
                            <span>256-bit SSL</span>
                            <span>Audit Logging</span>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 Egg Donor–Recipient Match System. Built with ❤ for Ugandan fertility clinics.</p>
                </div>
            </footer>
        </div>
    );
}
