const request = require('supertest');
const { setupDB } = require('../setup');
const app = require('../../app');

setupDB();

describe('Auth API Integration Tests', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new user and return token', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Jeet Srivastava',
                email: 'jeet@college.edu',
                password: 'securePassword123',
            });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body).toHaveProperty('token');
            expect(res.body.name).toBe('Jeet Srivastava');
            expect(res.body.email).toBe('jeet@college.edu');
            expect(res.body.role).toBe('student');
        });

        it('should not register a user with an existing email', async () => {
            // Register first user
            await request(app).post('/api/auth/register').send({
                name: 'User One',
                email: 'duplicate@college.edu',
                password: 'password123',
            });

            // Try to register with same email
            const res = await request(app).post('/api/auth/register').send({
                name: 'User Two',
                email: 'duplicate@college.edu',
                password: 'password456',
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('User already exists');
        });

        it('should not register a user without required fields', async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Incomplete User',
            });

            expect(res.statusCode).toBe(500);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Register a user before each login test
            await request(app).post('/api/auth/register').send({
                name: 'Login Test User',
                email: 'login@college.edu',
                password: 'testpassword',
            });
        });

        it('should login with valid credentials and return token', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'login@college.edu',
                password: 'testpassword',
            });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.email).toBe('login@college.edu');
            expect(res.body.name).toBe('Login Test User');
        });

        it('should reject login with wrong password', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'login@college.edu',
                password: 'wrongpassword',
            });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('Invalid email or password');
        });

        it('should reject login with non-existent email', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: 'nonexistent@college.edu',
                password: 'testpassword',
            });

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('Invalid email or password');
        });
    });

    describe('GET /api/auth/profile', () => {
        let token;

        beforeEach(async () => {
            const res = await request(app).post('/api/auth/register').send({
                name: 'Profile User',
                email: 'profile@college.edu',
                password: 'profilepass',
            });
            token = res.body.token;
        });

        it('should return user profile with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe('Profile User');
            expect(res.body.email).toBe('profile@college.edu');
            expect(res.body).not.toHaveProperty('password');
        });

        it('should reject request without token', async () => {
            const res = await request(app).get('/api/auth/profile');

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('Not authorized, no token');
        });

        it('should reject request with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalidtoken123');

            expect(res.statusCode).toBe(401);
        });
    });
});
