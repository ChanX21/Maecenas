"""UI regression check using local fixtures; never submits real research or payments.

Start the frontend with NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4400,
then run: python3 test/app-shell.smoke.py
Requires the existing Python Playwright installation and Chromium.
Pass --browser-channel chrome to use an installed Chrome instead.
"""
import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:3000")
parser.add_argument("--browser-channel")
args = parser.parse_args()
source = {
    "id": "src_ui_check", "title": "Attention Is All You Need", "authorName": "Ashish Vaswani et al.",
    "sourceUrl": "https://arxiv.org/abs/1706.03762", "citationPriceUSDC": "0.0001",
    "abstract": "The transformer architecture uses attention to model relationships in a sequence, providing a foundation for modern language models.",
    "tags": ["Artificial intelligence", "Transformers"], "status": "approved", "license": "CC BY 4.0",
    "walletAddress": "0x" + "11" * 20, "ownerWallet": "0x" + "11" * 20,
    "createdAt": "2026-10-09T00:00:00Z"
}
receipt = {
    "id": "rcpt_ui_check", "answerId": "ans_ui_check", "sourceId": source["id"],
    "sourceTitle": source["title"], "userPrompt": "Why do transformer models work so well?",
    "amountUSDC": "0.0001", "status": "paid", "network": "eip155:5042002",
    "payerAgent": "Research agent", "payerWallet": "0x" + "22" * 20,
    "recipientWallet": source["walletAddress"], "fundedBy": "maecenas_sponsored",
    "receiptSignature": "ui-test-signature", "createdAt": source["createdAt"]
}
ledger = {"paymentMode": "real", "metrics": {
    "fundedCommissions": 53, "paidEvidenceUnlocks": 146, "contributorsRewarded": 18,
    "totalUSDCDistributed": "0.09751", "sourcesRegistered": 58,
    "paidSearchRevenueUSDC": "0.04", "userPaidSourcePayoutsUSDC": "0.00884", "grossRetainedUSDC": "0.03116",
    "aiCostUSDC": "0.004", "customerCreditLiabilityUSDC": "0.10", "trackedContributionUSDC": "0.02716",
    "monthlyInfraCostUSDC": "52", "monthlyOtherCostUSDC": "0", "monthlyNetUSDC": "-51.97284",
    "sourcePayoutsUSDC": "0.00884", "paidCitations": 146
}, "recentPaymentStream": [receipt], "topEarningSources": [
    {"sourceId": source["id"], "title": source["title"], "authorName": source["authorName"], "citations": 10, "earnedUSDC": "0.05"}
]}
usage = {"sessionId": "sess_ui_check", "freeSearchesRemaining": 2, "freeSearchesUsed": 0,
         "freeSearchLimit": 2, "paidSearchesUsed": 0, "requiresPayment": False,
         "paidSearchPriceUSDC": "0.10", "paidEvidenceBudgetUSDC": "0.06",
         "freeEvidenceBudgetUSDC": "0.01", "paymentMode": "real"}
answer = {"id": "ans_ui_check", "prompt": receipt["userPrompt"], "response": "Attention helps models understand context.",
          "contentJson": {"summary": "Attention helps models understand how words relate to each other.",
                          "sections": [{"heading": "Why attention matters", "body": "Transformers compare positions in a sequence to identify relevant context.", "citations": [source["id"]]}],
                          "limitations": ["This brief covers the original transformer architecture."]},
          "budgetUSDC": "0.005", "spentUSDC": "0.0001", "paymentType": "free_sponsored",
          "citedSourceIds": [source["id"]], "decisionTraceJson": {"candidates": [source, source], "scoredSources": [],
          "events": [], "receipts": [receipt], "paymentMode": "real", "budgetDecision": {
              "selectedSources": [{"sourceId": source["id"]}],
              "skippedSources": [{"sourceId": "src_skip", "title": "Overlapping evidence", "reason": "Funded sources already cover this evidence."}]}}}
proof = {"valid": True, "settlement": {"verification": "incomplete", "message": "UI test payment details are incomplete.", "checkedAt": source["createdAt"]}}
requests = []
research_response_ready = threading.Event()


def assert_no_browser_errors(errors, phase):
    assert not errors, f"{phase}: {errors}"


