"""Read-only UI checks; uses an existing paid test receipt and mocked verification responses.

Requires Python Playwright + Chromium. Start the local frontend/backend, then run:
python3 test/payment-proof.smoke.py --receipt-id <paid-test-receipt-id>
"""
import argparse
import copy
import json
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:3410")
parser.add_argument("--receipt-id", required=True)
parser.add_argument("--screenshot", default="/tmp/maecenas-payment-proof.png")
args = parser.parse_args()
payment_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
tx_hash = "0x" + "ab" * 32
circle_url = f"https://gateway-api-testnet.circle.com/v1/x402/transfers/{payment_id}"
batch_url = f"https://testnet.arcscan.app/tx/{tx_hash}"
response = {
    "valid": True,
    "settlement": {
        "verification": "matched", "message": "Circle payment details match the saved record.",
        "checkedAt": "2026-10-06T00:00:00Z", "circleUrl": circle_url,
        "transfer": {
            "id": payment_id, "status": "received", "token": "USDC", "amount": "10000",
            "sendingNetwork": "eip155:5042002", "recipientNetwork": "eip155:5042002",
            "fromAddress": "0x" + "11" * 20, "toAddress": "0x" + "22" * 20,
            "updatedAt": "2026-10-06T00:00:00Z", "txHash": None
        }
    }
}
initial = copy.deepcopy(response)
calls = []
http_status = 200

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.clock.install()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def fulfill(route):
        calls.append(route.request.url)
        route.fulfill(status=http_status, content_type="application/json", body=json.dumps(response),
                      headers={"Access-Control-Allow-Origin": "*"})

    page.route("**/api/receipts/*/verify", fulfill)
    page.goto(f"{args.base_url}/receipts/{args.receipt_id}")
    trigger = page.get_by_role("button", name="Verify x402 with Circle")
    trigger.click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_be_visible()
    expect(dialog.get_by_text("Pending settlement · received by Gateway", exact=True)).to_be_visible()
    expect(dialog.get_by_role("link", name="Inspect raw Circle record")).to_have_attribute("href", circle_url)
    expect(dialog.get_by_role("link", name="Public verification JSON")).to_have_attribute("href", f"http://127.0.0.1:4400/api/receipts/{args.receipt_id}/verify")
    expect(dialog.get_by_role("link", name="View batch transaction on ArcScan")).to_have_count(0)

    for status, label in [("batched", "Pending settlement · included in a batch"),
                          ("confirmed", "Payment confirmed"), ("completed", "Payment completed"),
                          ("failed", "Payment failed")]:
        response["settlement"]["transfer"].update(status=status, txHash=tx_hash)
        response["settlement"]["batchExplorerUrl"] = batch_url
        dialog.get_by_role("button", name="Refresh proof").click()
        expect(dialog.get_by_text(label, exact=True)).to_be_visible()
        expect(dialog.get_by_role("link", name="View batch transaction on ArcScan")).to_have_attribute("href", batch_url)
    print("PASS: all five provider statuses, raw Circle link, batch link, public JSON")

    response["settlement"].update(verification="mismatch")
    dialog.get_by_role("button", name="Refresh proof").click()
    expect(dialog.get_by_text("Payment details mismatch", exact=True)).to_be_visible()
    expect(dialog.get_by_role("link", name="View batch transaction on ArcScan")).to_have_count(0)
    response = copy.deepcopy(initial)
    response["valid"] = False
    dialog.get_by_role("button", name="Refresh proof").click()
    expect(dialog.get_by_text("Maecenas receipt integrity check failed.", exact=True)).to_be_visible()

    for state in ["incomplete", "unavailable"]:
        response = {"valid": True, "settlement": {"verification": state, "message": state,
                    "checkedAt": "2026-10-06T00:00:00Z", "circleUrl": circle_url}}
        dialog.get_by_role("button", name="Refresh proof").click()
        expect(dialog.get_by_text(state, exact=True)).to_be_visible()
        expect(dialog.get_by_text("Settlement not verified", exact=True)).to_be_visible()
    http_status = 503
    dialog.get_by_role("button", name="Refresh proof").click()
    expect(dialog.get_by_text("Verification unavailable. Please retry.", exact=True)).to_be_visible()
    print("PASS: mismatched details, invalid receipt signature, incomplete data, provider/API errors")

    http_status = 200
    response = copy.deepcopy(initial)
    dialog.get_by_role("button", name="Refresh proof").click()
    expect(dialog.get_by_text("Pending settlement · received by Gateway", exact=True)).to_be_visible()
    response["settlement"]["transfer"]["status"] = "completed"
    page.clock.run_for(10_100)
    expect(dialog.get_by_text("Payment completed", exact=True)).to_be_visible()
    page.set_viewport_size({"width": 375, "height": 812})
    bounds = dialog.bounding_box()
    assert bounds and bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= 376
    page.screenshot(path=args.screenshot, full_page=True)
    page.keyboard.press("Escape")
    expect(dialog).to_have_count(0)
    expect(trigger).to_be_focused()
    after_close = len(calls)
    page.clock.run_for(20_100)
    assert len(calls) == after_close, "Closing the dialog must stop polling"
    assert not errors, errors
    print("PASS: automatic refresh, 375px layout, Escape/focus restoration, stopped polling, no page errors")
    print(f"Screenshot: {args.screenshot}")
    browser.close()
