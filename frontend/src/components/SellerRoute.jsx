import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function SellerRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'seller') {
        // If they are logged in but not a seller, redirect to home or show error
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🔒</div>
                <h3 className="empty-state-title">Seller Access Only</h3>
                <p className="empty-state-text">You must be registered as a Seller to access this page.</p>
            </div>
        );
    }

    return children;
}

export default SellerRoute;
