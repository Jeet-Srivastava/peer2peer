import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct, uploadImage } from '../services/api';

const CATEGORIES = ['Electronics', 'Bicycles', 'Books', 'Furniture', 'Other'];
const CONDITIONS = ['Like New', 'Good', 'Fair', 'Poor'];

function CreateListing() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: '',
        condition: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.category) {
            setError('Please select a category');
            return;
        }
        if (!formData.condition) {
            setError('Please select a condition');
            return;
        }

        setLoading(true);

        try {
            let imagePath = '/images/sample.jpg';

            // Upload image if selected
            if (imageFile) {
                const formDataImg = new FormData();
                formDataImg.append('image', imageFile);
                const { data: uploadedPath } = await uploadImage(formDataImg);
                imagePath = uploadedPath;
            }

            await createProduct({
                ...formData,
                price: Number(formData.price),
                image: imagePath,
            });

            navigate('/my-listings');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create listing');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="create-page">
                <h1 className="create-title" id="create-title">Create a Listing</h1>

                {error && <div className="alert alert-error" id="create-error">{error}</div>}

                <form onSubmit={handleSubmit} id="create-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="create-name">Product Name</label>
                        <input
                            id="create-name"
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="e.g., Dell Inspiron 15 Laptop"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-description">Description</label>
                        <textarea
                            id="create-description"
                            name="description"
                            className="form-input"
                            placeholder="Describe the item, its condition, age, and why you're selling..."
                            value={formData.description}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-price">Price (₹)</label>
                        <input
                            id="create-price"
                            type="number"
                            name="price"
                            className="form-input"
                            placeholder="Enter price in rupees"
                            value={formData.price}
                            onChange={handleChange}
                            min="0"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="create-category">Category</label>
                            <select
                                id="create-category"
                                name="category"
                                className="form-input"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select category</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="create-condition">Condition</label>
                            <select
                                id="create-condition"
                                name="condition"
                                className="form-input"
                                value={formData.condition}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select condition</option>
                                {CONDITIONS.map((cond) => (
                                    <option key={cond} value={cond}>{cond}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="create-image">Product Image</label>
                        <input
                            id="create-image"
                            type="file"
                            className="form-input"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageChange}
                            style={{ padding: 'var(--space-2)' }}
                        />
                        {imagePreview && (
                            <img
                                src={imagePreview}
                                alt="Preview"
                                style={{
                                    marginTop: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    maxHeight: '200px',
                                    objectFit: 'cover',
                                }}
                            />
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%' }}
                        disabled={loading}
                        id="create-submit"
                    >
                        {loading ? 'Publishing...' : 'Publish Listing'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateListing;
