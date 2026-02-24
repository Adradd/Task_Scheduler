import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import './styles/App.css'
import Home from "./pages/Home.jsx";
import TaskView from "./pages/TaskView.jsx";
import CalendarView from "./pages/CalendarView.jsx";
import Account from "./pages/Account.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    // Check if user is already logged in on component mount
    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setIsAuthenticated(true);
            setUser({
                username: storedUsername,
                accountId: localStorage.getItem('accountId'),
                role: localStorage.getItem('role')
            });
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
    };

    const handleRegisterSuccess = () => {
        // User will navigate to login after successful registration
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('accountId');
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <Router>
            <AppContent
                isAuthenticated={isAuthenticated}
                user={user}
                onLoginSuccess={handleLoginSuccess}
                onRegisterSuccess={handleRegisterSuccess}
                onLogout={handleLogout}
            />
        </Router>
    )
}

function AppContent({ isAuthenticated, user, onLoginSuccess, onRegisterSuccess, onLogout }) {
    const location = useLocation();
    const showNavbar = !['/login', '/register'].includes(location.pathname);

    return (
        <>
            {showNavbar && (
                <nav className="navbar">
                    <ul className="nav-list">
                        <li className="nav-item-logo-item">
                            <Link to="/" className={"logo-home-link"}><span className={"site-logo"}>schedule.me</span></Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/task-view">Tasks</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/calendar-view">Calendar</Link>
                        </li>
                        <li className={"nav-item"}>
                            <Link to="/account">Account</Link>
                        </li>
                    </ul>
                </nav>
            )}

            <div className="content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/task-view" element={<TaskView user={user} />} />
                    <Route path="/calendar-view" element={<CalendarView />} />
                    <Route path="/account" element={<Account user={user} />} />
                    <Route path="/login" element={<Login onLoginSuccess={onLoginSuccess} />} />
                    <Route path="/register" element={<Register onRegisterSuccess={onRegisterSuccess} />} />
                </Routes>
            </div>
        </>
    )
}

export default App
