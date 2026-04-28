import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getProfile } from '../services/api';

function Profile() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data } = await getProfile();
                setProfile(data);
            } catch {
                setProfile(user);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    const userData = profile || user;
    const initials = userData?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="container profile-page" id="profile-page">
            <h1 className="section-title" style={{ marginBottom: 'var(--space-8)' }}>My Profile</h1>

            <div className="profile-card">
                <div className="profile-avatar" id="profile-avatar">{initials}</div>
                <h2 className="profile-name" id="profile-name">{userData?.name}</h2>
                <p className="profile-email" id="profile-email">{userData?.email}</p>

                <div className="profile-meta">
                    <div className="profile-meta-item">
                        <p className="profile-meta-value">{userData?.role || 'student'}</p>
                        <p className="profile-meta-label">Role</p>
                    </div>
                    <div className="profile-meta-item">
                        <p className="profile-meta-value">{userData?.isVerified ? 'Yes' : 'No'}</p>
                        <p className="profile-meta-label">Verified</p>
                    </div>
                    <div className="profile-meta-item">
                        <p className="profile-meta-value">{formatDate(userData?.createdAt)}</p>
                        <p className="profile-meta-label">Joined</p>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
                <Link to="/my-listings" className="btn btn-secondary">View My Listings</Link>
                <Link to="/create" className="btn btn-primary">Sell an Item</Link>
                <button onClick={logout} className="btn btn-danger" id="logout-button">Logout</button>
            </div>
        </div>
    );
}

export default Profile;
