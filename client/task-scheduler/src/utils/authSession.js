const SESSION_KEYS = {
    accountId: 'accountId',
    authToken: 'authToken',
    role: 'role',
    username: 'username',
};

export function getStoredUser() {
    if (typeof window === 'undefined') {
        return null;
    }

    const username = window.sessionStorage.getItem(SESSION_KEYS.username);
    if (!username) {
        return null;
    }

    return {
        username,
        accountId: window.sessionStorage.getItem(SESSION_KEYS.accountId),
        role: window.sessionStorage.getItem(SESSION_KEYS.role),
    };
}

export function storeUserSession(userData, credentials) {
    if (typeof window === 'undefined') {
        return null;
    }

    if (credentials?.username && credentials?.password) {
        window.sessionStorage.setItem(
            SESSION_KEYS.authToken,
            window.btoa(`${credentials.username}:${credentials.password}`),
        );
    }

    if (userData?.username) {
        window.sessionStorage.setItem(SESSION_KEYS.username, userData.username);
    }

    if (userData?.accountId) {
        window.sessionStorage.setItem(SESSION_KEYS.accountId, userData.accountId);
    }

    if (userData?.role) {
        window.sessionStorage.setItem(SESSION_KEYS.role, userData.role);
    }

    return getStoredUser();
}

export function clearUserSession() {
    if (typeof window === 'undefined') {
        return;
    }

    Object.values(SESSION_KEYS).forEach((key) => {
        window.sessionStorage.removeItem(key);
    });
}

export function getStoredAccountId() {
    if (typeof window === 'undefined') {
        return '';
    }

    return window.sessionStorage.getItem(SESSION_KEYS.accountId) || '';
}

export function createAuthConfig() {
    if (typeof window === 'undefined') {
        return {};
    }

    const authToken = window.sessionStorage.getItem(SESSION_KEYS.authToken);
    if (!authToken) {
        return {};
    }

    return {
        headers: {
            Authorization: `Basic ${authToken}`,
        },
    };
}
