import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import AnimatedCounter from '../../components/AnimatedCounter';
import '../Dashboard.css';
import './ClinicianDashboard.css';

/* ── Subtle Particle System ── */
function ClinicianParticles() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);

        class Dot {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.25 + 0.05;
            }
            update() {
                this.x += this.speedX; this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(16, 185, 129, ${this.opacity})`;
                ctx.fill();
            }
        }
        for (let i = 0; i < 40; i++) particles.push(new Dot());

        const drawLines = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(16, 185, 129, ${0.06 * (1 - dist / 100)})`;
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
            drawLines();
            animId = requestAnimationFrame(animate);
        };
        animate();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={canvasRef} className="clinician-particles" />;
}

/* ── Inline SVG Icons ── */
const Icons = {
    clipboard: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        </svg>
    ),
    link: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    ),
    users: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    ),
    heart: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    ),
    folderOpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    ),
    search: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    ),
    checkCircle: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    arrowRight: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
    ),
    calendar: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    ),
    stethoscope: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z"/><path d="M10 13a7 7 0 0 0-7-7"/><path d="M10 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M10 15V3a2 2 0 0 0-4 0v1.5M10 19h2a6 6 0 0 0 6-6v-3.5"/><circle cx="18" cy="7" r="3"/>
        </svg>
    ),
    dna: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3c.5 0 2.5 1 2.5 3s-2.5 7.5-2.5 11 2 4 2.5 4"/><path d="M16 3c-.5 0-2.5 1-2.5 3s2.5 7.5 2.5 11-2 4-2.5 4"/><path d="M10.5 6h3"/><path d="M8 12h8"/><path d="M10.5 18h3"/>
        </svg>
    ),
};

