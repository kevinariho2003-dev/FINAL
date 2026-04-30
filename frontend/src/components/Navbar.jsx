import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (!user) return null;

    const dashboardPath = `/${user.role}/dashboard`;

    return (
        <nav className="navbar">
            <div className="nav-container">
                <Link to="/" className="nav-brand">
                    <img src="/images/brand/logo.png" alt="EDRMS Logo" className="nav-logo-image" />
                    <span className="brand-text">EDRMS</span>
                </Link>
            </div>
            <div className="navbar-links">
                <Link to={dashboardPath} className="nav-link">Dashboard</Link>
                {user.role === 'donor' && (
                    <>
                        <Link to="/donor/profile" className="nav-link">My Profile</Link>
                        <Link to="/donor/consents" className="nav-link">Consents</Link>
                    </>
                )}
                {user.role === 'recipient' && (
                    <>
                        <Link to="/recipient/profile" className="nav-link">My Profile</Link>
                        <Link to="/recipient/matches" className="nav-link">My Matches</Link>
                    </>
                )}
                {user.role === 'clinician' && (
                    <>
                        <Link to="/clinician/donors" className="nav-link">Donors</Link>
                        <Link to="/clinician/recipients" className="nav-link">Recipients</Link>
                        <Link to="/clinician/matches" className="nav-link">Matches</Link>
                    </>
                )}
                {user.role === 'admin' && (
                    <>
                        <Link to="/admin/users" className="nav-link">Users</Link>
                        <Link to="/admin/matching-config" className="nav-link">Matching Config</Link>
                        <Link to="/admin/audit-logs" className="nav-link">Audit Logs</Link>
                    </>
                )}
            </div>
            <div className="navbar-user">
                <span className="user-badge">{user.role}</span>
                <span className="user-name">{user.first_name}</span>
                <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
        </nav>
    );
}
