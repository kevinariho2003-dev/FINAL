import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import '../Dashboard.css';
import './AdminDashboard.css';

const ROLE_META = {
    admin: { color: '#f59e0b', icon: 'settings' },
    clinician: { color: '#06b6d4', icon: 'stethoscope' },
    donor: { color: '#ec4899', icon: 'heart' },
    recipient: { color: '#8b5cf6', icon: 'users' },
};

const ROLE_TABS = [
    { key: '', label: 'All Roles' },
    { key: 'admin', label: 'Admin' },
    { key: 'clinician', label: 'Clinician' },
    { key: 'donor', label: 'Donor' },
    { key: 'recipient', label: 'Recipient' },
];

function SvgIcon({ name, className = '' }) {
    const paths = {
        users: 'M17 21a5 5 0 0 0-10 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm5-1a3 3 0 1 0 0-6m3 15a4 4 0 0 0-3-3.87',
        heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z',
        stethoscope: 'M6 3v5a4 4 0 0 0 8 0V3M4 3h4m4 0h4m-2 8v3a4 4 0 0 0 8 0v-1a2 2 0 1 0-2 2',
        settings: 'M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z M19 12h2M3 12h2M12 3v2M12 19v2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4 17 17M7 7 5.6 5.6',
        plus: 'M12 5v14M5 12h14',
        search: 'M11 19a8 8 0 1 1 5.7-2.3L21 21',
        phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 2 2.3z',
        pause: 'M8 5v14M16 5v14',
        play: 'm8 5 11 7-11 7V5z',
        x: 'M18 6 6 18M6 6l12 12',
    };
    return (
        <svg className={`admin-svg ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d={paths[name]} />
        </svg>
    );
}

export default function AdminUserManagement() {
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState(location.state?.filter || '');
    const [togglingId, setTogglingId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [clinicianForm, setClinicianForm] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        password: '', password_confirmation: '',
    });
    const [modalErrors, setModalErrors] = useState({});
    const [modalError, setModalError] = useState('');
    const [modalLoading, setModalLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [confirmUser, setConfirmUser] = useState(null);

    useEffect(() => { fetchUsers(); }, [roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (roleFilter) params.role = roleFilter;
            if (search) params.search = search;
            const res = await api.get('/admin/users', { params });
            setUsers(res.data?.data || []);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (userToToggle) => {
        setTogglingId(userToToggle.id);
        try {
            await api.patch(`/admin/users/${userToToggle.id}/toggle`);
            fetchUsers();
            setToast({ type: 'success', msg: `${userToToggle.first_name} ${userToToggle.last_name} has been ${userToToggle.is_active ? 'deactivated' : 'activated'}.` });
            setConfirmUser(null);
        } catch {
            setToast({ type: 'error', msg: 'Failed to toggle user status.' });
        } finally {
            setTogglingId(null);
        }
        setTimeout(() => setToast(null), 3000);
    };

    const handleSearch = (e) => { e.preventDefault(); fetchUsers(); };
    const getInitials = (u) => `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase();

    const handleClinicianChange = (e) => {
        setClinicianForm({ ...clinicianForm, [e.target.name]: e.target.value });
        if (modalErrors[e.target.name]) setModalErrors({ ...modalErrors, [e.target.name]: null });
    };

    const handleCreateClinician = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalErrors({});
        setModalLoading(true);
        try {
            await api.post('/admin/clinicians', clinicianForm);
            setShowModal(false);
            setClinicianForm({ first_name: '', last_name: '', email: '', phone: '', password: '', password_confirmation: '' });
            setToast({ type: 'success', msg: 'Clinician account created successfully.' });
            fetchUsers();
        } catch (err) {
            if (err.response?.data?.errors) setModalErrors(err.response.data.errors);
            else setModalError(err.response?.data?.message || 'Failed to create clinician.');
        }
        setModalLoading(false);
        setTimeout(() => setToast(null), 3000);
    };

    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = users.filter(u => !u.is_active).length;

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page admin-page-custom-bg admin-users-page">
            <section className="admin-list-hero">
                <div>
                    <p className="admin-kicker">Access control</p>
                    <h1>User Management</h1>
                    <p>Create clinician accounts for the clinical team. Clinicians sign in with the credentials created here and do not self-register.</p>
                </div>
                <button className="admin-modern-btn" onClick={() => setShowModal(true)}>
                    <SvgIcon name="plus" /> Add Clinician
                </button>
            </section>

            <section className="admin-user-summary">
                <Summary label="Total Users" value={users.length} icon="users" color="#6366f1" />
                <Summary label="Active" value={activeCount} icon="play" color="#10b981" />
                <Summary label="Inactive" value={inactiveCount} icon="pause" color="#ef4444" />
            </section>

            <TabSlider tabs={ROLE_TABS} active={roleFilter} onChange={setRoleFilter} />

            <form onSubmit={handleSearch} className="admin-search-panel">
                <div className="admin-search-input">
                    <SvgIcon name="search" />
                    <input
                        className="form-input"
                        placeholder="Search by name, email, or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Search</button>
                {search && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setTimeout(fetchUsers, 0); }}>Clear</button>}
            </form>

            {users.length === 0 ? (
                <div className="empty-state admin-empty">
                    <div className="empty-state-icon"><SvgIcon name="users" /></div>
                    <div className="empty-state-text">No users found</div>
                    <div className="empty-state-sub">Try a different search or filter.</div>
                </div>
            ) : (
                <div className="user-cards-grid admin-user-grid-modern">
                    {users.map((u, i) => {
                        const meta = ROLE_META[u.role] || ROLE_META.admin;
                        return (
                            <article key={u.id} className="user-card admin-user-card-modern" style={{ '--role-color': meta.color, animationDelay: `${i * 40}ms` }}>
                                <div className="user-card-header">
                                    <div className="user-avatar"><SvgIcon name={meta.icon} /></div>
                                    <div className="user-card-info">
                                        <div className="user-card-name">{u.first_name} {u.last_name}</div>
                                        <div className="user-card-email">{u.email}</div>
                                        {u.phone && <div className="admin-user-phone"><SvgIcon name="phone" /> {u.phone}</div>}
                                    </div>
                                    <span className={`admin-status-pill ${u.is_active ? 'active' : 'inactive'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="user-card-footer">
                                    <div className="user-card-meta">
                                        <span className="admin-role-pill"><SvgIcon name={meta.icon} /> {u.role}</span>
                                        <span>Joined {new Date(u.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <button
                                        className={`admin-toggle-btn ${u.is_active ? 'danger' : 'success'}`}
                                        onClick={() => setConfirmUser(u)}
                                        disabled={togglingId === u.id}
                                    >
                                        {togglingId === u.id ? 'Working...' : u.is_active ? <><SvgIcon name="pause" /> Deactivate</> : <><SvgIcon name="play" /> Activate</>}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content admin-modal-modern" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><SvgIcon name="stethoscope" /> Add New Clinician</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}><SvgIcon name="x" /></button>
                        </div>
                        <p className="modal-subtitle">Create login credentials for a clinician. They will use this email and password to access the clinician workspace.</p>

                        {modalError && <div className="alert alert-error">{modalError}</div>}

                        <form onSubmit={handleCreateClinician}>
                            <div className="form-row">
                                <Field name="first_name" label="First Name" value={clinicianForm.first_name} onChange={handleClinicianChange} error={modalErrors.first_name} />
                                <Field name="last_name" label="Last Name" value={clinicianForm.last_name} onChange={handleClinicianChange} error={modalErrors.last_name} />
                            </div>
                            <Field type="email" name="email" label="Email Address" placeholder="clinician@edrms.ug" value={clinicianForm.email} onChange={handleClinicianChange} error={modalErrors.email} />
                            <Field name="phone" label="Phone (optional)" placeholder="+256 7XX XXX XXX" value={clinicianForm.phone} onChange={handleClinicianChange} required={false} />
                            <div className="form-row">
                                <Field type="password" name="password" label="Password" placeholder="Min 8 characters" value={clinicianForm.password} onChange={handleClinicianChange} error={modalErrors.password} />
                                <Field type="password" name="password_confirmation" label="Confirm Password" placeholder="Confirm password" value={clinicianForm.password_confirmation} onChange={handleClinicianChange} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={modalLoading}>{modalLoading ? 'Creating...' : 'Create Clinician'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmUser && (
                <div className="modal-overlay" onClick={() => setConfirmUser(null)}>
                    <div className="modal-content admin-confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>
                                <SvgIcon name={confirmUser.is_active ? 'pause' : 'play'} />
                                {confirmUser.is_active ? 'Deactivate user?' : 'Activate user?'}
                            </h2>
                            <button className="modal-close" onClick={() => setConfirmUser(null)}><SvgIcon name="x" /></button>
                        </div>
                        <p className="modal-subtitle">
                            Are you sure you want to {confirmUser.is_active ? 'deactivate' : 'activate'}{' '}
                            <strong>{confirmUser.first_name} {confirmUser.last_name}</strong>?
                            {confirmUser.is_active
                                ? ' They will no longer be able to sign in until reactivated.'
                                : ' They will be able to sign in with their existing credentials.'}
                        </p>
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setConfirmUser(null)}>Cancel</button>
                            <button
                                type="button"
                                className={`admin-confirm-btn ${confirmUser.is_active ? 'danger' : 'success'}`}
                                onClick={() => toggleStatus(confirmUser)}
                                disabled={togglingId === confirmUser.id}
                            >
                                {togglingId === confirmUser.id
                                    ? 'Working...'
                                    : confirmUser.is_active ? 'Yes, deactivate' : 'Yes, activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}

function Summary({ label, value, icon, color }) {
    return (
        <div className="admin-user-summary-card" style={{ '--summary-color': color }}>
            <SvgIcon name={icon} />
            <div>
                <span>{label}</span>
                <strong>{value}</strong>
            </div>
        </div>
    );
}

function Field({ type = 'text', name, label, value, onChange, error, placeholder = '', required = true }) {
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <input type={type} name={name} className="form-input" placeholder={placeholder || label} value={value} onChange={onChange} required={required} />
            {error && <span className="form-error">{error[0]}</span>}
        </div>
    );
}
