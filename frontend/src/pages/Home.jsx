import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
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
        let filtered = [...products];

        if (activeCategory !== 'All') {
            filtered = filtered.filter((product) => product.category === activeCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (product) =>
                    product.name.toLowerCase().includes(query) ||
                    product.description.toLowerCase().includes(query)
            );
        }

        setFilteredProducts(filtered);
    }, [activeCategory, searchQuery, products]);

    const fetchProducts = async () => {
        try {
            // Fetch internal products
            const { data: localProducts } = await getProducts();
            
            // Fetch external dummy products
            const fakeStoreRes = await fetch('https://fakestoreapi.com/products?limit=6');
            const fakeProducts = await fakeStoreRes.json();
            
            // Map FakeStore products to our ProductSchema format to reuse ProductCard
            const mappedFakeProducts = fakeProducts.map(fp => ({
                _id: `fake-${fp.id}`, // Custom ID to avoid collisions
                name: fp.title,
                description: fp.description,
                price: fp.price * 80, // Approximate USD to INR conversion
                category: fp.category === "men's clothing" || fp.category === "women's clothing" ? 'Other' : 
                          fp.category === "jewelery" ? 'Other' : 'Electronics', // Map to our enum
                condition: 'Like New', // Default for new retail items
                image: fp.image,
                user: { name: 'FakeStore Retail', email: 'retail@fakestore.com' },
                isExternal: true // Flag to hide delete buttons etc.
            }));

            // Merge both
            setProducts([...localProducts, ...mappedFakeProducts]);
            
        } catch (err) {
            setError('Failed to load products');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero" id="hero-section">
                <div className="hero-bg-wrapper"></div>
                <div className="hero-overlay"></div>
                <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="hero-content animate-fade-up">
                        <h1 className="hero-title">
                            Next-gen campus <br />
                            <span className="accent">commerce</span>
                        </h1>
                        <p className="hero-subtitle">
                            The definitive marketplace tailored exclusively for verified college students. 
                            Trade laptops, design books, cycles, and more with zero friction.
                        </p>
                        <div className="hero-actions">
                            <a href="#products-section" className="btn btn-primary btn-lg">
                                Explore Inventory
                            </a>
                            {!user && (
                                <Link to="/register" className="btn btn-secondary btn-lg">
                                    Join the Network
                                </Link>
                            )}
                        </div>
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
