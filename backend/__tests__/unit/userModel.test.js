const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../models/User');

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
    await User.deleteMany({});
});

describe('User Model', () => {
    const validUserData = {
        name: 'Test Student',
        email: 'test@college.edu',
        password: 'password123',
    };

    it('should create a user successfully with valid data', async () => {
        const user = await User.create(validUserData);

        expect(user._id).toBeDefined();
        expect(user.name).toBe(validUserData.name);
        expect(user.email).toBe(validUserData.email);
        expect(user.role).toBe('student'); // default role
        expect(user.isVerified).toBe(false); // default
    });

    it('should hash the password before saving', async () => {
        const user = await User.create(validUserData);

        expect(user.password).not.toBe(validUserData.password);
        expect(user.password).toMatch(/^\$2[aby]?\$/); // bcrypt hash pattern
    });

    it('should correctly match a valid password', async () => {
        const user = await User.create(validUserData);
        const isMatch = await user.matchPassword('password123');

        expect(isMatch).toBe(true);
    });

    it('should reject an invalid password', async () => {
        const user = await User.create(validUserData);
        const isMatch = await user.matchPassword('wrongpassword');

        expect(isMatch).toBe(false);
    });

    it('should require name field', async () => {
        const user = new User({ email: 'a@b.com', password: '123456' });
        let error;

        try {
            await user.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.name).toBeDefined();
    });

    it('should require email field', async () => {
        const user = new User({ name: 'Test', password: '123456' });
        let error;

        try {
            await user.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.email).toBeDefined();
    });

    it('should reject invalid email format', async () => {
        const user = new User({ name: 'Test', email: 'notanemail', password: '123456' });
        let error;

        try {
            await user.validate();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors.email).toBeDefined();
    });

    it('should enforce unique email', async () => {
        await User.create(validUserData);
        let error;

        try {
            await User.create(validUserData);
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should default role to student', async () => {
        const user = await User.create(validUserData);
        expect(user.role).toBe('student');
    });

    it('should allow admin role', async () => {
        const user = await User.create({ ...validUserData, role: 'admin' });
        expect(user.role).toBe('admin');
    });
});
