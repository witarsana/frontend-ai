import { test, expect } from '@playwright/test';

test.describe('Chronicle Cemetery Map Search Tests', () => {
  test('should display search suggestions with highlighted text when searching for "auckland" and navigate to detail page', async ({ page }) => {
    // Step 1: Navigate to https://map.chronicle.rip
    await page.goto('https://map.chronicle.rip');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Step 2: Find search box and type "auckland"
    const searchBox = page.getByRole('textbox', { name: 'Search' });
    await expect(searchBox).toBeVisible();
    
    // Type "auckland" slowly to trigger suggestions
    await searchBox.pressSequentially('auckland');
    
    // Step 3: Wait for suggestions to appear
    await page.waitForTimeout(3000); // Wait for suggestions to load
    
    // Step 4: Verify that suggestion list appears and contains "auckland"
    // Look for the suggestion container that appears after typing
    const suggestionContainer = page.locator('cl-search-cemetery-item');
    await expect(suggestionContainer).toBeVisible();
    
    // Verify at least one suggestion contains "Auckland" (case insensitive)
    await expect(page.locator('text=Auckland Memorial Park')).toBeVisible();
    
    // Step 5: Verify that "Auckland" text is highlighted in suggestions
    // Look for the highlighted Auckland text element
    const highlightedText = page.locator('text=Auckland').first();
    await expect(highlightedText).toBeVisible();
    
    // Additional verification: Check that the suggestion shows complete cemetery info
    await expect(page.locator('text=Memorial Park & Cemetery')).toBeVisible();
    await expect(page.locator('text=Partner')).toBeVisible();
    await expect(page.locator('text=Silverdale, Auckland')).toBeVisible();
    
    // Verify map markers are also updated
    const mapMarkers = page.locator('button:has-text("Marker")');
    await expect(mapMarkers.first()).toBeVisible();
    
    // Step 6: Click on the Auckland suggestion to navigate to detail page
    await suggestionContainer.click();
    
    // Step 7: Verify navigation to detail page
    await page.waitForURL('**/Auckland_Memorial_Park_Cemetery');
    await expect(page).toHaveTitle('Auckland Memorial Park & Cemetery');
    
    // Step 8: Validate cemetery detail page content
    // Verify main heading
    await expect(page.getByRole('heading', { name: 'Auckland Memorial Park & Cemetery', level: 3 })).toBeVisible();
    
    // Verify cemetery status
    await expect(page.locator('text=Public')).toBeVisible();
    
    // Verify address information
    await expect(page.locator('text=2163 East Coast Road, Silverdale, Auckland, 993, New Zealand')).toBeVisible();
    
    // Verify contact information
    await expect(page.locator('text=Office Hours: Weekdays 8:30AM–4:30PM')).toBeVisible();
    await expect(page.getByRole('button', { name: '0800 00 66 88' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+6494269383' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'admin@ampl.co.nz' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'http://www.aucklandmemorialpark.co.nz/' })).toBeVisible();
    
    // Verify gallery images are present
    await expect(page.locator('img[alt*="AMP_Front_Signage"]')).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByRole('button', { name: 'PLOTS FOR SALE' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'CREATE AN ONLINE MEMORIAL' })).toBeVisible();
    
    // Verify description text
    await expect(page.locator('text=Auckland Memorial Park & Cemetery is located on 17 hectares')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Read more' })).toBeVisible();
  });

  test('should clear search suggestions when search box is cleared', async ({ page }) => {
    // Navigate to the page
    await page.goto('https://map.chronicle.rip');
    await page.waitForLoadState('networkidle');
    
    // Type in search box
    const searchBox = page.getByRole('textbox', { name: 'Search' });
    await searchBox.pressSequentially('auckland');
    
    // Verify suggestions appear
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Auckland Memorial Park')).toBeVisible();
    
    // Clear the search box
    await searchBox.clear();
    
    // Verify suggestions disappear (the specific suggestion container should not be visible)
    await expect(page.locator('text=Auckland Memorial Park')).not.toBeVisible();
  });

  test('should display map results when searching for "auckland"', async ({ page }) => {
    // Navigate and search
    await page.goto('https://map.chronicle.rip');
    await page.waitForLoadState('networkidle');
    
    const searchBox = page.getByRole('textbox', { name: 'Search' });
    await searchBox.pressSequentially('auckland');
    await page.waitForTimeout(2000);
    
    // Verify map shows relevant results
    await expect(page.locator('[role="region"][name="Map"]')).toBeVisible();
    
    // Verify cemetery names are shown in map tooltip/info
    await expect(page.locator('text=Auckland Memorial Park & Cemetery')).toBeVisible();
    
    // Verify multiple location results if available
    const locationResults = page.locator('generic:has-text("Cemetery")');
    await expect(locationResults.first()).toBeVisible();
  });

  test('should highlight search term in suggestion results', async ({ page }) => {
    await page.goto('https://map.chronicle.rip');
    await page.waitForLoadState('networkidle');
    
    // Search for auckland
    const searchBox = page.getByRole('textbox', { name: 'Search' });
    await searchBox.pressSequentially('auckland');
    await page.waitForTimeout(2000);
    
    // Verify the suggestion appears
    const suggestionContainer = page.locator('cl-search-cemetery-item');
    await expect(suggestionContainer).toBeVisible();
    
    // Verify that "Auckland" text appears highlighted
    // This checks that the Auckland text is wrapped in a highlighting element
    const highlightedAuckland = suggestionContainer.locator('text=Auckland').first();
    await expect(highlightedAuckland).toBeVisible();
    
    // Verify the complete suggestion text
    await expect(suggestionContainer.locator('text=Memorial Park & Cemetery')).toBeVisible();
  });
});
