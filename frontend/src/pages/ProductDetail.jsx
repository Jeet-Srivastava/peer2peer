import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, deleteProduct } from '../services/api';
import { useAuth } from '../context/AuthContext';

function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const { data } = await getProductById(id);
            setProduct(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Product not found');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this listing?')) {
            return;
        }

        try {
            await deleteProduct(id);
            navigate('/my-listings');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete product');
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="container detail-page">
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3 className="empty-state-title">{error || 'Product not found'}</h3>
                    <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const isOwner = user && product.user && user._id === (product.user._id || product.user);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="container detail-page" id="product-detail">
            <button
                onClick={() => navigate(-1)}
                className="btn btn-secondary btn-sm"
                style={{ marginBottom: 'var(--space-6)' }}
                id="back-button"
            >
                ← Back
            </button>

            <div className="detail-grid">
                <img
                    src={product.image?.startsWith('/') ? `http://localhost:3000${product.image}` : product.image}
                    alt={product.name}
                    className="detail-image"
                    onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=600&background=f0eeff&color=6c5ce7&bold=true`;
                    }}
                />

                <div className="detail-info">
                    <div className="card-meta" style={{ marginBottom: 'var(--space-4)', marginTop: 0 }}>
                        <span className="badge badge-category">{product.category}</span>
                        <span className="badge badge-condition">{product.condition}</span>
                    </div>

                    <h1 className="detail-title" id="detail-title">{product.name}</h1>
                    <p className="detail-price" id="detail-price">₹{product.price?.toLocaleString('en-IN')}</p>
                    <p className="detail-description">{product.description}</p>

                    {product.createdAt && (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                            Listed on {formatDate(product.createdAt)}
                        </p>
                    )}

                    {product.user && typeof product.user === 'object' && (
                        <div className="detail-seller" id="seller-info">
                            <p className="detail-seller-title">Seller</p>
                            <p className="detail-seller-name">{product.user.name}</p>
                            <p className="detail-seller-email">{product.user.email}</p>
                        </div>
                    )}

                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            className="btn btn-danger"
                            style={{ marginTop: 'var(--space-6)' }}
                            id="delete-button"
                        >
                            Delete Listing
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProductDetail;
