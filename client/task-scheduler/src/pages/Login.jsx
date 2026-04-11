import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';
import { extractApiErrorMessage } from '../utils/api.js';

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

            if (typeof onLoginSuccess === 'function') {
                onLoginSuccess({
                    userData: response.data,
                    credentials: {
                        username: formData.username,
                        password: formData.password,
                    },
                });
            }

            navigate('/task-view');
        } catch (err) {
            let errorMessage = 'Login failed. Please try again.';
            if (err.request && !err.response) {
                errorMessage = 'No response from server. Is the backend running on ' + backendUrl + '?';
            } else if (err.response) {
                errorMessage = extractApiErrorMessage(err, 'Server error');
            }

            setErrors({ submit: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-container">
            <section className="login-card" aria-labelledby="login-title">
                <h1 id="login-title">Login</h1>
                {errors.submit && <div className="error-message" role="alert">{errors.submit}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            autoComplete="username"
                            spellCheck={false}
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username…"
                            className={errors.username ? 'input-error' : ''}
                            aria-invalid={Boolean(errors.username)}
                            aria-describedby={errors.username ? 'login-username-error' : undefined}
                        />
                        {errors.username && <span id="login-username-error" className="field-error">{errors.username}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password…"
                            className={errors.password ? 'input-error' : ''}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? 'login-password-error' : undefined}
                        />
                        {errors.password && <span id="login-password-error" className="field-error">{errors.password}</span>}
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging In…' : 'Login'}
                    </button>
                </form>

                <div className="register-link">
                    <p>Don't have an account? <button type="button" onClick={() => navigate('/register')} className="link-btn">Create one</button></p>
                </div>
            </section>
        </main>
    );
}

export default Login;
