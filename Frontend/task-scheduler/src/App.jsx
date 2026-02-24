import { useState, useEffect } from 'react'
import './App.css'
import Navbar from "./components/Navbar.jsx";
import TaskView from "./components/TaskView.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Footer from "./components/Footer.jsx";

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('login'); // 'login', 'register', or 'tasks'

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
            setCurrentView('tasks');
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
        setCurrentView('tasks');
    };

    const handleRegisterSuccess = () => {
        setCurrentView('login');
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('accountId');
        localStorage.removeItem('role');
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView('login');
    };

    const switchToRegister = () => {
        setCurrentView('register');
    };

    const switchToLogin = () => {
        setCurrentView('login');
    };

    return (
        <>
            {isAuthenticated && currentView === 'tasks' && (
                <>
                    <Navbar user={user} onLogout={handleLogout} />
                    <TaskView user={user} />
                    <Footer />
                </>
            )}
            {!isAuthenticated && currentView === 'login' && (
                <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={switchToRegister} />
            )}
            {!isAuthenticated && currentView === 'register' && (
                <Register onRegisterSuccess={handleRegisterSuccess} />
            )}
        </>
    )
}

export default App
