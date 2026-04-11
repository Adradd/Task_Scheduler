import { useCallback, useState } from 'react';
import { clearUserSession, getStoredUser, storeUserSession } from '../utils/authSession.js';

function useAuthSession() {
    const [user, setUser] = useState(() => getStoredUser());

    const login = useCallback((userData, credentials) => {
        const nextUser = storeUserSession(userData, credentials) || null;
        setUser(nextUser);
        return nextUser;
    }, []);

    const logout = useCallback(() => {
        clearUserSession();
        setUser(null);
    }, []);

    return {
        user,
        isAuthenticated: Boolean(user?.username),
        login,
        logout,
    };
}

export default useAuthSession;
