import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Account.css';
import { extractApiErrorMessage } from '../utils/api.js';
import { createAuthConfig, getStoredAccountId } from '../utils/authSession.js';

function Account({ user, onLogout }) {
    const [accountData, setAccountData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [googleCalendarLinked, setGoogleCalendarLinked] = useState(false);
    const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false);
    const [googleCalendarMessage, setGoogleCalendarMessage] = useState('');
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        if (user) {
            fetchAccountDetails();
            fetchGoogleCalendarStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const googleStatus = queryParams.get('google');
        const googleMessage = queryParams.get('googleMessage');

        if (googleStatus === 'connected') {
            setGoogleCalendarMessage('Google Calendar connected successfully.');
            fetchGoogleCalendarStatus();
        } else if (googleStatus === 'failed') {
            setGoogleCalendarMessage(googleMessage || 'Google Calendar connection failed.');
        }

        if (googleStatus || googleMessage) {
            const cleanUrl = `${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAccountDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const accountId = getStoredAccountId();
            const res = await axios.get(`${backendUrl}/api/accounts/${accountId}`, createAuthConfig());
            const normalized = {
                ...res.data,
                startWorkingHours: res.data?.startWorkingHours || '09:00',
                endWorkingHours: res.data?.endWorkingHours || '17:00',
            };
            setAccountData(normalized);
            setFormData(normalized);
        } catch (err) {
            setError('Failed to fetch account details: ' + extractApiErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const fetchGoogleCalendarStatus = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/integrations/google/status`, createAuthConfig());
            setGoogleCalendarLinked(Boolean(res.data?.linked));
        } catch {
            setGoogleCalendarLinked(false);
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
            const accountId = getStoredAccountId();
            await axios.put(`${backendUrl}/api/accounts/${accountId}`, formData, createAuthConfig());
            setAccountData(formData);
            setEditing(false);
        } catch (err) {
            setError('Failed to update account: ' + extractApiErrorMessage(err));
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

    const handleConnectGoogleCalendar = async () => {
        try {
            setGoogleCalendarLoading(true);
            setGoogleCalendarMessage('');
            const res = await axios.get(`${backendUrl}/api/integrations/google/connect`, createAuthConfig());
            if (!res.data?.authorizationUrl) {
                setGoogleCalendarMessage('Failed to start Google Calendar connection.');
                return;
            }
            window.location.href = res.data.authorizationUrl;
        } catch {
            setGoogleCalendarMessage('Failed to start Google Calendar connection.');
        } finally {
            setGoogleCalendarLoading(false);
        }
    };

    const handleDisconnectGoogleCalendar = async () => {
        try {
            setGoogleCalendarLoading(true);
            setGoogleCalendarMessage('');
            await axios.delete(`${backendUrl}/api/integrations/google/disconnect`, createAuthConfig());
            setGoogleCalendarLinked(false);
            setGoogleCalendarMessage('Google Calendar disconnected.');
        } catch {
            setGoogleCalendarMessage('Failed to disconnect Google Calendar.');
        } finally {
            setGoogleCalendarLoading(false);
        }
    };

    if (loading) {
        return <main className="account-container"><p>Loading account details…</p></main>;
    }

    if (!accountData) {
        return <main className="account-container"><p>Unable to load account details.</p></main>;
    }

    return (
        <main className="account-container">
            <section className="account-card" aria-labelledby="account-title">
                <h1 id="account-title">Account Details</h1>
                {error && <div className="error-message" role="alert">{error}</div>}

                <div className="account-info">
                    <div className="info-group">
                        <label>Username</label>
                        <p>{accountData.username}</p>
                    </div>

                    <div className="info-group">
                        <label>Email</label>
                        {editing ? (
                            <input
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{accountData.email || 'Not provided'}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Start Working Hours</label>
                        {editing ? (
                            <input
                                type="time"
                                name="startWorkingHours"
                                value={formData.startWorkingHours || ''}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{accountData.startWorkingHours || '09:00'}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>End Working Hours</label>
                        {editing ? (
                            <input
                                type="time"
                                name="endWorkingHours"
                                value={formData.endWorkingHours || ''}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{accountData.endWorkingHours || '17:00'}</p>
                        )}
                    </div>

                    <div className="info-group">
                        <label>Google Calendar</label>
                        <p>{googleCalendarLinked ? 'Connected' : 'Not connected'}</p>
                        <div className="google-calendar-actions">
                            {!googleCalendarLinked ? (
                                <button
                                    type="button"
                                    className="connect-btn"
                                    onClick={handleConnectGoogleCalendar}
                                    disabled={googleCalendarLoading}
                                >
                                    {googleCalendarLoading ? 'Connecting…' : 'Connect Google Calendar'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="disconnect-btn"
                                    onClick={handleDisconnectGoogleCalendar}
                                    disabled={googleCalendarLoading}
                                >
                                    {googleCalendarLoading ? 'Disconnecting…' : 'Disconnect Google Calendar'}
                                </button>
                            )}
                        </div>
                    </div>

                </div>

                {googleCalendarMessage && <div className="google-message" role="status" aria-live="polite">{googleCalendarMessage}</div>}

                <div className="account-actions">
                    {!editing ? (
                        <>
                            <button type="button" className="edit-btn" onClick={() => setEditing(true)}>Edit Profile</button>
                            <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="save-btn" onClick={handleSaveChanges}>Save Changes</button>
                            <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}

export default Account;
