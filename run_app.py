"""
CONSTRUCTION PAYMENT TRACKER PRO - UNIVERSAL RUNNER
Run with: python run_app.py
Starts the local server and automatically launches the app in your default browser.
"""

import os
import sys
import webbrowser
import threading
import time

PORT = 8000
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"

def open_browser():
    time.sleep(1.2)
    print(f"\n[+] Dang mo trinh duyet tai: {URL}")
    webbrowser.open(URL)

def run():
    print("=" * 70)
    print("   CONSTRUCTION PAYMENT TRACKER PRO - KHOI CHAY UNG DUNG")
    print("   Quan Ly Toan Dien Thanh Toan & Khoi Luong Nghiem Thu Cong Trinh")
    print("=" * 70)
    print(f"\n[*] Khoi dong may chu tai: {URL}")
    print("[*] Nhan Ctrl + C de dung may chu.\n")

    # Start browser opener in background
    threading.Thread(target=open_browser, daemon=True).start()

    # Try FastAPI / Uvicorn first
    try:
        import uvicorn
        from backend.main import app
        uvicorn.run(app, host=HOST, port=PORT, log_level="info")
        return
    except ImportError:
        pass

    # Fallback to standard library http.server (Zero external dependencies)
    import http.server
    import socketserver

    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    os.chdir(frontend_dir)

    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
        print("[*] Dang chay bang che do Python SimpleHTTP...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[-] Da dung may chu.")

if __name__ == "__main__":
    run()
