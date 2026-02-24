import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

function Login({ onLoginSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = validateForm();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post(`${backendUrl}/api/accounts/login`, {
                username: formData.username,
                password: formData.password
            });

            console.log('Login response:', response.data);

            // Store auth credentials in localStorage
            localStorage.setItem('authToken', btoa(`${formData.username}:${formData.password}`));
            localStorage.setItem('username', response.data.username);
            localStorage.setItem('accountId', response.data.accountId);
            localStorage.setItem('role', response.data.role);

            // Call the callback to update parent state
            if (typeof onLoginSuccess === 'function') {
                onLoginSuccess(response.data);
            } else {
                console.error('onLoginSuccess is not a function:', onLoginSuccess);
            }

            // Navigate to task view
            navigate('/task-view');
        } catch (err) {
            console.error('Login error:', err);
            console.error('Error response:', err.response);
            console.error('Backend URL:', backendUrl);

            let errorMessage = 'Login failed. Please try again.';

            if (err.response) {
                // Backend responded with error
                errorMessage = err.response.data?.error || err.response.statusText || 'Server error';
            } else if (err.request) {
                // Request was made but no response
                errorMessage = 'No response from server. Is the backend running on ' + backendUrl + '?';
            } else {
                // Other error
                errorMessage = err.message;
            }

            setErrors({ submit: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Login</h1>
                {errors.submit && <div className="error-message">{errors.submit}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username"
                            className={errors.username ? 'input-error' : ''}
                        />
                        {errors.username && <span className="field-error">{errors.username}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password"
                            className={errors.password ? 'input-error' : ''}
                        />
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="register-link">
                    <p>Don't have an account? <button type="button" onClick={() => navigate('/register')} className="link-btn">Create one</button></p>
                </div>
            </div>
        </div>
    );
}

export default Login;

