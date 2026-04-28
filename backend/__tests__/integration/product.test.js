const request = require('supertest');
const { setupDB } = require('../setup');
const app = require('../../app');

setupDB();

describe('Product API Integration Tests', () => {
    let token;
    let userId;

    // Register and login a user before tests that need auth
    const registerAndLogin = async (role = 'seller') => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Product Tester',
            email: `tester${Date.now()}@college.edu`,
            password: 'testpassword',
            role,
        });
        return { token: res.body.token, userId: res.body._id };
    };

    describe('GET /api/products', () => {
        it('should return an empty array when no products exist', async () => {
            const res = await request(app).get('/api/products');

            expect(res.statusCode).toBe(200);
            expect(res.body).toBeInstanceOf(Array);
            expect(res.body).toHaveLength(0);
        });

        it('should return all products', async () => {
            const auth = await registerAndLogin('seller');

            // Create two products
            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    name: 'Laptop',
                    description: 'Used laptop',
                    price: 20000,
                    category: 'Electronics',
                    condition: 'Good',
                    image: '/uploads/laptop.jpg',
                });

            await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    name: 'Bicycle',
                    description: 'Mountain bike',
                    price: 5000,
                    category: 'Bicycles',
                    condition: 'Fair',
                    image: '/uploads/bike.jpg',
                });

            const res = await request(app).get('/api/products');

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('POST /api/products', () => {
        beforeEach(async () => {
            const auth = await registerAndLogin('seller');
            token = auth.token;
            userId = auth.userId;
        });

        it('should create a product with valid data and auth', async () => {
            const productData = {
                name: 'Study Table',
                description: 'Wooden study table in great condition',
                price: 3000,
                category: 'Furniture',
                condition: 'Like New',
                image: '/uploads/table.jpg',
            };

            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send(productData);

            expect(res.statusCode).toBe(201);
            expect(res.body.name).toBe('Study Table');
            expect(res.body.price).toBe(3000);
            expect(res.body.category).toBe('Furniture');
            expect(res.body.user).toBe(userId);
        });

        it('should reject product creation without auth', async () => {
            const res = await request(app).post('/api/products').send({
                name: 'Unauthorized Product',
                description: 'Should not work',
                price: 1000,
                category: 'Other',
                condition: 'Good',
                image: '/uploads/test.jpg',
            });

            expect(res.statusCode).toBe(401);
        });

        it('should reject product with missing required fields', async () => {
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Incomplete Product',
                });

            expect(res.statusCode).toBe(500);
        });
    });

    describe('GET /api/products/:id', () => {
        it('should return a single product by ID', async () => {
            const auth = await registerAndLogin('seller');

            // Create a product
            const createRes = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    name: 'Textbook',
                    description: 'Engineering textbook',
                    price: 500,
                    category: 'Books',
                    condition: 'Good',
                    image: '/uploads/book.jpg',
                });

            const productId = createRes.body._id;

            const res = await request(app).get(`/api/products/${productId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe('Textbook');
            expect(res.body.user).toHaveProperty('name');
            expect(res.body.user).toHaveProperty('email');
        });

        it('should return 404 for non-existent product', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app).get(`/api/products/${fakeId}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('DELETE /api/products/:id', () => {
        it('should delete a product when requested by the owner', async () => {
            const auth = await registerAndLogin('seller');

            // Create a product
            const createRes = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    name: 'To Delete',
                    description: 'Will be deleted',
                    price: 100,
                    category: 'Other',
                    condition: 'Poor',
                    image: '/uploads/delete.jpg',
                });

            const productId = createRes.body._id;

            const res = await request(app)
                .delete(`/api/products/${productId}`)
                .set('Authorization', `Bearer ${auth.token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Product removed successfully');

            // Verify it's actually gone
            const getRes = await request(app).get(`/api/products/${productId}`);
            expect(getRes.statusCode).toBe(404);
        });

        it('should reject deletion by non-owner', async () => {
            const owner = await registerAndLogin('seller');
            const otherUser = await registerAndLogin('seller');

            // Owner creates product
            const createRes = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${owner.token}`)
                .send({
                    name: 'Not Yours',
                    description: 'Belongs to owner',
                    price: 500,
                    category: 'Other',
                    condition: 'Good',
                    image: '/uploads/notyours.jpg',
                });

            const productId = createRes.body._id;

            // Other user tries to delete
            const res = await request(app)
                .delete(`/api/products/${productId}`)
                .set('Authorization', `Bearer ${otherUser.token}`);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toBe('Not authorized to delete this product');
        });

        it('should reject deletion without auth', async () => {
            const auth = await registerAndLogin('seller');

            const createRes = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${auth.token}`)
                .send({
                    name: 'Auth Required',
                    description: 'Need auth to delete',
                    price: 100,
                    category: 'Other',
                    condition: 'Fair',
                    image: '/uploads/auth.jpg',
                });

            const res = await request(app).delete(`/api/products/${createRes.body._id}`);

            expect(res.statusCode).toBe(401);
        });
    });
});
