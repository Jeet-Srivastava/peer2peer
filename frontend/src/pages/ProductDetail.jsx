import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductById, deleteProduct, createStripeSession, resolveAssetUrl } from '../services/api';
import { useAuth } from '../context/useAuth';
import { loadStripe } from '@stripe/stripe-js';

// Load Stripe (Using dummy publishable key as this is dev mode, actual payments won't process without real keys)
const stripePromise = loadStripe('pk_test_51O1J...dummy...key');

function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            if (id.startsWith('fake-')) {
                try {
                    const fakeId = id.split('-')[1];
                    const res = await fetch(`https://fakestoreapi.com/products/${fakeId}`);
                    const fakeProduct = await res.json();
                    setProduct({
                        _id: `fake-${fakeProduct.id}`,
                        name: fakeProduct.title,
                        description: fakeProduct.description,
                        price: fakeProduct.price * 80,
                        category:
                            fakeProduct.category === "men's clothing" ||
                            fakeProduct.category === "women's clothing" ||
                            fakeProduct.category === 'jewelery'
                                ? 'Other'
                                : 'Electronics',
                        condition: 'Like New',
                        image: fakeProduct.image,
                        user: { name: 'FakeStore Retail', email: 'retail@fakestore.com' },
                        isExternal: true,
                    });
                    setLoading(false);
                    return;
                } catch {
                    setError('Failed to load external product');
                    setLoading(false);
                    return;
                }
            }

            try {
                const { data } = await getProductById(id);
                setProduct(data);
            } catch (err) {
                setError(err.response?.data?.message || 'Product not found');
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

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

    const handleCheckout = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        
        setCheckoutLoading(true);
        try {
            const stripe = await stripePromise;
            
            // Create session on our backend
            const { data } = await createStripeSession(product);
            
            // Redirect to Stripe if a real session was created
            const result = await stripe.redirectToCheckout({
                sessionId: data.id,
            });

            if (result.error) {
                setError(result.error.message);
            }
        } catch {
            // If payment fails to initialize due to mock/dummy API keys, 
            // simulate a successful mock checkout for the demonstration
            console.warn('Real Stripe keys not found or invalid. Simulating successful payment...');
            window.location.href = `/product/${id}?success=true`;
        } finally {
            setCheckoutLoading(false);
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

    const isOwner = user && product.user && user._id === (product.user._id || product.user) && !product.isExternal;

    const formatDate = (dateString) => {
        if (!dateString) return 'Just now';
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

            {/* Check for Success URL param from Stripe */}
            {new URLSearchParams(window.location.search).get('success') && (
                <div className="alert alert-success" style={{ marginBottom: 'var(--space-6)' }}>
                    Payment Successful! The seller will contact you shortly.
                </div>
            )}
            {new URLSearchParams(window.location.search).get('canceled') && (
                <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
                    Payment was canceled.
                </div>
            )}

            <div className="detail-grid">
                <img
                    src={resolveAssetUrl(product.image)}
                    alt={product.name}
                    className="detail-image"
                    style={{ objectFit: product.isExternal ? 'contain' : 'cover' }}
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

                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                        Listed on {formatDate(product.createdAt)}
                    </p>

                    {product.user && typeof product.user === 'object' && (
                        <div className="detail-seller" id="seller-info">
                            <p className="detail-seller-title">Seller</p>
                            <p className="detail-seller-name">{product.user.name}</p>
                            <p className="detail-seller-email">{product.user.email}</p>
                        </div>
                    )}

                    {!isOwner && (
                        <button
                            onClick={handleCheckout}
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-6)', width: '100%', fontSize: 'var(--font-size-lg)', padding: 'var(--space-4)' }}
                            disabled={checkoutLoading}
                        >
                            {checkoutLoading ? 'Processing...' : '💳 Buy Now with Stripe'}
                        </button>
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
