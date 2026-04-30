import { useState, useEffect } from 'react';
import api from '../../services/api';
import TabSlider from '../../components/TabSlider';
import '../Dashboard.css';
import './AdminDashboard.css';

const AVATAR_COLORS = {
    admin: 'linear-gradient(135deg, #f59e0b, #d97706)',
    clinician: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    donor: 'linear-gradient(135deg, #ec4899, #db2777)',
    recipient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
};

const ROLE_TABS = [
    { key: '', label: 'All Roles' },
    { key: 'admin', label: '⚙️ Admin' },
    { key: 'clinician', label: '👨‍⚕️ Clinician' },
    { key: 'donor', label: '🌸 Donor' },
    { key: 'recipient', label: '💜 Recipient' },
];

export default function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
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

    useEffect(() => { fetchUsers(); }, [roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = {};
            if (roleFilter) params.role = roleFilter;
            if (search) params.search = search;
            const res = await api.get('/admin/users', { params });
            setUsers(res.data?.data || []);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    const toggleStatus = async (id) => {
        setTogglingId(id);
        try {
            await api.patch(`/admin/users/${id}/toggle`);
            fetchUsers();
        } catch { /* ignore */ }
        finally { setTogglingId(null); }
    };

    const handleSearch = (e) => { e.preventDefault(); fetchUsers(); };

    const getInitials = (u) => `${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase();

    const handleClinicianChange = (e) => {
        setClinicianForm({ ...clinicianForm, [e.target.name]: e.target.value });
        if (modalErrors[e.target.name]) {
            setModalErrors({ ...modalErrors, [e.target.name]: null });
        }
    };

    const handleCreateClinician = async (e) => {
        e.preventDefault();
        setModalError('');
        setModalErrors({});
        setModalLoading(true);
        try {
            await api.post('/admin/clinicians', clinicianForm);
            setShowModal(false);
            setClinicianForm({
                first_name: '', last_name: '', email: '', phone: '',
                password: '', password_confirmation: '',
            });
            setToast({ type: 'success', msg: 'Clinician account created successfully!' });
            fetchUsers();
        } catch (err) {
            if (err.response?.data?.errors) {
                setModalErrors(err.response.data.errors);
            } else {
                setModalError(err.response?.data?.message || 'Failed to create clinician.');
            }
        }
        setModalLoading(false);
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">User Management 👥</h1>
                    <p className="page-subtitle">Manage all EDRMS users</p>
                </div>
                <button className="btn btn-primary add-clinician-btn" onClick={() => setShowModal(true)}>
                    <span>👨‍⚕️</span> Add Clinician
                </button>
            </div>

            {/* Tab Filter */}
            <TabSlider tabs={ROLE_TABS} active={roleFilter} onChange={setRoleFilter} />

            {/* Search */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="form-input"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm">Search</button>
                </form>
            </div>

            {/* User Cards Grid */}
            {users.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-text">No users found</div>
                    <div className="empty-state-sub">Try a different search or filter</div>
                </div>
            ) : (
                <div className="user-cards-grid">
                    {users.map((u, i) => (
                        <div key={u.id} className="user-card" style={{ animationDelay: `${i * 60}ms` }}>
                            <div className="user-card-header">
                                <div className="user-avatar" style={{ background: AVATAR_COLORS[u.role] || AVATAR_COLORS.admin }}>
                                    {getInitials(u)}
                                </div>
                                <div className="user-card-info">
                                    <div className="user-card-name">{u.first_name} {u.last_name}</div>
                                    <div className="user-card-email">{u.email}</div>
                                </div>
                                <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                                    {u.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="user-card-footer">
                                <div className="user-card-meta">
                                    <span className="badge badge-active" style={{ textTransform: 'capitalize' }}>{u.role}</span>
                                    <span>{new Date(u.created_at).toLocaleDateString()}</span>
                                </div>
                                <button
                                    className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                                    onClick={() => toggleStatus(u.id)}
                                    disabled={togglingId === u.id}
                                >
                                    {togglingId === u.id ? '...' : u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add Clinician Modal ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>👨‍⚕️ Add New Clinician</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <p className="modal-subtitle">Create a new clinician account. They will be able to log in immediately.</p>

                        {modalError && <div className="alert alert-error">{modalError}</div>}

                        <form onSubmit={handleCreateClinician}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text" name="first_name" className="form-input"
                                        placeholder="First name" value={clinicianForm.first_name}
                                        onChange={handleClinicianChange} required
                                    />
                                    {modalErrors.first_name && <span className="form-error">{modalErrors.first_name[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text" name="last_name" className="form-input"
                                        placeholder="Last name" value={clinicianForm.last_name}
                                        onChange={handleClinicianChange} required
                                    />
                                    {modalErrors.last_name && <span className="form-error">{modalErrors.last_name[0]}</span>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email" name="email" className="form-input"
                                    placeholder="clinician@example.com" value={clinicianForm.email}
                                    onChange={handleClinicianChange} required
                                />
                                {modalErrors.email && <span className="form-error">{modalErrors.email[0]}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone (optional)</label>
                                <input
                                    type="text" name="phone" className="form-input"
                                    placeholder="+256 7XX XXX XXX" value={clinicianForm.phone}
                                    onChange={handleClinicianChange}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input
                                        type="password" name="password" className="form-input"
                                        placeholder="Min 8 characters" value={clinicianForm.password}
                                        onChange={handleClinicianChange} required
                                    />
                                    {modalErrors.password && <span className="form-error">{modalErrors.password[0]}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Password</label>
                                    <input
                                        type="password" name="password_confirmation" className="form-input"
                                        placeholder="Confirm password" value={clinicianForm.password_confirmation}
                                        onChange={handleClinicianChange} required
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                                    {modalLoading ? 'Creating...' : '👨‍⚕️ Create Clinician'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {toast && <div className={`status-toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
