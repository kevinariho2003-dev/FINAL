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
};

export default function ClinicianDashboard() {
    const { user, setUser } = useAuth();
    const [stats, setStats] = useState(null);
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
            // Update local storage and context
            const updatedUser = res.data.user;
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error('Avatar upload failed:', error);
            alert('Failed to upload image. Please ensure it is less than 5MB.');
        } finally {
            setUploading(false);
            e.target.value = null; // reset input
        }
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [donorsRes, recipientsRes, matchesRes] = await Promise.allSettled([
                    api.get('/donors', { params: { status: 'pending' } }),
                    api.get('/recipients'),
                    api.get('/matches', { params: { status: 'proposed' } }),
                ]);

                const pendingDonors = donorsRes.status === 'fulfilled'
                    ? (donorsRes.value.data?.data || donorsRes.value.data || []) : [];
                const allRecipients = recipientsRes.status === 'fulfilled'
                    ? (recipientsRes.value.data?.data || recipientsRes.value.data || []) : [];
                const proposedMatches = matchesRes.status === 'fulfilled'
                    ? (matchesRes.value.data?.data || matchesRes.value.data || []) : [];

                const allDonorsRes = await api.get('/donors').catch(() => ({ data: [] }));
                const allDonors = allDonorsRes.data?.data || allDonorsRes.data || [];
                const activeDonors = Array.isArray(allDonors)
                    ? allDonors.filter(d => d.status === 'approved').length : 0;

                setStats({
                    pendingDonors: Array.isArray(pendingDonors) ? pendingDonors.length : 0,
                    matchesForReview: Array.isArray(proposedMatches) ? proposedMatches.length : 0,
                    activeDonors,
                    activeRecipients: Array.isArray(allRecipients) ? allRecipients.length : 0,
                });
            } catch { /* ignore */ }
            finally { setLoading(false); }
        };
        fetchStats();
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
                            <span style={{ fontSize: '1.2rem' }}>📷</span>
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
                    { label: 'Pending Approvals', value: stats?.pendingDonors || 0, icon: Icons.clipboard, color: '#f59e0b', trend: stats?.pendingDonors > 0 ? 'Needs attention' : 'All clear' },
                    { label: 'Matches for Review', value: stats?.matchesForReview || 0, icon: Icons.link, color: '#8b5cf6', trend: stats?.matchesForReview > 0 ? 'Awaiting review' : 'Up to date' },
                    { label: 'Active Donors', value: stats?.activeDonors || 0, icon: Icons.users, color: '#10b981', trend: 'Approved profiles' },
                    { label: 'Active Recipients', value: stats?.activeRecipients || 0, icon: Icons.heart, color: '#06b6d4', trend: 'Registered cases' },
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
                            <div className="clin-stat-bar-fill" style={{ width: `${Math.min(s.value * 20, 100)}%`, background: s.color, animationDelay: `${i * 100 + 300}ms` }} />
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
                        { to: '/clinician/donors', icon: Icons.folderOpen, title: 'Manage Donors', desc: 'Review profiles, approve or suspend donor applications', color: '#10b981', badge: stats?.pendingDonors },
                        { to: '/clinician/recipients', icon: Icons.search, title: 'View Recipients', desc: 'Browse registered recipients and generate matches', color: '#8b5cf6', badge: null },
                        { to: '/clinician/matches', icon: Icons.checkCircle, title: 'Review Matches', desc: 'Evaluate proposed pairings and make clinical decisions', color: '#06b6d4', badge: stats?.matchesForReview },
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

            {/* Activity Overview */}
            <div className="clin-section">
                <div className="clin-section-header">
                    <h2>System Overview</h2>
                    <span className="clin-section-sub">Current platform status</span>
                </div>
                <div className="clin-overview-grid">
                    <div className="clin-overview-card">
                        <h4>Donor Pipeline</h4>
                        <div className="clin-pipeline">
                            {[
                                { label: 'Approved', count: stats?.activeDonors || 0, color: '#10b981' },
                                { label: 'Pending', count: stats?.pendingDonors || 0, color: '#f59e0b' },
                            ].map((p, i) => (
                                <div key={i} className="clin-pipeline-item">
                                    <div className="clin-pipeline-dot" style={{ background: p.color }} />
                                    <span className="clin-pipeline-label">{p.label}</span>
                                    <span className="clin-pipeline-count" style={{ color: p.color }}>{p.count}</span>
                                </div>
                            ))}
                        </div>
                        <svg className="clin-mini-chart" viewBox="0 0 200 50" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="clinGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,40 Q25,35 50,30 T100,25 T150,20 T200,15 L200,50 L0,50 Z" fill="url(#clinGrad)" />
                            <path d="M0,40 Q25,35 50,30 T100,25 T150,20 T200,15" fill="none" stroke="#10b981" strokeWidth="2" />
                        </svg>
                    </div>
                    <div className="clin-overview-card">
                        <h4>Match Activity</h4>
                        <div className="clin-pipeline">
                            {[
                                { label: 'To Review', count: stats?.matchesForReview || 0, color: '#8b5cf6' },
                                { label: 'Recipients', count: stats?.activeRecipients || 0, color: '#06b6d4' },
                            ].map((p, i) => (
                                <div key={i} className="clin-pipeline-item">
                                    <div className="clin-pipeline-dot" style={{ background: p.color }} />
                                    <span className="clin-pipeline-label">{p.label}</span>
                                    <span className="clin-pipeline-count" style={{ color: p.color }}>{p.count}</span>
                                </div>
                            ))}
                        </div>
                        <svg className="clin-mini-chart" viewBox="0 0 200 50" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="clinGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0,35 Q30,30 60,32 T120,22 T180,18 L200,15 L200,50 L0,50 Z" fill="url(#clinGrad2)" />
                            <path d="M0,35 Q30,30 60,32 T120,22 T180,18 L200,15" fill="none" stroke="#8b5cf6" strokeWidth="2" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
