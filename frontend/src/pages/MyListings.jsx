import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { getProducts, deleteProduct } from '../services/api';
import ProductCard from '../components/ProductCard';

function MyListings() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchMyProducts = async () => {
            try {
                const { data } = await getProducts();
                const myProducts = data.filter((product) => {
                    const productUserId = product.user?._id || product.user;
                    return productUserId === user?._id;
                });
                setProducts(myProducts);
            } catch {
                setError('Failed to load your listings');
            } finally {
                setLoading(false);
            }
        };

        fetchMyProducts();
    }, [user?._id]);

    const handleDelete = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this listing?')) {
            return;
        }

        try {
            await deleteProduct(productId);
            setProducts((currentProducts) =>
                currentProducts.filter((product) => product._id !== productId)
            );
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

    return (
        <div className="container" style={{ padding: 'var(--space-10) var(--space-6)' }} id="my-listings-page">
            <div className="section-header">
                <h1 className="section-title">My Listings</h1>
                <Link to="/create" className="btn btn-primary" id="new-listing-btn">
                    + New Listing
                </Link>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {products.length === 0 ? (
                <div className="empty-state" id="no-listings">
                    <div className="empty-state-icon">🏷️</div>
                    <h3 className="empty-state-title">No listings yet</h3>
                    <p className="empty-state-text">Start selling by creating your first listing</p>
                    <Link
                        to="/create"
                        className="btn btn-primary"
                        style={{ marginTop: 'var(--space-4)' }}
                    >
                        Create Listing
                    </Link>
                </div>
            ) : (
                <div className="product-grid" id="my-products-grid">
                    {products.map((product) => (
                        <div key={product._id} style={{ position: 'relative' }}>
                            <ProductCard product={product} />
                            <button
                                onClick={() => handleDelete(product._id)}
                                className="btn btn-danger btn-sm"
                                style={{
                                    position: 'absolute',
                                    top: 'var(--space-3)',
                                    right: 'var(--space-3)',
                                    zIndex: 10,
                                }}
                                id={`delete-${product._id}`}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyListings;
