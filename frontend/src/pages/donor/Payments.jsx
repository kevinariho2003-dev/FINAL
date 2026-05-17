import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Receipt, CheckCircle, Clock, CreditCard } from 'lucide-react';

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/donor/payments')
            .then(res => setPayments(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="page fade-in">
            <div className="donor-welcome-banner">
                <h1>Payment History & Schedule</h1>
                <p>Track your compensation milestones.</p>
            </div>

            <div className="donor-journey-section">
                {payments.map((payment) => (
                    <div key={payment.id} className="stage-inner" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div>
                                <h4 style={{ margin: 0 }}>{payment.milestone_name}</h4>
                                <small>{payment.date || 'Pending Schedule'}</small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                                    {payment.amount.toLocaleString()} UGX
                                </div>
                                <span className={`status-tag ${payment.status}`}>
                                    {payment.status === 'paid' ? <CheckCircle size={12}/> : <Clock size={12}/>} 
                                    {payment.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="donor-welcome-banner" style={{ marginTop: '2rem', backgroundColor: 'rgba(var(--accent-rgb), 0.05)' }}>
                    <p style={{ fontSize: '0.85rem' }}>
                        <CreditCard size={14} /> Payments are processed within 3-5 business days of reaching a milestone.
                    </p>
                </div>
            </div>
        </div>
    );
}