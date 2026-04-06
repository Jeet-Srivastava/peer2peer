import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';

const CATEGORIES = ['All', 'Electronics', 'Bicycles', 'Books', 'Furniture', 'Other'];

function Home() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        filterProducts();
    }, [activeCategory, searchQuery, products]);

    const fetchProducts = async () => {
        try {
            const { data } = await getProducts();
            setProducts(data);
        } catch (err) {
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const filterProducts = () => {
        let filtered = [...products];

        if (activeCategory !== 'All') {
            filtered = filtered.filter((p) => p.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query)
            );
        }

        setFilteredProducts(filtered);
    };

    return (
        <div>
            {/* Hero Section */}
            <section className="hero" id="hero-section">
                <div className="container">
                    <h1 className="hero-title">
                        Buy & sell within your <span className="accent">campus</span>
                    </h1>
                    <p className="hero-subtitle">
                        The trusted marketplace for college students. Find pre-owned laptops,
                        books, bicycles, and more at student-friendly prices.
                    </p>
                    <div className="hero-actions">
                        <a href="#products-section" className="btn btn-primary btn-lg">
                            Browse Listings
                        </a>
                        {!user && (
                            <Link to="/register" className="btn btn-secondary btn-lg">
                                Join Now
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Products Section */}
            <section className="container" id="products-section" style={{ paddingBottom: 'var(--space-16)' }}>
                <div className="section-header">
                    <h2 className="section-title">Latest Listings</h2>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '260px', paddingLeft: 'var(--space-4)' }}
                            id="search-input"
                        />
                    </div>
                </div>

                {/* Category Filters */}
                <div className="filters" id="category-filters">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                            id={`filter-${cat.toLowerCase()}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : error ? (
                    <div className="alert alert-error">{error}</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state" id="empty-state">
                        <div className="empty-state-icon">📦</div>
                        <h3 className="empty-state-title">No listings found</h3>
                        <p className="empty-state-text">
                            {searchQuery || activeCategory !== 'All'
                                ? 'Try adjusting your filters'
                                : 'Be the first to list an item!'}
                        </p>
                        {user && (
                            <Link
                                to="/create"
                                className="btn btn-primary"
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                Create Listing
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="product-grid" id="product-grid">
                        {filteredProducts.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

export default Home;
