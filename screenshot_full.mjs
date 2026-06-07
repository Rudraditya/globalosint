import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1440, height: 900 })

// ── View 1: Supply & Production (full page) ──
await page.goto('http://localhost:5173')
await page.waitForTimeout(5000)
await page.screenshot({ path: 'preview_supply_top.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, 700))
await page.waitForTimeout(400)
await page.screenshot({ path: 'preview_supply_mid.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, 1500))
await page.waitForTimeout(400)
await page.screenshot({ path: 'preview_supply_map.png', fullPage: false })

// ── View 2: Macro Indicators (full page) ──
await page.evaluate(() => window.scrollTo(0, 0))
await page.click('button:has-text("Macro")')
await page.waitForTimeout(5000)
await page.screenshot({ path: 'preview_macro_top.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, 700))
await page.waitForTimeout(400)
await page.screenshot({ path: 'preview_macro_mid.png', fullPage: false })
await page.evaluate(() => window.scrollTo(0, 1400))
await page.waitForTimeout(400)
await page.screenshot({ path: 'preview_macro_bottom.png', fullPage: false })

await browser.close()
console.log('done')
