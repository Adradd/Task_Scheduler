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
    const [googleCalendarLinked, setGoogleCalendarLinked] = useState(false);
    const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false);
    const [googleCalendarMessage, setGoogleCalendarMessage] = useState('');
    const [googleCalendars, setGoogleCalendars] = useState([]);
    const [projectMappings, setProjectMappings] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [googleMappingsLoading, setGoogleMappingsLoading] = useState(false);
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Create auth config from stored credentials
    const getAuthConfig = () => {
        const authToken = sessionStorage.getItem('authToken');
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
            const accountId = sessionStorage.getItem('accountId');
            const res = await axios.get(`${backendUrl}/api/accounts/${accountId}`, getAuthConfig());
            const normalized = {
                ...res.data,
                startWorkingHours: res.data?.startWorkingHours || '09:00',
                endWorkingHours: res.data?.endWorkingHours || '17:00',
            };
            setAccountData(normalized);
            setFormData(normalized);
        } catch (err) {
            setError('Failed to fetch account details: ' + (err.response?.data?.message || err.message));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGoogleCalendarStatus = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/integrations/google/status`, getAuthConfig());
            const linked = Boolean(res.data?.linked);
            setGoogleCalendarLinked(linked);
            if (linked) {
                await fetchGoogleMappingsData();
            }
        } catch (err) {
            console.error('Failed to fetch Google Calendar status', err);
        }
    };

    const fetchGoogleMappingsData = async () => {
        try {
            setGoogleMappingsLoading(true);
            const [calendarsRes, mappingsRes, projectsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/integrations/google/calendars`, getAuthConfig()),
                axios.get(`${backendUrl}/api/integrations/google/project-mappings`, getAuthConfig()),
                axios.get(`${backendUrl}/api/projects`, getAuthConfig()),
            ]);

            const calendars = (calendarsRes.data?.calendars || []).map((calendar) => ({
                googleCalendarId: calendar.id,
                googleCalendarName: calendar.summary || calendar.id,
            }));
            const mappingsByCalendarId = new Map((mappingsRes.data?.mappings || []).map((mapping) => [mapping.googleCalendarId, mapping]));

            setGoogleCalendars(calendars);
            setProjectMappings(calendars.map((calendar) => {
                const existing = mappingsByCalendarId.get(calendar.googleCalendarId);
                return {
                    googleCalendarId: calendar.googleCalendarId,
                    googleCalendarName: calendar.googleCalendarName,
                    projectId: existing?.projectId || '',
                    enabled: existing?.enabled ?? false,
                };
            }));
            setAvailableProjects(projectsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch Google mapping data', err);
            if (err.response?.data?.reconnectRequired) {
                setGoogleCalendarMessage(err.response.data.error || 'Google authorization is outdated. Disconnect and reconnect Google Calendar.');
            } else {
                setGoogleCalendarMessage('Failed to load Google calendar mappings.');
            }
        } finally {
            setGoogleMappingsLoading(false);
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
            const accountId = sessionStorage.getItem('accountId');
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

    const handleConnectGoogleCalendar = async () => {
        try {
            setGoogleCalendarLoading(true);
            setGoogleCalendarMessage('');
            const res = await axios.get(`${backendUrl}/api/integrations/google/connect`, getAuthConfig());
            if (!res.data?.authorizationUrl) {
                setGoogleCalendarMessage('Failed to start Google Calendar connection.');
                return;
            }
            window.location.href = res.data.authorizationUrl;
        } catch (err) {
            setGoogleCalendarMessage('Failed to start Google Calendar connection.');
            console.error(err);
        } finally {
            setGoogleCalendarLoading(false);
        }
    };

    const handleDisconnectGoogleCalendar = async () => {
        try {
            setGoogleCalendarLoading(true);
            setGoogleCalendarMessage('');
            await axios.delete(`${backendUrl}/api/integrations/google/disconnect`, getAuthConfig());
            setGoogleCalendarLinked(false);
            setGoogleCalendarMessage('Google Calendar disconnected.');
            setGoogleCalendars([]);
            setProjectMappings([]);
        } catch (err) {
            setGoogleCalendarMessage('Failed to disconnect Google Calendar.');
            console.error(err);
        } finally {
            setGoogleCalendarLoading(false);
        }
    };

    const handleMappingChange = (calendarId, field, value) => {
        setProjectMappings((prev) => prev.map((mapping) => (
            mapping.googleCalendarId === calendarId
                ? { ...mapping, [field]: value }
                : mapping
        )));
    };

    const handleToggleMappingEnabled = async (calendarId) => {
        const mapping = projectMappings.find((item) => item.googleCalendarId === calendarId);
        if (!mapping) {
            return;
        }

        const updatedMapping = {
            ...mapping,
            enabled: !mapping.enabled,
        };

        const updatedMappings = projectMappings.map((item) => (
            item.googleCalendarId === calendarId ? updatedMapping : item
        ));

        try {
            setGoogleMappingsLoading(true);
            setProjectMappings(updatedMappings);

            await axios.put(`${backendUrl}/api/integrations/google/project-mappings`, {
                mappings: [updatedMapping],
            }, getAuthConfig());

            setGoogleCalendarMessage(`Calendar ${updatedMapping.enabled ? 'enabled' : 'disabled'}: ${updatedMapping.googleCalendarName}`);
        } catch (err) {
            setProjectMappings(projectMappings);
            setGoogleCalendarMessage('Failed to update calendar status.');
            console.error(err);
        } finally {
            setGoogleMappingsLoading(false);
        }
    };

    const handleSaveMappings = async () => {
        try {
            setGoogleMappingsLoading(true);
            await axios.put(`${backendUrl}/api/integrations/google/project-mappings`, {
                mappings: projectMappings,
            }, getAuthConfig());
            setGoogleCalendarMessage('Calendar mappings saved.');
        } catch (err) {
            setGoogleCalendarMessage('Failed to save calendar mappings.');
            console.error(err);
        } finally {
            setGoogleMappingsLoading(false);
        }
    };

    const handleImportMappedCalendars = async () => {
        try {
            setGoogleMappingsLoading(true);
            const res = await axios.post(`${backendUrl}/api/integrations/google/import-mapped-calendars`, {}, getAuthConfig());
            const importedCount = res.data?.importedCount || 0;
            setGoogleCalendarMessage(`Imported ${importedCount} event${importedCount === 1 ? '' : 's'} from mapped calendars.`);
        } catch (err) {
            setGoogleCalendarMessage('Failed to import mapped calendars.');
            console.error(err);
        } finally {
            setGoogleMappingsLoading(false);
        }
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
                        <p>{accountData.username}</p>
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
                                    {googleCalendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="disconnect-btn"
                                    onClick={handleDisconnectGoogleCalendar}
                                    disabled={googleCalendarLoading}
                                >
                                    {googleCalendarLoading ? 'Disconnecting...' : 'Disconnect Google Calendar'}
                                </button>
                            )}
                        </div>
                    </div>

                    {googleCalendarLinked && (
                        <div className="info-group google-mapping-section">
                            <label>Import Additional Calendars ({googleCalendars.length})</label>
                            {googleMappingsLoading ? (
                                <p>Loading calendar mappings...</p>
                            ) : (
                                <>
                                    {projectMappings.length === 0 ? (
                                        <p>No additional Google calendars found.</p>
                                    ) : (
                                        <div className="google-mapping-list">
                                            {projectMappings.map((mapping) => (
                                                <div key={mapping.googleCalendarId} className="google-mapping-row">
                                                    <div className="google-mapping-name">{mapping.googleCalendarName}</div>
                                                    <select
                                                        value={mapping.projectId}
                                                        onChange={(e) => handleMappingChange(mapping.googleCalendarId, 'projectId', e.target.value)}
                                                    >
                                                        <option value="">Select project</option>
                                                        {availableProjects.map((project) => (
                                                            <option key={project.projectId} value={project.projectId}>{project.projectName}</option>
                                                        ))}
                                                    </select>
                                                    <div className="google-mapping-toggle-row">
                                                        <span className={`google-mapping-status ${mapping.enabled ? 'is-enabled' : 'is-disabled'}`}>
                                                            {mapping.enabled ? 'Enabled' : 'Disabled'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className={`mapping-toggle-btn ${mapping.enabled ? 'mapping-toggle-btn-disable' : 'mapping-toggle-btn-enable'}`}
                                                            onClick={() => handleToggleMappingEnabled(mapping.googleCalendarId)}
                                                            disabled={googleMappingsLoading}
                                                        >
                                                            {mapping.enabled ? 'Disable' : 'Enable'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="google-mapping-actions">
                                        <button type="button" className="save-btn" onClick={handleSaveMappings} disabled={googleMappingsLoading}>Save Mappings</button>
                                        <button type="button" className="edit-btn" onClick={handleImportMappedCalendars} disabled={googleMappingsLoading}>Import Mapped Calendars</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {googleCalendarMessage && <div className="google-message">{googleCalendarMessage}</div>}

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
