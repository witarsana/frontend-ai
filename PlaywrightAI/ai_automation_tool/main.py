import os
import re
import asyncio
import json
from library.browser_engine import BrowserEngine
from library.ai_engine import AIEngine
from library.logger import Logger

logger = Logger()

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')

INTERACTIVE_SELECTORS = [
    "a[href]",
    "button",
    "input:not([type='hidden'])",
    "[role='button']",
    "[role='link']",
    "[role='textbox']"
]

async def get_interactive_elements(page):
    elements = []
    combined_selector = ", ".join(INTERACTIVE_SELECTORS)
    try:
        locators = await page.locator(combined_selector).all()
        for i, loc in enumerate(locators):
            try:
                if await loc.is_visible(timeout=1000):
                    tag = await loc.evaluate('element => element.tagName.toLowerCase()')
                    text = await loc.inner_text()
                    attrs = await loc.evaluate('element => Object.fromEntries(Array.from(element.attributes, ({name, value}) => [name, value]))')
                    description = text.strip() or attrs.get('aria-label') or attrs.get('placeholder') or attrs.get('name') or attrs.get('id', '')
                    elements.append({
                        "index": i,
                        "tag": tag,
                        "description": description[:100],
                        "attributes": {k: v for k, v in attrs.items() if k in ['href', 'placeholder', 'aria-label', 'name', 'id']}
                    })
            except Exception:
                continue
    except Exception as e:
        logger.error(f"Error extracting elements: {e}")
    return elements

async def main():
    with open("input_prompt.json", "r", encoding="utf-8") as f:
        input_data = json.load(f)
    user_request = input_data["user_request"]
    start_url = input_data.get("start_url")

    ai_engine = AIEngine()

    # Selalu generate script Playwright di setiap eksekusi
    logger.info("MODE: Playwright Script Generator")
    script = ai_engine.generate_playwright_script(user_request, start_url)
    scenario_title = slugify(user_request)
    output_path = f"output/generated_{scenario_title}.py"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(script)
    logger.info(f"Script Playwright berhasil dibuat di {output_path}")

    browser_engine = BrowserEngine()

    try:
        await browser_engine.launch(headless=False)
        if start_url:
            await browser_engine.navigate(start_url)

        # Tunggu elemen kunci jika perlu (opsional, bisa dihapus jika sudah stabil)
        try:
            logger.info("Menunggu elemen kunci (kotak pencarian) untuk memastikan halaman telah dimuat...")
            await browser_engine.page.wait_for_selector("input[placeholder*='Search']", timeout=20000)
            logger.info("Elemen kunci ditemukan. Halaman siap untuk dianalisis.")
        except Exception:
            logger.info("Elemen kunci tidak ditemukan, melanjutkan...")

        # 1. PERENCANAAN STRATEGIS (HANYA SEKALI DI AWAL)
        logger.info("AI #1 (Planner) sedang membuat rencana strategis...")
        plan_data = ai_engine.create_structured_plan(user_request, start_url)
        if not plan_data or "plan" not in plan_data:
            logger.error("Gagal membuat rencana strategis. Menghentikan.")
            return
        
        strategic_plan = plan_data["plan"]
        logger.info(f"Rencana strategis dibuat dengan {len(strategic_plan)} langkah.")

        action_history = []

        # 2. EKSEKUSI DINAMIS (LANGKAH DEMI LANGKAH)
        for i, task in enumerate(strategic_plan):
            logger.info(f"--- Menjalankan Langkah Rencana {i+1}/{len(strategic_plan)}: {task['description']} ---")

            # A. LIHAT
            page_elements = await get_interactive_elements(browser_engine.page)
            if not page_elements:
                logger.error("Tidak ditemukan elemen interaktif untuk melanjutkan. Gagal.")
                await browser_engine.page.screenshot(path=f"output/screenshots/step_{i+1}_failed.png")
                break

            # B. PIKIRKAN (Cari Elemen yang Tepat)
            logger.info("AI #2 (Matcher) sedang mencari elemen yang paling cocok...")
            match_result = ai_engine.find_best_element_for_task(task['description'], page_elements)
            if not match_result or "best_element_index" not in match_result:
                logger.error(f"AI #2 tidak bisa menemukan elemen cocok untuk tugas: {task['description']}. Gagal.")
                await browser_engine.page.screenshot(path=f"output/screenshots/step_{i+1}_failed.png")
                break
            
            element_index = match_result.get("best_element_index")
            if element_index is None or not (0 <= element_index < len(page_elements)):
                logger.error(f"AI tidak menemukan elemen yang cocok untuk task: {task['description']}. Menghentikan.")
                await browser_engine.page.screenshot(path=f"output/screenshots/step_{i+1}_failed.png")
                break
            chosen_element = page_elements[element_index]

            # C. BERTINDAK
            action = task['action']
            value = task.get('value')
            combined_selector = ", ".join(INTERACTIVE_SELECTORS)
            target_locator = browser_engine.page.locator(combined_selector).nth(element_index)

            logger.info(f"AI memutuskan: Aksi='{action}' pada elemen='{chosen_element['description']}'")

            try:
                if action == "TYPE":
                    logger.info("Mengklik target untuk memastikan bisa diedit...")
                    await target_locator.click(timeout=5000)
                    logger.info(f"Mengisi nilai: '{value}'")
                    await target_locator.fill(value)
                elif action == "CLICK":
                    await target_locator.click(timeout=5000)
                    logger.info("Aksi klik dieksekusi. Memulai penantian berlapis...")
                    # Lapisan 1: Tunggu jaringan tenang
                    try:
                        await browser_engine.page.wait_for_load_state("networkidle", timeout=15000)
                        logger.info("Lapisan 1: Jaringan terdeteksi stabil.")
                    except Exception:
                        logger.warning("Timeout saat menunggu networkidle, mungkin ada koneksi yang aktif terus. Melanjutkan...")
                    # Lapisan 2: Coba tunggu elemen kunci (tidak fatal jika gagal)
                    try:
                        logger.info("Lapisan 2: Mencoba menemukan elemen kunci (kotak pencarian) sebagai konfirmasi UI...")
                        await browser_engine.page.wait_for_selector("input[placeholder*='Search']", timeout=7000)
                        logger.info("Elemen kunci ditemukan. Halaman dikonfirmasi siap.")
                    except Exception:
                        logger.info("Elemen kunci tidak ditemukan (mungkin berada di halaman login/lainnya). Tetap melanjutkan proses...")
                elif action == "VALIDATE":
                    await target_locator.wait_for(state='visible', timeout=10000)
                    logger.info(f"Validasi berhasil: Elemen '{chosen_element['description']}' terlihat.")

                # Simpan history langkah
                action_history.append({
                    "step": i+1,
                    "action": action,
                    "description": chosen_element['description'],
                    "value": value if action == "TYPE" else None
                })

                # Screenshot setiap langkah (opsional)
                await browser_engine.page.screenshot(path=f"output/screenshots/step_{i+1}.png")

            except Exception as e:
                logger.error(f"Error saat eksekusi langkah: {e}")
                await browser_engine.page.screenshot(path=f"output/screenshots/step_{i+1}_failed.png")
                break

            await asyncio.sleep(2)

        # Simpan action history ke file
        with open("output/action_history.json", "w", encoding="utf-8") as f:
            json.dump(action_history, f, indent=2)

    except Exception as e:
        logger.error(f"Terjadi error yang tidak terduga di alur utama: {e}")
    finally:
        await browser_engine.close()
        logger.info("Aplikasi selesai.")

if __name__ == "__main__":
    asyncio.run(main())


