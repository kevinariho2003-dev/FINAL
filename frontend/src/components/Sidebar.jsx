import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

/* ── SVG Icons (inline for zero deps) ── */
const Icon = ({ d, size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const icons = {
    dashboard: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    donors: 'M12 2a4 4 0 0 0-4 4c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4z M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z',
    recipients: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z',
    matches: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    consents: 'M9 12l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    config: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    audit: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    screening: 'M9 2h6l3 7H6L9 2z M12 9v4 M8 17a4 4 0 1 0 8 0H8z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    menu: 'M3 12h18M3 6h18M3 18h18',
    close: 'M18 6L6 18M6 6l12 12',
};

const navConfig = {
    admin: [
        { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/admin/users', icon: 'users', label: 'User Management' },
        { to: '/admin/matching-config', icon: 'config', label: 'Matching Config' },
        { to: '/admin/cycles', icon: 'matches', label: 'Donation Cycles' },
        { to: '/admin/audit-logs', icon: 'audit', label: 'Audit Logs' },
    ],
    clinician: [
        { to: '/clinician/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/clinician/donors', icon: 'donors', label: 'Donors' },
        { to: '/clinician/recipients', icon: 'recipients', label: 'Recipients' },
        { to: '/clinician/matches', icon: 'matches', label: 'Match Review' },
        { to: '/clinician/cycles', icon: 'consents', label: 'Donation Cycles' },
    ],
    donor: [
        { to: '/donor/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/donor/profile', icon: 'profile', label: 'My Profile' },
        { to: '/donor/consents', icon: 'consents', label: 'Consents' },
        { to: '/donor/screening', icon: 'screening', label: 'Screening' },
        { to: '/donor/cycles', icon: 'matches', label: 'My Cycles' },
    ],
    recipient: [
        { to: '/recipient/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/recipient/profile', icon: 'profile', label: 'My Profile' },
        { to: '/recipient/matches', icon: 'matches', label: 'My Matches' },
    ],
};

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('edrms-theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('edrms-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

    if (!user) return null;

    const links = navConfig[user.role] || [];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const roleBadgeColor = {
        admin: '#fbbf24',
        clinician: '#22d3ee',
        donor: '#f472b6',
        recipient: '#a78bfa',
    };

    return (
        <>
            {/* Mobile top bar */}
            <div className="sidebar-mobile-bar">
                <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                    <Icon d={mobileOpen ? icons.close : icons.menu} size={22} />
                </button>
                <span className="sidebar-mobile-brand">EDRMS</span>
            </div>

            {/* Overlay for mobile */}
            {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

            <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-brand">
                    <div className="sidebar-logo">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="10" fill="url(#logoGrad)" />
                            <path d="M10 16c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="16" cy="16" r="2" fill="#fff" />
                            <defs>
                                <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                                    <stop stopColor="#0ea5e9" />
                                    <stop offset="1" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    {!collapsed && <span className="sidebar-brand-text">EDRMS</span>}
                    <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d={collapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="sidebar-nav-label">{!collapsed && 'MENU'}</div>
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                            title={collapsed ? link.label : undefined}
                        >
                            <span className="sidebar-link-icon"><Icon d={icons[link.icon]} /></span>
                            {!collapsed && <span className="sidebar-link-label">{link.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Theme Toggle */}
                <div className="sidebar-theme-toggle">
                    <button className="theme-btn" onClick={toggleTheme} title={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}>
                        <span className="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
                        {!collapsed && <span className="theme-label">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
                    </button>
                </div>

                {/* User Section */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar" style={{ background: `linear-gradient(135deg, ${roleBadgeColor[user.role]}, ${roleBadgeColor[user.role]}99)` }}>
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </div>
                        {!collapsed && (
                            <div className="sidebar-user-info">
                                <span className="sidebar-user-name">{user.first_name} {user.last_name}</span>
                                <span className="sidebar-user-role" style={{ color: roleBadgeColor[user.role] }}>{user.role}</span>
                            </div>
                        )}
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} title="Logout">
                        <Icon d={icons.logout} size={18} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
