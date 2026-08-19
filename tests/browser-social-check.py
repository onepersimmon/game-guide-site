# @author zwy
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    errors = []
    desktop = browser.new_page(viewport={"width": 1440, "height": 900})
    desktop.set_default_timeout(5000)
    desktop.set_default_navigation_timeout(5000)
    desktop.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    desktop.on("pageerror", lambda error: errors.append(str(error)))
    desktop.goto("http://127.0.0.1:4173", wait_until="domcontentloaded")
    desktop.locator("#world-map-view").wait_for()
    desktop.get_by_role("button", name="社区攻略").click()
    desktop.locator("#social-portal-grid").wait_for(state="attached")
    desktop.screenshot(path="/tmp/poe2-community-desktop.png", full_page=True)
    desktop_state = desktop.locator("#community-panel").evaluate("""element => ({
      hidden: element.hidden,
      portalCount: element.querySelectorAll('.social-portal-card').length,
      guideCount: element.querySelectorAll('.social-guide-card').length,
    })""")

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.set_default_timeout(5000)
    mobile.set_default_navigation_timeout(5000)
    mobile.goto("http://127.0.0.1:4173", wait_until="domcontentloaded")
    mobile.locator("#world-map-view").wait_for(state="attached")
    mobile.get_by_role("button", name="社区攻略").click()
    mobile_overflow = mobile.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    mobile.screenshot(path="/tmp/poe2-community-mobile.png", full_page=True)
    print({"desktopState": desktop_state, "mobileOverflow": mobile_overflow, "errors": errors})
    browser.close()
    if errors or desktop_state["hidden"] or desktop_state["portalCount"] != 2 or mobile_overflow:
        raise SystemExit(1)
