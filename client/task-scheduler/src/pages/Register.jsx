import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Register.css';
import { extractApiErrorMessage } from '../utils/api.js';

export default function Register ({ onRegisterSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
            newErrors.username = 'Username can only contain letters, numbers, and underscores';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password)) {
            newErrors.password = 'Password must contain both uppercase and lowercase letters';
        } else if (!/[0-9]/.test(formData.password)) {
            newErrors.password = 'Password must contain at least one number';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
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
        setSuccessMessage('');

        try {
            await axios.post(`${backendUrl}/api/accounts`, {
                username: formData.username,
                email: formData.email,
                password: formData.password
            });

            setSuccessMessage('Account created successfully! Redirecting to login...');
            setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: ''
            });
            setErrors({});
            onRegisterSuccess?.();

            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            const errorMessage = extractApiErrorMessage(err, 'Registration failed. Please try again.');
            setErrors({ submit: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="register-container">
            <section className="register-card" aria-labelledby="register-title">
                <h1 id="register-title">Create Account</h1>
                {successMessage && <div className="success-message" role="status" aria-live="polite">{successMessage}</div>}
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
                            aria-describedby={errors.username ? 'register-username-error' : undefined}
                        />
                        {errors.username && <span id="register-username-error" className="field-error">{errors.username}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            spellCheck={false}
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter email…"
                            className={errors.email ? 'input-error' : ''}
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? 'register-email-error' : undefined}
                        />
                        {errors.email && <span id="register-email-error" className="field-error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password…"
                            className={errors.password ? 'input-error' : ''}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? 'register-password-error register-password-help' : 'register-password-help'}
                        />
                        {errors.password && <span id="register-password-error" className="field-error">{errors.password}</span>}
                        <p id="register-password-help" className="password-requirements">
                            Password must have: 8+ characters, uppercase, lowercase, and a number
                        </p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm password…"
                            className={errors.confirmPassword ? 'input-error' : ''}
                            aria-invalid={Boolean(errors.confirmPassword)}
                            aria-describedby={errors.confirmPassword ? 'register-confirm-password-error' : undefined}
                        />
                        {errors.confirmPassword && <span id="register-confirm-password-error" className="field-error">{errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Creating Account…' : 'Create Account'}
                    </button>
                </form>
            </section>
        </main>
    );
}
