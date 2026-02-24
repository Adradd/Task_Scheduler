import logo from '../assets/logo.svg'

function Navbar({ user, onLogout }) {
    return (
        <header>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
                <img src={logo} alt={"schedule.me Logo"} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {user && (
                        <>
                            <span style={{ color: '#333', fontWeight: '500' }}>Welcome, {user.username}!</span>
                            <button
                                onClick={onLogout}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#764ba2'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
                            >
                                Logout
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Navbar

