const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Product = require('../../models/Product');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Product.deleteMany({});
});

describe('Product Model', () => {
    const validUserId = new mongoose.Types.ObjectId();

    const validProductData = {
        user: validUserId,
        name: 'Used Laptop',
        description: 'Dell Inspiron 15, 8GB RAM, in great condition',
        price: 25000,
        category: 'Electronics',
        condition: 'Good',
        image: '/uploads/laptop.jpg',
    };

    it('should create a product successfully with valid data', async () => {
        const product = await Product.create(validProductData);

        expect(product._id).toBeDefined();
        expect(product.name).toBe(validProductData.name);
        expect(product.price).toBe(25000);
        expect(product.category).toBe('Electronics');
        expect(product.condition).toBe('Good');
    });

    it('should require name field', async () => {
        const product = new Product({ ...validProductData, name: undefined });
        let error;

        try {
            await product.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.name).toBeDefined();
    });

    it('should require description field', async () => {
        const product = new Product({ ...validProductData, description: undefined });
        let error;

        try {
            await product.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.description).toBeDefined();
    });

    it('should default price to 0 if not provided', async () => {
        const productData = { ...validProductData };
        delete productData.price;
        const product = await Product.create(productData);

        expect(product.price).toBe(0);
    });

    it('should only allow valid categories', async () => {
        const product = new Product({ ...validProductData, category: 'InvalidCategory' });
        let error;

        try {
            await product.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.category).toBeDefined();
    });

    it('should accept all valid categories', async () => {
        const categories = ['Electronics', 'Bicycles', 'Books', 'Furniture', 'Other'];

        for (const category of categories) {
            const product = new Product({ ...validProductData, category });
            await expect(product.validate()).resolves.not.toThrow();
        }
    });

    it('should only allow valid conditions', async () => {
        const product = new Product({ ...validProductData, condition: 'Broken' });
        let error;

        try {
            await product.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.condition).toBeDefined();
    });

    it('should accept all valid conditions', async () => {
        const conditions = ['Like New', 'Good', 'Fair', 'Poor'];

        for (const condition of conditions) {
            const product = new Product({ ...validProductData, condition });
            await expect(product.validate()).resolves.not.toThrow();
        }
    });

    it('should have timestamps', async () => {
        const product = await Product.create(validProductData);

        expect(product.createdAt).toBeDefined();
        expect(product.updatedAt).toBeDefined();
    });

    it('should reference a user', async () => {
        const product = await Product.create(validProductData);
        expect(product.user.toString()).toBe(validUserId.toString());
    });
});
