import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import './styles/App.css'
import './styles/Pomodoro.css'
import Home from "./pages/Home.jsx";
import TaskView from "./pages/TaskView.jsx";
import CalendarView from "./pages/CalendarView.jsx";
import Account from "./pages/Account.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { PomodoroProvider } from './components/pomodoro/PomodoroProvider.jsx';
import PomodoroFloatingWidget from './components/pomodoro/PomodoroFloatingWidget.jsx';
import PomodoroFullTimer from './components/pomodoro/PomodoroFullTimer.jsx';

function App() {
    const [user, setUser] = useState(() => {
        const storedUsername = sessionStorage.getItem('username');
        if (!storedUsername) {
            return null;
        }

        return {
            username: storedUsername,
            accountId: sessionStorage.getItem('accountId'),
            role: sessionStorage.getItem('role')
        };
    });
    const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('username')));

    const handleLoginSuccess = (userData) => {
        console.log('Login successful, user data:', userData);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleRegisterSuccess = () => {
        // User will navigate to login after successful registration
    };

    const handleLogout = () => {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('accountId');
        sessionStorage.removeItem('role');
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <Router>
            <PomodoroProvider
                config={{
                    focusDurationMinutes: 25,
                    shortBreakMinutes: 5,
                    longBreakMinutes: 20,
                    focusPerLongBreak: 4,
                }}
            >
                <AppContent
                    isAuthenticated={isAuthenticated}
                    user={user}
                    onLoginSuccess={handleLoginSuccess}
                    onRegisterSuccess={handleRegisterSuccess}
                    onLogout={handleLogout}
                />
            </PomodoroProvider>
        </Router>
    )
}

function AppContent({ isAuthenticated, user, onLoginSuccess, onRegisterSuccess, onLogout }) {
    const location = useLocation();
    const showNavbar = !['/login', '/register'].includes(location.pathname);
    const showPomodoro = isAuthenticated && ['/task-view', '/calendar-view'].includes(location.pathname);

    return (
        <>
            {showNavbar && (
                <nav className="navbar">
                    <ul className="nav-list">
                        <li className="nav-item">
                            <Link to="/task-view" className={location.pathname === '/task-view' ? 'active' : ''}>Tasks</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/calendar-view" className={location.pathname === '/calendar-view' ? 'active' : ''}>Calendar</Link>
                        </li>
                        <li className={"nav-item"}>
                            <Link to="/account" className={location.pathname === '/account' ? 'active' : ''}>Account</Link>
                        </li>
                        <li className="nav-item-logo-item">
                            <Link to="/" className={"logo-home-link"}><span className={"site-logo"}>schedule.me</span></Link>
                        </li>
                    </ul>
                </nav>
            )}

            <div className="content">
                <Routes>
                    <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
                    <Route path="/task-view" element={<ProtectedRoute isAuthenticated={isAuthenticated}><TaskView user={user} /></ProtectedRoute>} />
                    <Route path="/calendar-view" element={<ProtectedRoute isAuthenticated={isAuthenticated}><CalendarView user={user} /></ProtectedRoute>} />
                    <Route path="/account" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Account user={user} onLogout={onLogout} /></ProtectedRoute>} />
                    <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
                    <Route path="/register" element={<Register onRegisterSuccess={onRegisterSuccess} />} />
                </Routes>
            </div>

            {showPomodoro && <PomodoroFloatingWidget />}
            {showPomodoro && <PomodoroFullTimer />}
        </>
    )
}

export default App
