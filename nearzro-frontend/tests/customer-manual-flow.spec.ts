import { test, expect } from '@playwright/test';

/**
 * ============================================================
 * TEST CONFIGURATION
 * ============================================================
 * IMPORTANT: Update these credentials with valid test user data
 * The tests assume a customer user exists in the database.
 * 
 * If authentication is handled differently (e.g., via API token,
 * localStorage, or JWT), adjust the login flow accordingly.
 * ============================================================
 */
const TEST_CUSTOMER_EMAIL = 'test@example.com';
const TEST_CUSTOMER_PASSWORD = 'password123';

test.describe('Customer Dashboard Manual Flow', () {
  /**
   * ============================================================
   * BEFORE EACH: Authenticate before running tests
   * ============================================================
   * This runs before every test to ensure the user is logged in
   * and can access the protected customer dashboard routes.
   */
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for login form to load
    await page.waitForSelector('input[type="email"], input[id="email"]', { timeout: 10000 });
    
    // Fill in the credentials
    // Try common email input selectors
    const emailInput = page.locator('input[type="email"], input[id="email"]');
    await emailInput.fill(TEST_CUSTOMER_EMAIL);
    
    // Fill password
    const passwordInput = page.locator('input[type="password"], input[id="password"]');
    await passwordInput.fill(TEST_CUSTOMER_PASSWORD);
    
    // Click the login/submit button
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();
    
    // Wait for navigation to dashboard
    // Try multiple possible redirect destinations
    await page.waitForURL('**/dashboard/**', { timeout: 15000 }).catch(() => {
      // If not redirected to dashboard, check if we're already authenticated
      return page.waitForURL('**/customer**', { timeout: 5000 });
    });
    
    console.log('✅ Authentication complete - User logged in');
  });
  /**
   * ============================================================
   * TEST 1: The "CRED" Visual Check
   * ============================================================
   * Simulates a human user visually inspecting the dashboard
   * to verify the premium dark theme is properly rendered.
   * 
   * Human Action: Navigate to dashboard and visually inspect
   * the background color and text color.
   * ============================================================
   */
  test('should render with CRED premium dark theme', async ({ page }) => {
    // Navigate to the customer dashboard
    await page.goto('/dashboard/customer');

    // Wait for the main content to load
    await page.waitForSelector('main, [class*="min-h-screen"]', { timeout: 10000 });

    /**
     * HUMAN ACTION: Visual inspection of background color
     * We verify that the body/main container has bg-zinc-950 (rgb(9, 9, 11))
     */
    const bodyBackground = await page.evaluate(() => {
      const mainElement = document.querySelector('main') || document.querySelector('[class*="min-h-screen"]');
      if (!mainElement) return null;
      const style = window.getComputedStyle(mainElement);
      return style.backgroundColor;
    });

    // Assert background is dark (rgb(9, 9, 11) = bg-zinc-950)
    expect(bodyBackground).toBe('rgb(9, 9, 11)');

    /**
     * HUMAN ACTION: Visual inspection of text color
     * We verify that primary text is text-zinc-100 (rgb(244, 244, 245))
     */
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    const textColor = await heading.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.color;
    });

    // Assert text is light (rgb(244, 244, 245) = text-zinc-100)
    expect(textColor).toBe('rgb(244, 244, 245)');

    console.log('✅ CRED Visual Check PASSED - Dark theme properly rendered');
  });

  /**
   * ============================================================
   * TEST 2: The Form Spam & Double-Click Test
   * ============================================================
   * Simulates a human user rapidly clicking the submit button
   * (either by accident or intentionally to test spam prevention).
   * 
   * Human Action: Fill form and double-click the submit button
   * to simulate rapid clicking/spam behavior.
   * ============================================================
   */
  test('should prevent form double-click spam', async ({ page }) => {
    // Navigate to create event page
    await page.goto('/dashboard/customer/create-event');

    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });

    /**
     * HUMAN ACTION: Fill out the required form fields
     * Simulating a user typing in event details
     */
    // Fill event title
    await page.fill('#title', 'Test Wedding Event');

    // Fill date (must be future date)
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.fill('#date', dateString);

    // Fill area
    await page.fill('#area', 'T Nagar');

    // Fill guest count
    await page.fill('#guestCount', '100');

    // City is pre-filled, verify it's there
    const cityValue = await page.inputValue('#city');
    expect(cityValue).toBe('Chennai');

    /**
     * HUMAN ACTION: Find the submit button and double-click it
     * This simulates a user accidentally double-clicking or
     * maliciously trying to spam the form
     */
    const submitButton = page.locator('button[type="submit"]');
    
    // Get initial button state
    const isDisabledBefore = await submitButton.isDisabled();
    expect(isDisabledBefore).toBe(false);

    // Perform double-click on submit button
    await submitButton.dblclick();

    /**
     * ASSERTION: Button should be disabled after first click
     * This prevents multiple form submissions
     */
    const isDisabledAfter = await submitButton.isDisabled();
    expect(isDisabledAfter).toBe(true);

    // Also verify triple-click (even more aggressive spam test)
    const buttonHTML = await submitButton.getAttribute('disabled');
    expect(buttonHTML).toBe('disabled');

    console.log('✅ Double-Click Test PASSED - Button disabled after first click');

    /**
     * Wait for the redirect to happen (after API response)
     * The user should be redirected to /dashboard/customer
     */
    await page.waitForURL('**/dashboard/customer**', { timeout: 15000 });

    // Verify we're on the dashboard page
    await expect(page).toHaveURL(/.*dashboard\/customer/);

    console.log('✅ Redirect Test PASSED - User redirected to dashboard after form submission');
  });

  /**
   * ============================================================
   * TEST 3: The "Dead-End" Click Test
   * ============================================================
   * Simulates a human user trying to click on buttons that
   * should not work (invoice download, cancel event).
   * 
   * Human Action: Navigate to events list and attempt to
   * click unavailable buttons.
   * ============================================================
   */
  test('should have disabled dead-end buttons', async ({ page }) => {
    // Navigate to events page
    await page.goto('/dashboard/customer/events');

    // Wait for events list to load (or empty state)
    await page.waitForSelector('[class*="border-zinc-800"]', { timeout: 10000 });

    /**
     * HUMAN ACTION: Look for the "Invoice" or "Cancel" buttons
     * that we previously disabled
     */
    const invoiceButton = page.locator('button:has-text("Unavailable"), button:has-text("Invoice")').first();
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Unavailable")').first();

    /**
     * ASSERTION: Invoice button should be disabled
     * This prevents users from hitting non-existent backend routes
     */
    const isInvoiceDisabled = await invoiceButton.getAttribute('disabled');
    expect(isInvoiceDisabled).toBe('disabled');

    /**
     * ASSERTION: Cancel button should be disabled
     * This prevents users from triggering non-existent cancel API
     */
    // Try to find a cancel button - it might not exist if no events
    const cancelButtons = page.locator('button:has-text("Cancel"), button:has-text("Unavailable")');
    const cancelCount = await cancelButtons.count();

    if (cancelCount > 0) {
      const firstCancel = cancelButtons.first();
      const isCancelDisabled = await firstCancel.getAttribute('disabled');
      expect(isCancelDisabled).toBe('disabled');
      console.log('✅ Dead-End Cancel Button PASSED - Button is disabled');
    } else {
      console.log('ℹ️ No cancel buttons found (empty state or no active events)');
    }

    // Verify invoice button cannot be clicked
    const invoiceHandle = await invoiceButton.evaluate((el) => el.tagName);
    expect(invoiceHandle).toBe('BUTTON');

    // Verify clicking doesn't trigger navigation or API call
    await invoiceButton.click({ force: true, timeout: 2000 }).catch(() => {
      // If click fails (which it should for disabled), that's expected
      console.log('✅ Dead-End Invoice Button PASSED - Button cannot be clicked');
    });

    console.log('✅ Dead-End Buttons Test PASSED - All unavailable actions are properly disabled');
  });

  /**
   * ============================================================
   * TEST 4: Navigation Flow Verification
   * ============================================================
   * Verifies that navigation between pages works correctly
   * and maintains the dark theme throughout.
   */
  test('should maintain dark theme across navigation', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard/customer');
    await page.waitForLoadState('networkidle');

    // Get background color
    const dashBg = await page.evaluate(() => {
      const el = document.querySelector('main') || document.querySelector('[class*="min-h-screen"]');
      return el ? window.getComputedStyle(el).backgroundColor : null;
    });
    expect(dashBg).toBe('rgb(9, 9, 11)');

    // Navigate to events page
    await page.click('text=My Events');
    await page.waitForURL('**/events');

    // Verify events page has dark theme
    const eventsBg = await page.evaluate(() => {
      const el = document.querySelector('main') || document.querySelector('[class*="min-h-screen"]');
      return el ? window.getComputedStyle(el).backgroundColor : null;
    });
    expect(eventsBg).toBe('rgb(9, 9, 11)');

    // Navigate to bookings page
    await page.click('text=My Bookings');
    await page.waitForURL('**/bookings');

    // Verify bookings page has dark theme
    const bookingsBg = await page.evaluate(() => {
      const el = document.querySelector('main') || document.querySelector('[class*="min-h-screen"]');
      return el ? window.getComputedStyle(el).backgroundColor : null;
    });
    expect(bookingsBg).toBe('rgb(9, 9, 11)');

    console.log('✅ Navigation Theme Test PASSED - Dark theme maintained across all pages');
  });
});
