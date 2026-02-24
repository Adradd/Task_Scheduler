import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Account.css';

function Account({ user, onLogout }) {
    const [accountData, setAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Create auth config from stored credentials
    const getAuthConfig = () => {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            return {
                headers: {
                    'Authorization': 'Basic ' + authToken
                }
            };
        }
        return {};
    };

    // Fetch account details on component mount
    useEffect(() => {
        if (user) {
            fetchAccountDetails();
        }
    }, [user]);

    const fetchAccountDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const accountId = localStorage.getItem('accountId');
            const res = await axios.get(`${backendUrl}/api/accounts/${accountId}`, getAuthConfig());
            setAccountData(res.data);
            setFormData(res.data);
        } catch (err) {
            setError('Failed to fetch account details: ' + (err.response?.data?.message || err.message));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveChanges = async () => {
        try {
            setError(null);
            const accountId = localStorage.getItem('accountId');
            await axios.put(`${backendUrl}/api/accounts/${accountId}`, formData, getAuthConfig());
            setAccountData(formData);
            setEditing(false);
        } catch (err) {
            setError('Failed to update account: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleCancel = () => {
        setFormData(accountData);
        setEditing(false);
    };

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    if (loading) {
        return <div className="account-container"><p>Loading account details...</p></div>;
    }

    if (!accountData) {
        return <div className="account-container"><p>Unable to load account details</p></div>;
    }

    return (
        <div className="account-container">
            <div className="account-card">
                <h1>Account Details</h1>
                {error && <div className="error-message">{error}</div>}

                <div className="account-info">
                    <div className="info-group">
                        <label>Username</label>
                        {editing ? (
                            <input
                                type="text"
                                name="username"
                                value={formData.username || ''}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{accountData.username}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Email</label>
                        {editing ? (
                            <input
                                type="email"
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{accountData.email || 'Not provided'}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Role</label>
                        <p>{accountData.role || 'User'}</p>
                    </div>
                </div>

                <div className="account-actions">
                    {!editing ? (
                        <>
                            <button className="edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
                            <button className="logout-btn" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button className="save-btn" onClick={handleSaveChanges}>Save Changes</button>
                            <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Account;