class Fixtures(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def respond(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.respond({})

    def do_GET(self):
        path = urlparse(self.path).path
        routes = {"/api/usage": usage, "/api/leaderboard": ledger,
                  "/api/sources": {"items": [source], "pagination": {"page": 1, "totalPages": 1, "totalItems": 1, "pageSize": 24, "hasNextPage": False, "hasPreviousPage": False}},
                  f"/api/sources/{source['id']}": {"source": source},
                  "/api/answers/ans_ui_check": {"answer": answer},
                  "/api/receipts/rcpt_ui_check": {"receipt": receipt},
                  "/api/receipts/rcpt_ui_check/verify": proof}
        self.respond(routes.get(path, {}), 200 if path in routes else 404)

    def do_POST(self):
        requests.append(json.loads(self.rfile.read(int(self.headers["Content-Length"]))))
        if urlparse(self.path).path == "/api/research":
            research_response_ready.wait(timeout=15)
        self.respond({"answerId": "ans_ui_check", "status": "completed"})


server = ThreadingHTTPServer(("127.0.0.1", 4400), Fixtures)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.browser_channel)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page.set_default_timeout(30000)
        expect.set_options(timeout=15000)
        page.add_init_script("""for (const name of ['research', 'contribute', 'answer']) {
            localStorage.setItem(`maecenas:onboarding:${name}`, JSON.stringify({version:1, dismissedAt:'2026-10-09'}));
        }""")
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: print("BROWSER ERROR:", message.text[:1600]) if message.type == "error" else None)
        page.goto(args.base_url)
        expect(page.get_by_text("2 free searches left", exact=True).last).to_be_visible()
        feedback_link = page.get_by_role("link", name="Send feedback", exact=True).first
        expect(feedback_link).to_be_visible()
        assert feedback_link.get_attribute("href").startswith("mailto:maecenasResearchProtocol@proton.me?")
        assert "Page%3A%20%2F" in feedback_link.get_attribute("href")
        page.get_by_role("button", name="Copy feedback email", exact=True).first.click()
        expect(page.get_by_text("Feedback email copied", exact=True).first).to_be_attached()
        assert_no_browser_errors(errors, "initial research page")
        expect(page.get_by_role("button", name="Start research", exact=True)).to_be_disabled()
        page.screenshot(path="/tmp/maecenas-redesign-desktop.png", full_page=True)
        page.get_by_role("button", name="Collapse sidebar").click()
        expect(page.locator(".app-sidebar")).to_have_css("width", "76px")
        page.get_by_role("button", name="Expand sidebar").click()
        expect(page.locator(".app-sidebar")).to_have_css("width", "248px")
        page.get_by_role("button", name="Understand AI").click()
        question = page.get_by_role("textbox", name="Research question")
        expect(question).to_have_value("Why are transformer models effective for modern AI systems?")
        expect(question).to_be_focused()
        question.press("Shift+Enter")
        assert "\n" in question.input_value()
        assert not requests
        page.get_by_role("button", name="Research posture: Balanced", exact=True).click()
        expect(page.get_by_role("listbox", name="Research posture")).to_be_visible()
        page.get_by_role("option", name="Balanced").press("ArrowDown")
        expect(page.get_by_role("option", name="Expansive")).to_be_focused()
        page.get_by_role("option", name="Expansive").press("Enter")
        expect(page.get_by_role("button", name="Research posture: Expansive", exact=True)).to_be_focused()
        expect(page.get_by_role("listbox", name="Research posture")).not_to_be_visible()
        budget_trigger = page.get_by_role("button", name="Budget", exact=True)
        budget_trigger.click()
        budget = page.get_by_label("Source payment budget")
        expect(budget).to_be_visible()
        budget.press("Home")
        budget.press("ArrowRight")
        expect(budget).to_have_value("0.0002")
        question.click(position={"x": 10, "y": 10})
        expect(budget).not_to_be_visible()
        expect(question).to_be_focused()
        budget_trigger.click()
        budget.press("Escape")
        expect(budget).not_to_be_visible()
        expect(budget_trigger).to_be_focused()
        question.press("Enter")
        status = page.get_by_role("region", name="Research status", exact=True)
        expect(status).to_be_visible()
        expect(question).to_have_value("")
        expect(page.get_by_role("heading", name="Where will your curiosity take you?", exact=True)).to_have_count(0)
        expect(page.get_by_role("region", name="Suggested questions")).to_be_visible()
        expect(page.get_by_role("region", name="Research activity", exact=True)).to_be_visible()
        assert status.bounding_box()["y"] < page.locator(".research-composer").bounding_box()["y"]
        research_response_ready.set()
        page.wait_for_url("**/answer/ans_ui_check")
        assert len(requests) == 1 and requests[0]["strategy"] == "aggressive" and requests[0]["budgetUSDC"] == "0.0002"
        page.get_by_text("Open the research ledger", exact=True).click()
        expect(page.get_by_text("Funded sources already cover this evidence.", exact=True)).to_be_visible()
        page.get_by_role("button", name="Verify payment with Circle").click()
        expect(page.get_by_role("dialog", name="Payment proof")).to_be_visible()
        page.keyboard.press("Escape")
        assert_no_browser_errors(errors, "desktop research and answer flow")
        print("PASS: desktop navigation, suggestions, budget and mode controls, Enter/Shift+Enter, answer ledger, payment proof")

        page.get_by_role("link", name="Source archive", exact=True).click()
        expect(page.get_by_role("heading", name="Evidence worth funding.", exact=True)).to_be_visible()
        expect(page.locator("main").get_by_role("heading", name=source["title"], exact=True)).to_be_visible()
        page.wait_for_function("document.fonts.status === 'loaded'")
        page.screenshot(path="/tmp/maecenas-redesign-archive.png", full_page=True)
        for label, heading in [("Agents", "Maecenas is callable."), ("Earnings", "Your listings can earn."), ("Public ledger", "Capital follows useful evidence.")]:
            page.get_by_role("link", name=label, exact=True).first.click()
            expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
        page.get_by_role("link", name="New research", exact=True).click()
        page.wait_for_url("**/ask")
        expect(page.get_by_role("textbox", name="Research question")).to_be_visible()
        page.get_by_role("button", name="Open guided tours").click()
        page.get_by_role("menuitem", name="Research a question").click()
        expect(page.get_by_role("dialog", name="Start with a clear question")).to_be_visible()
        page.get_by_role("button", name="Skip guided tour").click()
        page.get_by_role("button", name="Pay 0.10 USDC", exact=True).click()
        page.get_by_role("textbox", name="Research question").fill("A paid research question")
        page.get_by_role("button", name="Start research", exact=True).click()
        expect(page.get_by_text("Pay for research", exact=True)).to_be_visible()
        status = page.get_by_role("region", name="Research status", exact=True)
        assert status.bounding_box()["y"] < page.locator(".research-composer").bounding_box()["y"]
        expect(page.get_by_role("heading", name="Where will your curiosity take you?", exact=True)).to_have_count(0)
        expect(page.get_by_role("region", name="Suggested questions")).to_be_visible()
        expect(page.get_by_role("region", name="Research activity", exact=True)).to_be_visible()
        status.get_by_role("button", name="Connect wallet", exact=True).click()
        expect(page.get_by_role("dialog", name="Connect your wallet")).to_be_visible()
        page.get_by_role("button", name="Close wallet dialog").click()
        assert len(requests) == 1, "A paid run must still wait for wallet confirmation"
        assert_no_browser_errors(errors, "desktop navigation and paid flow")
        print("PASS: archive, agents, earnings, leaderboard, guided tours, paid-search gate")

        page.goto(args.base_url)
        expect(page.get_by_role("heading", name="Where will your curiosity take you?", exact=True)).to_be_visible()
        assert_no_browser_errors(errors, "mobile reload")
        for width in [390, 320, 768]:
            page.set_viewport_size({"width": width, "height": 844})
            page.get_by_role("button", name="Open navigation").click()
            dialog = page.get_by_role("dialog", name="Navigation", exact=True)
            expect(dialog).to_be_visible()
            page.keyboard.press("Escape")
            expect(dialog).not_to_be_visible()
            expect(page.get_by_role("button", name="Open navigation")).to_be_focused()
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"Overflow at {width}px"
            page.get_by_role("button", name="Budget", exact=True).click()
            assert_no_browser_errors(errors, f"responsive layout at {width}px")
            bounds = page.get_by_label("Source payment budget").bounding_box()
            assert bounds and bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= width
            page.get_by_role("button", name="Budget", exact=True).click()
            if width == 390:
                page.screenshot(path="/tmp/maecenas-redesign-mobile.png", full_page=True)
        page.get_by_role("button", name="Open navigation").click()
        expect(page.get_by_role("dialog", name="Navigation", exact=True).get_by_role("link", name="Send feedback", exact=True)).to_be_visible()
        page.get_by_role("dialog", name="Navigation", exact=True).get_by_role("button", name="Connect wallet", exact=True).click()
        expect(page.get_by_role("dialog", name="Navigation", exact=True)).not_to_be_visible()
        expect(page.get_by_role("dialog", name="Connect your wallet")).to_be_visible()
        page.get_by_role("button", name="Close wallet dialog").click()
        page.get_by_role("button", name="Open navigation").click()
        page.get_by_role("dialog", name="Navigation", exact=True).get_by_role("link", name="Source archive").click()
        expect(page.get_by_role("dialog", name="Navigation", exact=True)).not_to_be_visible()
        expect(page.get_by_role("heading", name="Evidence worth funding.", exact=True)).to_be_visible()
        expect(page.get_by_role("heading", name=source["title"], exact=True)).to_be_visible()
        assert_no_browser_errors(errors, "mobile navigation and wallet flow")
        print("PASS: mobile/tablet navigation, focus restoration, budget popover, no overflow, no browser errors")
        browser.close()
finally:
    server.shutdown()
    server.server_close()
