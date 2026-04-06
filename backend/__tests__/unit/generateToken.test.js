const jwt = require('jsonwebtoken');

// Set JWT_SECRET for testing
process.env.JWT_SECRET = 'test-secret-key-for-jest';

const generateToken = require('../../utils/generateToken');

describe('generateToken', () => {
    it('should return a valid JWT string', () => {
        const token = generateToken('abc123');
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should encode the user ID in the token payload', () => {
        const userId = '507f1f77bcf86cd799439011';
        const token = generateToken(userId);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        expect(decoded.id).toBe(userId);
    });

    it('should set expiration to 30 days', () => {
        const token = generateToken('abc123');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check that exp is roughly 30 days from now
        const now = Math.floor(Date.now() / 1000);
        const thirtyDays = 30 * 24 * 60 * 60;
        const diff = decoded.exp - now;

        expect(diff).toBeGreaterThan(thirtyDays - 60); // within 1 minute tolerance
        expect(diff).toBeLessThanOrEqual(thirtyDays);
    });

    it('should generate unique tokens for different user IDs', () => {
        const token1 = generateToken('user1');
        const token2 = generateToken('user2');

        expect(token1).not.toBe(token2);
    });
});
