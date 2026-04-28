import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useState, useEffect } from 'react';

function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path) => location.pathname === path;

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="main-navbar">
            <div className="navbar-inner">
                <Link to="/" className="navbar-brand">
                    <span className="brand-icon">P2P</span>
                    peer2peer
                </Link>

                <div className="navbar-links">
                    <Link
                        to="/"
                        className={`nav-link ${isActive('/') ? 'active' : ''}`}
                        id="nav-home"
                    >
                        Browse
                    </Link>

                    {user ? (
                        <>
                            {user.role === 'seller' && (
                                <>
                                    <Link
                                        to="/create"
                                        className={`nav-link ${isActive('/create') ? 'active' : ''}`}
                                        id="nav-create"
                                    >
                                        Sell Item
                                    </Link>
                                    <Link
                                        to="/my-listings"
                                        className={`nav-link ${isActive('/my-listings') ? 'active' : ''}`}
                                        id="nav-listings"
                                    >
                                        My Listings
                                    </Link>
                                </>
                            )}
                            <Link
                                to="/profile"
                                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
                                id="nav-profile"
                            >
                                Profile
                            </Link>
                            <button
                                onClick={logout}
                                className="btn btn-secondary btn-sm"
                                id="nav-logout"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                                id="nav-login"
                            >
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm" id="nav-register">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
