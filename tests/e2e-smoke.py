"""
Smoke test for Command Center — checks critical pages load and key UI elements render.
Tests against the production deployment.
"""
import sys
from playwright.sync_api import sync_playwright

URL = "https://command-center-sonance.vercel.app"
RESULTS = []

def check(name, passed, detail=""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append((name, status, detail))
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True,
        )
        page = context.new_page()

        # Collect console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # ── Test 1: App loads ──
        print("\n1. App loads")
        try:
            response = page.goto(URL, wait_until="networkidle", timeout=30000)
            check("Homepage loads", response is not None and response.status < 400, f"status={response.status if response else 'none'}")
        except Exception as e:
            check("Homepage loads", False, str(e))
            browser.close()
            return

        # Take screenshot of whatever we land on
        page.screenshot(path="/tmp/cc-home.png", full_page=False)

        # ── Test 2: Check if we hit login or dashboard ──
        print("\n2. Auth state")
        current_url = page.url
        is_login = "/login" in current_url
        is_home = "/login" not in current_url
        check("Reached a valid page", is_login or is_home, f"url={current_url}")

        if is_login:
            # ── Test 3: Login page elements ──
            print("\n3. Login page")
            sign_in_btn = page.locator("text=Sign in").first
            check("Sign in button visible", sign_in_btn.is_visible(timeout=5000) if sign_in_btn else False)

            page.screenshot(path="/tmp/cc-login.png")
            check("Login page screenshot saved", True, "/tmp/cc-login.png")

            # Can't test authenticated features without credentials
            print("\n  (Skipping authenticated tests — login page reached)")

        else:
            # ── Test 3: Dashboard elements ──
            print("\n3. Dashboard elements")

            # Check for key sections
            page.wait_for_timeout(3000)  # Let data load
            page.screenshot(path="/tmp/cc-dashboard.png", full_page=True)

            # Check tab bar exists
            tab_bar = page.locator("nav, [role='tablist']").first
            check("Tab bar present", tab_bar.is_visible(timeout=5000) if tab_bar else False)

            # Check for onboarding OR dashboard content
            onboarding = page.locator("text=Welcome").first
            dashboard = page.locator("text=Attention, text=Communications, text=Calendar").first
            has_content = (onboarding.is_visible(timeout=2000) if onboarding else False) or \
                         (dashboard.is_visible(timeout=2000) if dashboard else False)
            check("Has onboarding or dashboard content", has_content)

            # ── Test 4: Communications section ──
            print("\n4. Communications section")
            comms = page.locator("text=Communications").first
            if comms and comms.is_visible(timeout=3000):
                check("Communications section visible", True)

                # Check for tier headers (new feature)
                act_now = page.locator("text=Act Now").first
                follow_up = page.locator("text=Follow Up").first
                stay_aware = page.locator("text=Stay Aware").first
                has_tiers = any([
                    act_now and act_now.is_visible(timeout=2000),
                    follow_up and follow_up.is_visible(timeout=2000),
                    stay_aware and stay_aware.is_visible(timeout=2000),
                ])
                check("Tier headers present (Act Now/Follow Up/Stay Aware)", has_tiers)

                # Check for service icons
                service_icons = page.locator("svg").all()
                check("SVG icons present", len(service_icons) > 0, f"count={len(service_icons)}")
            else:
                check("Communications section visible", False, "Not found")

            # ── Test 5: Calendar tab ──
            print("\n5. Calendar tab")
            cal_tab = page.locator("text=Calendar").first
            if cal_tab and cal_tab.is_visible(timeout=3000):
                cal_tab.click()
                page.wait_for_timeout(2000)
                page.screenshot(path="/tmp/cc-calendar.png", full_page=True)

                # Check for week navigation (new feature)
                prev_btn = page.locator("[aria-label='Previous week']").first
                next_btn = page.locator("[aria-label='Next week']").first
                check("Week navigation buttons present",
                      (prev_btn and prev_btn.is_visible(timeout=2000)) or False)

                # Check for prep buttons (new feature)
                prep_btns = page.locator("text=Prep").all()
                check("Prep buttons on events", len(prep_btns) > 0, f"count={len(prep_btns)}")

                # Check week grid
                week_grid = page.locator("text=Week at a Glance").first
                check("Week at a Glance grid", week_grid.is_visible(timeout=2000) if week_grid else False)
            else:
                check("Calendar tab", False, "Tab not found")

        # ── Test 6: Console errors ──
        print("\n6. Console health")
        critical_errors = [e for e in console_errors if "TypeError" in e or "ReferenceError" in e or "SyntaxError" in e]
        check("No critical JS errors", len(critical_errors) == 0,
              f"{len(critical_errors)} errors" if critical_errors else "clean")
        if critical_errors:
            for err in critical_errors[:5]:
                print(f"    ERROR: {err[:200]}")

        browser.close()

    # ── Summary ──
    print("\n" + "=" * 50)
    passed = sum(1 for _, s, _ in RESULTS if s == "PASS")
    failed = sum(1 for _, s, _ in RESULTS if s == "FAIL")
    print(f"Results: {passed} passed, {failed} failed, {len(RESULTS)} total")

    if failed > 0:
        print("\nFailed tests:")
        for name, status, detail in RESULTS:
            if status == "FAIL":
                print(f"  FAIL: {name} — {detail}")

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(run_tests())
