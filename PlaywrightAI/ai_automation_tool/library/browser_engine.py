# library/browser_engine.py

import asyncio
from playwright.async_api import async_playwright
from library.logger import Logger
import re
import json

class BrowserEngine:
    def __init__(self):
        self.browser = None
        self.page = None
        self.playwright = None # Inisialisasi sebagai None
        self.logger = Logger()

    # --- FUNGSI YANG DIPERBAIKI ---
    async def launch(self, headless=True):
        """
        Launches the browser. Now accepts a 'headless' argument.
        """
        try:
            self.playwright = await async_playwright().start()
            # Gunakan argumen 'headless' yang diterima
            self.browser = await self.playwright.chromium.launch(headless=headless)
            self.page = await self.browser.new_page()
            return True
        except Exception as e:
            self.logger.error(f"Error launching browser: {e}")
            return False

    async def navigate(self, url):
        self.logger.info(f"DEBUG: Inside navigate method. self.page: {self.page}, URL received: {repr(url)} (Type: {type(url)})")
        try:
            await self.page.goto(url, wait_until="domcontentloaded")
            self.logger.info(f"Navigated to {url}.")
            return True
        except Exception as e:
            self.logger.error(f"Error navigating to {url}: {e}")
            return False

    async def type(self, selector, value):
        try:
            await self.page.fill(selector, value)
            self.logger.info(f"Typed {repr(value)} into {repr(selector)}")
            return True
        except Exception as e:
            self.logger.error(f"Error typing into {repr(selector)}: {e}")
            return False

    async def click(self, selector):
        try:
            await self.page.click(selector, timeout=15000) # Timeout sedikit lebih pendek
            self.logger.info(f"Clicked {repr(selector)}")
            return True
        except Exception as e:
            self.logger.error(f"Error clicking {repr(selector)}: {e}")
            return False

    async def get_html(self):
        try:
            return await self.page.content()
        except Exception as e:
            self.logger.error(f"Error getting HTML content: {e}")
            return ""

    async def wait_for_selector(self, selector, timeout=10000):
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            self.logger.info(f"Waited for selector {repr(selector)}")
            return True
        except Exception as e:
            self.logger.error(f"Error waiting for selector {repr(selector)}: {e}")
            return False
            
    # --- FUNGSI YANG DIPERBAIKI AGAR LEBIH AMAN ---
    async def close(self):
        """
        Closes the browser safely.
        """
        try:
            # Selalu cek apakah atribut ada sebelum digunakan
            if hasattr(self, 'browser') and self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright') and self.playwright:
                await self.playwright.stop()
            return True
        except Exception as e:
            self.logger.error(f"Error closing browser: {e}")
            return False


    async def verify_text(self, selector, expected_text, timeout=10000):
        try:
            if selector:
                # Wait for the element to be visible and contain the text
                await self.page.wait_for_selector(f"text=\"{expected_text}\"", timeout=timeout)
                self.logger.info(f"Verified text {repr(expected_text)} in element {repr(selector)}")
            else:
                # Verify text on the whole page content
                await self.page.wait_for_selector(f"text=\"{expected_text}\"", timeout=timeout)
                self.logger.info(f"Verified text {repr(expected_text)} on the page.")
            return True
        except Exception as e:
            self.logger.error(f"Error verifying text {repr(expected_text)} in {repr(selector) if selector else 'page'}: {e}")
            return False

    async def take_screenshot_with_highlight(self, selector, path):
        try:
            if selector:
                if selector.startswith("text="):
                    # Use Playwright's locator for text-based selection
                    elements = await self.page.locator(selector).all()
                    for element in elements:
                        await element.evaluate("""
                            (el) => {
                                el.style.border = '4px solid red';
                                el.style.boxShadow = '0 0 10px red';
                            }
                        """)
                else:
                    # Use document.querySelectorAll for CSS selectors
                    escaped_selector = json.dumps(selector)
                    await self.page.evaluate("""
                        (selector) => {
                            const elements = document.querySelectorAll(JSON.parse(selector));
                            elements.forEach(el => {
                                el.style.border = '4px solid red';
                                el.style.boxShadow = '0 0 10px red';
                            });
                        }
                    """, escaped_selector)
            await self.page.screenshot(path=path)
            self.logger.info(f"Screenshot saved to {path}")
            return True
        except Exception as e:
            self.logger.error(f"Error taking screenshot with highlight: {e}")
            return False

    async def close(self):
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            return True
        except Exception as e:
            self.logger.error(f"Error closing browser: {e}")
            return False

    async def extract_data(self, selector):
        try:
            element = await self.page.query_selector(selector)
            if element:
                return await element.inner_text()
            return None
        except Exception as e:
            self.logger.error(f"Error extracting data from {repr(selector)}: {e}")
            return None


