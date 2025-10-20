import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        # Launch the browser
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to the start URL
        await page.goto("https://map.chronicle.rip", timeout=60000)
        print("Navigated to the start URL")

        # Wait for the search input to be visible and fill it with "auckland"
        search_input = page.locator('input[placeholder="Search for a cemetery"]')
        await search_input.wait_for()
        await search_input.fill("auckland")
        print("Filled search input with 'auckland'")

        # Wait for search results to appear and click the first result
        search_result = page.locator('div.search-result-item').first
        await search_result.wait_for()
        await search_result.click()
        print("Clicked on the first search result")

        # Wait for the map detail page to load and validate the sidebar
        sidebar_title = page.locator('div.sidebar-title')
        await sidebar_title.wait_for()
        title_text = await sidebar_title.inner_text()
        print(f"Sidebar title text: {title_text}")

        # Validate that the cemetery name contains "auckland"
        if "auckland" in title_text.lower():
            print("Validation successful: Cemetery name contains 'auckland'")
        else:
            print("Validation failed: Cemetery name does not contain 'auckland'")

        # Close the browser
        await browser.close()

# Run the async function
asyncio.run(main())