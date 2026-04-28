import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from './pages/ProductDetail';
import CreateListing from './pages/CreateListing';
import Profile from './pages/Profile';
import MyListings from './pages/MyListings';
import ProtectedRoute from './components/ProtectedRoute';
import SellerRoute from './components/SellerRoute';

function App() {
    return (
        <div className="app">
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route
                        path="/create"
                        element={
                            <SellerRoute>
                                <CreateListing />
                            </SellerRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/my-listings"
                        element={
                            <SellerRoute>
                                <MyListings />
                            </SellerRoute>
                        }
                    />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App;
