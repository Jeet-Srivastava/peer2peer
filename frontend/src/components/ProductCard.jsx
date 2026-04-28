import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../services/api';

function ProductCard({ product }) {
    const conditionColors = {
        'Like New': '#2ecc71',
        'Good': '#6c5ce7',
        'Fair': '#f1c40f',
        'Poor': '#e74c3c',
    };

    return (
        <Link to={`/product/${product._id}`} className="card" id={`product-${product._id}`}>
            <img
                src={resolveAssetUrl(product.image) || '/placeholder.svg'}
                alt={product.name}
                className="card-image"
                onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name)}&size=400&background=f0eeff&color=6c5ce7&bold=true`;
                }}
            />
            <div className="card-body">
                <h3 className="card-title">{product.name}</h3>
                <p className="card-text">{product.description?.substring(0, 80)}{product.description?.length > 80 ? '...' : ''}</p>
                <p className="card-price">₹{product.price?.toLocaleString('en-IN')}</p>
                <div className="card-meta">
                    <span className="badge badge-category">{product.category}</span>
                    <span
                        className="badge badge-condition"
                        style={{ borderLeft: `3px solid ${conditionColors[product.condition] || '#999'}` }}
                    >
                        {product.condition}
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default ProductCard;
