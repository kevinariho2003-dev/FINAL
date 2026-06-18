import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('auth_token');
        if (storedUser && token) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // 10-minute Idle Auto-Logout
    useEffect(() => {
        let timeoutId;
        const resetTimer = () => {
            clearTimeout(timeoutId);
            if (user) {
                // 10 minutes = 10 * 60 * 1000 ms
                timeoutId = setTimeout(() => {
                    logout();
                    window.location.href = '/login?reason=timeout';
                }, 600000);
            }
        };

        // Attach listeners for user activity
        const events = ['mousemove', 'keydown', 'scroll', 'click'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        
        // Start initial timer
        resetTimer();

        return () => {
            clearTimeout(timeoutId);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [user]);

    const login = async (email, password) => {
        const response = await api.post('/login', { email, password });
        if (response.data.requires_otp) {
            return response.data;
        }
        const { user: userData, token } = response.data;
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    /**
     * Called by Register.jsx after OTP verification succeeds.
     * The token + user are already in localStorage; we just sync context.
     */
    const setUserFromToken = (userData) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            // ignore — token may already be invalid
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = { user, setUser, loading, login, setUserFromToken, logout };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

