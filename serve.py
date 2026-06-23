"""
Sanchaara AI — Local Development Server
Serves the frontend (including hotspots.json data) at http://localhost:8000

Usage:
    cd /path/to/SanchaaraAI
    python3 serve.py
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import threading

PORT  = 8000
ROOT  = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        # Only log non-asset requests
        if args and isinstance(args[0], str) and any(args[0].startswith(p) for p in ['/frontend', '/data']):
            print(f"  {args[0]}  ->  {args[1]}", flush=True)

    def end_headers(self):
        # CORS headers so fetch() works
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

def open_browser():
    import time; time.sleep(0.5)
    webbrowser.open(f'http://localhost:{PORT}/frontend/index.html')

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    os.chdir(ROOT)
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        httpd.allow_reuse_address = True
        print()
        print('==============================================')
        print('  Sanchaara AI -- Dev Server')
        print('==============================================')
        print(f'  Landing:   http://localhost:{PORT}/frontend/')
        print(f'  Dashboard: http://localhost:{PORT}/frontend/dashboard.html')
        print('----------------------------------------------')
        print('  Press Ctrl+C to stop')
        print('==============================================')
        print()
        threading.Thread(target=open_browser, daemon=True).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n\nServer stopped.')
            sys.exit(0)
