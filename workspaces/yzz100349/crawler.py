import asyncio
import re
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

from playwright.async_api import (
    async_playwright,
    Browser,
    Page,
    TimeoutError as PlaywrightTimeoutError,
    Error as PlaywrightError,
)

from config import BROWSER_CONFIG, RETRY_CONFIG, PRICE_PATTERNS, KEY_SELECTORS, KEYWORDS_TO_EXTRACT


class PageCrawler:
    def __init__(self):
        self.price_patterns = [re.compile(p, re.IGNORECASE) for p in PRICE_PATTERNS]
        self.browser: Optional[Browser] = None
        self.context = None

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=BROWSER_CONFIG["headless"],
            slow_mo=BROWSER_CONFIG["slow_mo"],
        )
        self.context = await self.browser.new_context(
            viewport=BROWSER_CONFIG["viewport"],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="zh-CN",
        )
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        await self.playwright.stop()

    async def _safe_goto(self, page: Page, url: str) -> Tuple[bool, Optional[str]]:
        try:
            await page.goto(
                url,
                wait_until=BROWSER_CONFIG["wait_until"],
                timeout=BROWSER_CONFIG["wait_for_load_state_timeout"],
            )
            return True, None
        except PlaywrightTimeoutError as e:
            return False, f"页面加载超时: {str(e)}"
        except PlaywrightError as e:
            return False, f"页面加载失败: {str(e)}"
        except Exception as e:
            return False, f"未知错误: {str(e)}"

    async def _wait_for_page_ready(self, page: Page) -> None:
        try:
            await asyncio.sleep(2)
            await page.evaluate("""
                async () => {
                    await new Promise(resolve => {
                        if (document.readyState === 'complete') {
                            resolve();
                        } else {
                            window.addEventListener('load', resolve);
                        }
                    });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            """)
        except Exception:
            await asyncio.sleep(3)

    async def _extract_element_texts(
        self, page: Page, selectors: List[str], max_items: int = 10
    ) -> List[Dict]:
        results = []
        seen_texts = set()

        for selector in selectors:
            try:
                elements = await page.query_selector_all(selector)
                for element in elements[:max_items]:
                    try:
                        text = await element.inner_text()
                        text = text.strip()
                        if text and text not in seen_texts and len(text) < 500:
                            seen_texts.add(text)
                            visible = await element.is_visible()
                            results.append({
                                "selector": selector,
                                "text": text,
                                "visible": visible,
                            })
                    except Exception:
                        continue
            except Exception:
                continue

        return results

    def _extract_prices(self, text: str) -> List[str]:
        prices = []
        for pattern in self.price_patterns:
            matches = pattern.findall(text)
            for match in matches:
                match = match.strip()
                if match and match not in prices:
                    prices.append(match)
        return prices

    def _extract_keywords(self, text: str) -> List[str]:
        found = []
        text_lower = text.lower()
        for keyword in KEYWORDS_TO_EXTRACT:
            if keyword.lower() in text_lower:
                found.append(keyword)
        return found

    async def _extract_page_data(self, page: Page, url: str) -> Dict:
        page_title = ""
        try:
            page_title = await page.title()
        except Exception:
            pass

        try:
            full_html = await page.content()
        except Exception:
            full_html = ""

        full_text = ""
        try:
            body_element = await page.query_selector("body")
            if body_element:
                full_text = await body_element.inner_text()
        except Exception:
            pass

        price_elements = await self._extract_element_texts(page, KEY_SELECTORS["price"])
        button_elements = await self._extract_element_texts(page, KEY_SELECTORS["button"])
        activity_elements = await self._extract_element_texts(page, KEY_SELECTORS["activity"])
        title_elements = await self._extract_element_texts(page, KEY_SELECTORS["title"])

        all_text = " ".join([item["text"] for item in price_elements + button_elements + activity_elements + title_elements])
        all_prices = self._extract_prices(all_text + " " + full_text)
        keywords = self._extract_keywords(full_text + " " + all_text)

        return {
            "url": url,
            "page_title": page_title,
            "full_text": full_text[:5000] if len(full_text) > 5000 else full_text,
            "prices": all_prices,
            "keywords": keywords,
            "elements": {
                "prices": price_elements,
                "buttons": button_elements,
                "activities": activity_elements,
                "titles": title_elements,
            },
        }

    async def _take_screenshot(self, page: Page) -> bytes:
        return await page.screenshot(
            full_page=True,
            type="png",
        )

    async def crawl_page(self, url_info: Dict) -> Dict:
        url = url_info["normalized_url"]
        url_id = url_info["url_id"]
        original_url = url_info["original_url"]

        max_retries = RETRY_CONFIG["max_retries"]
        retry_delay = RETRY_CONFIG["retry_delay_seconds"]

        result = {
            "url_id": url_id,
            "original_url": original_url,
            "normalized_url": url,
            "success": False,
            "error": None,
            "retry_count": 0,
            "load_time_ms": 0,
            "screenshot": None,
            "data": None,
            "timestamp": time.time(),
        }

        for attempt in range(max_retries):
            page = None
            start_time = time.time()

            try:
                page = await self.context.new_page()
                page.set_default_timeout(BROWSER_CONFIG["timeout"])

                success, error = await self._safe_goto(page, url)
                if not success:
                    result["error"] = error
                    result["retry_count"] = attempt + 1
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                    break

                await self._wait_for_page_ready(page)

                page_data = await self._extract_page_data(page, url)
                screenshot = await self._take_screenshot(page)

                result["success"] = True
                result["error"] = None
                result["data"] = page_data
                result["screenshot"] = screenshot
                result["load_time_ms"] = int((time.time() - start_time) * 1000)
                result["retry_count"] = attempt + 1
                break

            except PlaywrightTimeoutError as e:
                result["error"] = f"操作超时: {str(e)}"
                result["retry_count"] = attempt + 1
            except PlaywrightError as e:
                result["error"] = f"浏览器错误: {str(e)}"
                result["retry_count"] = attempt + 1
            except Exception as e:
                result["error"] = f"抓取异常: {str(e)}"
                result["retry_count"] = attempt + 1
            finally:
                if page:
                    try:
                        await page.close()
                    except Exception:
                        pass

            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay * (attempt + 1))

        return result

    async def crawl_multiple(
        self, url_infos: List[Dict], concurrency: int = 3
    ) -> List[Dict]:
        semaphore = asyncio.Semaphore(concurrency)

        async def _crawl_with_semaphore(url_info: Dict) -> Dict:
            async with semaphore:
                return await self.crawl_page(url_info)

        tasks = [_crawl_with_semaphore(url_info) for url_info in url_infos]
        results = await asyncio.gather(*tasks)
        return results
