import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute ({ isAuthenticated, children }) {
    const location = useLocation();

    if (!isAuthenticated) {
        const routeLabelMap = {
            '/task-view': 'Tasks',
            '/calendar-view': 'Calendar',
            '/account': 'Account',
        };
        const destinationLabel = routeLabelMap[location.pathname] || 'this page';

        return (
            <Navigate
                to="/login"
                replace
                state={{ authMessage: `Please sign in to access ${destinationLabel}.` }}
            />
        );
    }
    return children;
}
