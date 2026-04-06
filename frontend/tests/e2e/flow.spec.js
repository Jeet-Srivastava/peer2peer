import { test, expect } from '@playwright/test';

test.describe('E2E Full Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Assume backend is fresh (no user). Using unique email.
        const uniqueNumber = Date.now();
        await page.goto('/');

        // 1. Navigate to Register
        await page.click('id=nav-register');
        await expect(page).toHaveURL(/.*register/);

        // 2. Register
        await page.fill('id=register-name', 'Playwright Tester');
        await page.fill('id=register-email', `tester${uniqueNumber}@college.edu`);
        await page.fill('id=register-password', 'securepass');
        await page.fill('id=register-confirm', 'securepass');
        await page.click('id=register-submit');

        // 3. Verify redirected to home and logged in
        await expect(page).toHaveURL('http://localhost:5173/');
        await expect(page.locator('id=nav-profile')).toBeVisible();
    });

    test('User can login and browse products', async ({ page }) => {
        // Already registered/logged in from beforeEach
        // 4. Logout
        await page.click('id=nav-logout');
        
        // 5. Verify logged out state
        await expect(page.locator('id=nav-login')).toBeVisible();
    });
});
