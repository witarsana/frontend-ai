# Ini adalah CONTOH skrip target yang kita inginkan dari AI
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        await page.goto("https://map.chronicle.rip")
        
        # 1. Ketik di kotak pencarian
        await page.fill("input[placeholder='Search']", "Auckland")
        
        # 2. Tunggu dan klik hasil pertama yang muncul di dropdown
        # Selector ini mungkin perlu disesuaikan, tapi idenya adalah menargetkan item hasil
        result_selector = "div.cl-search-inventory-item a" 
        await page.wait_for_selector(result_selector)
        await page.click(result_selector)
        
        # 3. Tunggu halaman detail dimuat dan verifikasi elemen kunci
        # Contoh: verifikasi judul halaman setelah klik
        await page.wait_for_selector('h1:has-text("Auckland Memorial Park")')
        print("Verifikasi berhasil: Halaman detail Auckland Memorial Park telah dimuat.")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())