import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

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
    cycles: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    menu: 'M3 12h18M3 6h18M3 18h18',
    close: 'M18 6L6 18M6 6l12 12',
};

/* ── Role-based navigation config ── */
const navConfig = {
    admin: [
        { to: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/admin/users', icon: 'users', label: 'Users' },
        { to: '/admin/matching-config', icon: 'config', label: 'Matching Config' },
        { to: '/admin/audit-logs', icon: 'audit', label: 'Audit Logs' },
    ],
    clinician: [
        { to: '/clinician/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/clinician/donors', icon: 'donors', label: 'Donors' },
        { to: '/clinician/recipients', icon: 'recipients', label: 'Recipients' },
        { to: '/clinician/matches', icon: 'matches', label: 'Match Review' },
        { to: '/clinician/cycles', icon: 'cycles', label: 'Cycles' },
    ],
    donor: [
        { to: '/donor/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/donor/profile', icon: 'profile', label: 'My Profile' },
        { to: '/donor/consents', icon: 'consents', label: 'Consents' },
        { to: '/donor/screening', icon: 'screening', label: 'Screening' },
        { to: '/donor/cycles', icon: 'cycles', label: 'My Cycles' },
    ],
    recipient: [
        { to: '/recipient/dashboard', icon: 'dashboard', label: 'Dashboard' },
        { to: '/recipient/profile', icon: 'profile', label: 'My Profile' },
        { to: '/recipient/matches', icon: 'matches', label: 'My Matches' },
    ],
};

const roleBadgeColor = {
    admin: '#fbbf24',
    clinician: '#22d3ee',
    donor: '#f472b6',
    recipient: '#a78bfa',
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
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

    return (
        <>
            <nav className="top-navbar" id="main-navbar">
                {/* ── Brand ── */}
                <div className="navbar-brand">
                    <div className="navbar-logo">
                        <img src="/images/brand/logo.png" alt="EDRMS" />
                    </div>
                    <span className="navbar-brand-text">EDRMS</span>
                </div>

                {/* ── Desktop Navigation Links ── */}
                <div className="navbar-links">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `navbar-link ${isActive ? 'navbar-link--active' : ''}`}
                        >
                            <span className="navbar-link-icon"><Icon d={icons[link.icon]} size={16} /></span>
                            <span className="navbar-link-label">{link.label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* ── Right Section: Theme + User + Logout ── */}
                <div className="navbar-actions">
                    {/* Theme Toggle */}
                    <button className="navbar-theme-btn" onClick={toggleTheme} title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
                        <span className="theme-icon-txt">{theme === 'light' ? '🌙' : '☀️'}</span>
                    </button>

                    {/* User Info */}
                    <div className="navbar-user-info">
                        <div className="navbar-avatar" style={{ background: `linear-gradient(135deg, ${roleBadgeColor[user.role]}, ${roleBadgeColor[user.role]}99)` }}>
                            {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </div>
                        <div className="navbar-user-meta">
                            <span className="navbar-user-name">{user.first_name} {user.last_name}</span>
                            <span className="navbar-user-role" style={{ color: roleBadgeColor[user.role] }}>{user.role}</span>
                        </div>
                    </div>

                    {/* Logout */}
                    <button className="navbar-logout-btn" onClick={handleLogout} title="Logout">
                        <Icon d={icons.logout} size={16} />
                        <span className="navbar-logout-text">Logout</span>
                    </button>

                    {/* Mobile Hamburger */}
                    <button className="navbar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                        <Icon d={mobileOpen ? icons.close : icons.menu} size={22} />
                    </button>
                </div>
            </nav>

            {/* ── Mobile Dropdown ── */}
            {mobileOpen && <div className="navbar-mobile-overlay" onClick={() => setMobileOpen(false)} />}
            <div className={`navbar-mobile-menu ${mobileOpen ? 'navbar-mobile-menu--open' : ''}`}>
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `navbar-mobile-link ${isActive ? 'navbar-mobile-link--active' : ''}`}
                        onClick={() => setMobileOpen(false)}
                    >
                        <span className="navbar-link-icon"><Icon d={icons[link.icon]} size={18} /></span>
                        <span>{link.label}</span>
                    </NavLink>
                ))}
                <div className="navbar-mobile-divider" />
                <button className="navbar-mobile-theme" onClick={toggleTheme}>
                    <span>{theme === 'light' ? '🌙' : '☀️'}</span>
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button className="navbar-mobile-logout" onClick={handleLogout}>
                    <Icon d={icons.logout} size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </>
    );
}
