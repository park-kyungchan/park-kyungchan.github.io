#!/usr/bin/env python3
"""Serve the R009 candidate folder on localhost without external dependencies."""
from __future__ import annotations
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENTRY = 'P003_R009_Integrated_Spatial_Revolution_Lab_Standalone.html'

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt: str, *args: object) -> None:
        print(f'[r009-local] {self.address_string()} - {fmt % args}')

def main() -> None:
    parser = argparse.ArgumentParser(description='Serve the P003 R009 local/offline lab.')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    os.chdir(ROOT)
    server = ThreadingHTTPServer((args.host, args.port), NoCacheHandler)
    print(f'Open http://{args.host}:{args.port}/{DEFAULT_ENTRY}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