export default function ClinicianDashboard() {
    const { user, setUser } = useAuth();
    const [stats, setStats] = useState({
        pendingConsultations: 0,
        pendingDonors: 0,
        scheduledAppointments: 0,
        matchesForReview: 0,
        eggRetrievals: 0,
        activeDonors: 0,
        activeRecipients: 0,
    });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            setUploading(true);
            const res = await api.post('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const updatedUser = res.data.user;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('Failed to upload image. Please ensure it is less than 5MB.');
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    useEffect(() => {
        const fetchAllStats = async () => {
            try {
                // Fetch each stat individually
                const [
                    consultationsRes,
                    donorApprovalsRes,
                    appointmentsRes,
                    matchesRes,
                    retrievalsRes,
                    activeDonorsRes,
                    recipientsRes
                ] = await Promise.allSettled([
                    api.get('/clinician/stats/pending-consultations'),
                    api.get('/clinician/stats/pending-donor-approvals'),
                    api.get('/clinician/stats/scheduled-appointments'),
                    api.get('/clinician/stats/matches-for-review'),
                    api.get('/clinician/stats/egg-retrievals'),
                    api.get('/clinician/stats/active-donors'),
                    api.get('/clinician/stats/active-recipients')
                ]);

                // Helper function to get count from response
                const getCount = (result, defaultValue = 0) => {
                    if (result.status === 'fulfilled' && result.value?.data?.success) {
                        return result.value.data.count;
                    }
                    console.warn('Failed to fetch stat:', result);
                    return defaultValue;
                };

                setStats({
                    pendingConsultations: getCount(consultationsRes),
                    pendingDonors: getCount(donorApprovalsRes),
                    scheduledAppointments: getCount(appointmentsRes),
                    matchesForReview: getCount(matchesRes),
                    eggRetrievals: getCount(retrievalsRes),
                    activeDonors: getCount(activeDonorsRes),
                    activeRecipients: getCount(recipientsRes),
                });

            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllStats();
    }, []);

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="page clinician-page-custom-bg">
            {/* ── Avatar Background ── */}
            {user?.avatar_url && (
                <div className="clin-avatar-bg">
                    <img src={user.avatar_url} alt="" className="clin-avatar-bg-img" />
                    <div className="clin-avatar-bg-overlay" />
                </div>
            )}
            <ClinicianParticles />

            {/* Welcome Banner */}
            <div className="clin-welcome-banner">
                <div className="clin-welcome-user">
                    <div className="clin-avatar-container" onClick={() => fileInputRef.current.click()}>
                        {uploading ? (
                            <div className="clin-avatar-loader"><div className="spinner" style={{ width: 24, height: 24 }}></div></div>
                        ) : user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Dr. Profile" className="clin-avatar-img" />
                        ) : (
                            <div className="clin-avatar-placeholder">
                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                            </div>
                        )}
                        <div className="clin-avatar-edit-overlay">
                            <span style={{ fontSize: '1.2rem' }}></span>
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleAvatarUpload}
                    />
                    <div className="clin-welcome-text">
                        <p className="clin-greeting">{greeting},</p>
                        <h1 className="clin-doctor-name">Dr. {user?.last_name}</h1>
                        <p className="clin-welcome-sub">Here's your clinical overview for today</p>
                    </div>
                </div>
                <div className="clin-welcome-visual">
                    <svg viewBox="0 0 120 120" className="clin-pulse-ring">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="2" />
                        <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="1.5" className="clin-ring-pulse" />
                        <circle cx="60" cy="60" r="30" fill="rgba(16,185,129,0.08)" />
                        <text x="60" y="58" textAnchor="middle" fill="#059669" fontSize="24" fontWeight="800">
                            {(stats?.pendingDonors || 0) + (stats?.matchesForReview || 0)}
                        </text>
                        <text x="60" y="72" textAnchor="middle" fill="#6b7280" fontSize="8" fontWeight="500">
                            ACTION ITEMS
                        </text>
                    </svg>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="clin-stats-grid">
                {[
                    { label: 'Pending Consultations', value: stats.pendingConsultations, icon: Icons.stethoscope, color: '#ef4444', trend: 'Donors who requested consultation', api: 'pending-consultations' },
                    { label: 'Pending Donor Approvals', value: stats.pendingDonors, icon: Icons.clipboard, color: '#f59e0b', trend: 'Donors waiting profile approval', api: 'pending-donor-approvals' },
                    { label: 'Scheduled Appointments', value: stats.scheduledAppointments, icon: Icons.calendar, color: '#3b82f6', trend: 'Donors waiting for physical', api: 'scheduled-appointments' },
                    { label: 'Matches for Review', value: stats.matchesForReview, icon: Icons.link, color: '#8b5cf6', trend: 'Awaiting decision', api: 'matches-for-review' },
                    { label: 'Egg Retrievals', value: stats.eggRetrievals, icon: Icons.dna, color: '#ec4899', trend: 'Upcoming procedures', api: 'egg-retrievals' },
                    { label: 'Active Donors', value: stats.activeDonors, icon: Icons.users, color: '#10b981', trend: 'Passed physical & active', api: 'active-donors' },
                    { label: 'Active Recipients', value: stats.activeRecipients, icon: Icons.heart, color: '#06b6d4', trend: 'Registered', api: 'active-recipients' },
                ].map((s, i) => (
                    <div key={i} className="clin-stat-card" style={{ '--card-accent': s.color, animationDelay: `${i * 80}ms` }}>
                        <div className="clin-stat-icon" style={{ color: s.color, background: `${s.color}15` }}>
                            {s.icon}
                        </div>
                        <div className="clin-stat-body">
                            <span className="clin-stat-label">{s.label}</span>
                            <span className="clin-stat-number"><AnimatedCounter target={s.value} /></span>
                            <span className="clin-stat-trend">{s.trend}</span>
                        </div>
                        <div className="clin-stat-bar">
                            <div className="clin-stat-bar-fill" style={{ width: `${Math.min(s.value * 15, 100)}%`, background: s.color }} />
                        </div>
                    </div>
                ))}
            </div>


            {/* Quick Actions */}
           <div className="clin-section">
                <div className="clin-section-header">
                    <h2>Quick Actions</h2>
                    <span className="clin-section-sub">Navigate to key workflows</span>
                </div>
                <div className="clin-actions-grid">
                    {[
                        { to: '/clinician/donors', icon: Icons.folderOpen, title: 'Manage Donors', desc: 'Review profiles, approve or suspend donor applications', color: '#10b981', badge: stats.pendingDonors + stats.pendingConsultations },
                        { to: '/clinician/recipients', icon: Icons.search, title: 'View Recipients', desc: 'Browse registered recipients and generate matches', color: '#8b5cf6', badge: null },
                        { to: '/clinician/matches', icon: Icons.checkCircle, title: 'Review Matches', desc: 'Evaluate proposed pairings and make clinical decisions', color: '#06b6d4', badge: stats.matchesForReview },
                    ].map((a, i) => (
                        <Link key={i} to={a.to} className="clin-action-card" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="clin-action-icon" style={{ color: a.color, background: `${a.color}12` }}>
                                {a.icon}
                            </div>
                            <div className="clin-action-body">
                                <h3>{a.title}</h3>
                                <p>{a.desc}</p>
                            </div>
                            <div className="clin-action-arrow" style={{ color: a.color }}>
                                {Icons.arrowRight}
                            </div>
                            {a.badge > 0 && <span className="clin-action-badge">{a.badge}</span>}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}