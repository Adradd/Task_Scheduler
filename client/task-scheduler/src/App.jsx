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
import useAuthSession from './hooks/useAuthSession.js';
import taskIcon from './assets/task.svg';
import calendarIcon from './assets/calendar.svg';
import accountIcon from './assets/account.svg';

export default function App () {
    const { user, isAuthenticated, login, logout } = useAuthSession();

    const handleLoginSuccess = ({ credentials, userData }) => {
        login(userData, credentials);
    };

    const handleRegisterSuccess = () => {

    };

    const handleLogout = () => {
        logout();
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
            <a className="skip-link" href="#app-main-content">Skip to Content</a>
            {showNavbar && (
                <nav className="navbar" aria-label="Primary">
                    <ul className="nav-list">
                        <li className="nav-item">
                            <Link to="/task-view" className={location.pathname === '/task-view' ? 'active nav-link-with-icon' : 'nav-link-with-icon'}>
                                <img className="nav-icon" src={taskIcon} alt="" aria-hidden="true" />
                                <span>Tasks</span>
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/calendar-view" className={location.pathname === '/calendar-view' ? 'active nav-link-with-icon' : 'nav-link-with-icon'}>
                                <img className="nav-icon" src={calendarIcon} alt="" aria-hidden="true" />
                                <span>Calendar</span>
                            </Link>
                        </li>
                        <li className={"nav-item"}>
                            <Link to="/account" className={location.pathname === '/account' ? 'active nav-link-with-icon' : 'nav-link-with-icon'}>
                                <img className="nav-icon" src={accountIcon} alt="" aria-hidden="true" />
                                <span>Account</span>
                            </Link>
                        </li>
                        <li className="nav-item-logo-item">
                            <Link to="/" className={"logo-home-link"}><span className={"site-logo"}>schedule.me</span></Link>
                        </li>
                    </ul>
                </nav>
            )}

            <main id="app-main-content" className="content">
                <Routes>
                    <Route path="/" element={<Home isAuthenticated={isAuthenticated} />} />
                    <Route path="/task-view" element={<ProtectedRoute isAuthenticated={isAuthenticated}><TaskView user={user} /></ProtectedRoute>} />
                    <Route path="/calendar-view" element={<ProtectedRoute isAuthenticated={isAuthenticated}><CalendarView user={user} /></ProtectedRoute>} />
                    <Route path="/account" element={<ProtectedRoute isAuthenticated={isAuthenticated}><Account user={user} onLogout={onLogout} /></ProtectedRoute>} />
                    <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
                    <Route path="/register" element={<Register onRegisterSuccess={onRegisterSuccess} />} />
                </Routes>
            </main>

            {showPomodoro && <PomodoroFloatingWidget />}
            {showPomodoro && <PomodoroFullTimer />}
        </>
    )
}
