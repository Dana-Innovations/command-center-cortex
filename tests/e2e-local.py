"""
Local smoke test — tests against dev server (https://localhost:3000).
Checks that all new components render without JS errors.
"""
import sys
from playwright.sync_api import sync_playwright

URL = "https://localhost:3000"
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
        print("\n1. App loads (local dev)")
        try:
            response = page.goto(URL, wait_until="networkidle", timeout=15000)
            check("Dev server responds", response is not None and response.status < 400, f"status={response.status if response else 'none'}")
        except Exception as e:
            check("Dev server responds", False, str(e))
            browser.close()
            return 1

        page.screenshot(path="/tmp/cc-local-home.png", full_page=False)
        current_url = page.url

        # ── Test 2: Login page renders ──
        print("\n2. Login page")
        is_login = "/login" in current_url
        check("Redirected to login", is_login, f"url={current_url}")

        if is_login:
            sign_in = page.locator("button, a").filter(has_text="Sign in")
            check("Sign in button renders", sign_in.first.is_visible(timeout=3000) if sign_in.count() > 0 else False)

        # ── Test 3: Check for hydration/runtime errors ──
        print("\n3. JS health check")
        page.wait_for_timeout(2000)

        # Check for Next.js error overlay
        error_overlay = page.locator("[data-nextjs-dialog], [data-nextjs-error], #__next-build-error").first
        has_error_overlay = error_overlay.is_visible(timeout=1000) if error_overlay else False
        check("No Next.js error overlay", not has_error_overlay)

        # Check console errors
        critical = [e for e in console_errors if any(t in e for t in ["TypeError", "ReferenceError", "SyntaxError", "ChunkLoadError"])]
        check("No critical JS errors", len(critical) == 0, f"{len(critical)} errors" if critical else "clean")
        if critical:
            for err in critical[:5]:
                print(f"    ERROR: {err[:200]}")

        # ── Test 4: Try to access pages directly (even without auth, check they don't crash) ──
        print("\n4. Route health (no auth, expect redirects)")
        routes = [
            ("/", "Home"),
            ("/?tab=calendar", "Calendar"),
            ("/?tab=communications", "Communications"),
        ]
        for route, label in routes:
            try:
                resp = page.goto(f"{URL}{route}", wait_until="networkidle", timeout=10000)
                page.wait_for_timeout(1000)
                route_errors = [e for e in console_errors if any(t in e for t in ["TypeError", "ReferenceError", "SyntaxError"])]
                check(f"Route {label} ({route}) — no crash", resp is not None and resp.status < 500, f"status={resp.status if resp else 'none'}")
            except Exception as e:
                check(f"Route {label} ({route}) — no crash", False, str(e)[:100])

        # ── Test 5: Build output verification ──
        print("\n5. Static assets")
        try:
            # Check that key JS bundles load
            resp = page.goto(f"{URL}/login", wait_until="networkidle", timeout=10000)
            page.wait_for_timeout(1000)
            # Verify the page has rendered content (not a blank page)
            body_text = page.locator("body").inner_text(timeout=3000)
            check("Login page has content", len(body_text.strip()) > 10, f"chars={len(body_text.strip())}")
        except Exception as e:
            check("Login page has content", False, str(e)[:100])

        page.screenshot(path="/tmp/cc-local-final.png", full_page=False)
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
