from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from io import BytesIO
from pathlib import Path
from pypdf import PdfReader, PdfWriter
import json

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Kynetra-Password')
        self.end_headers()

    def end_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')

    def send_json(self, code, obj):
        data = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.end_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_pdf(self, data, filename):
        self.send_response(200)
        self.end_cors()
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == '/api/health':
            return self.send_json(200, {'ok': True, 'service': 'KynetraPDF'})
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length)
        password = self.headers.get('X-Kynetra-Password', '')
        try:
            if self.path == '/api/protect':
                if not password:
                    return self.send_json(400, {'error': 'Password is required.'})
                reader = PdfReader(BytesIO(body))
                writer = PdfWriter()
                for p in reader.pages:
                    writer.add_page(p)
                writer.encrypt(password)
                out = BytesIO()
                writer.write(out)
                return self.send_pdf(out.getvalue(), 'KynetraPDF_Protected.pdf')

            if self.path == '/api/unlock':
                if not password:
                    return self.send_json(400, {'error': 'Password is required.'})
                reader = PdfReader(BytesIO(body))
                if reader.is_encrypted:
                    result = reader.decrypt(password)
                    if result == 0:
                        return self.send_json(401, {'error': 'Incorrect password.'})
                writer = PdfWriter()
                for p in reader.pages:
                    writer.add_page(p)
                out = BytesIO()
                writer.write(out)
                return self.send_pdf(out.getvalue(), 'KynetraPDF_Unlocked.pdf')

            return self.send_json(404, {'error': 'Unknown API route.'})
        except Exception as exc:
            return self.send_json(500, {'error': str(exc)})

    def log_message(self, fmt, *args):
        print('[KynetraPDF]', fmt % args)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='KynetraPDF local server')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', default=8787, type=int)
    args = parser.parse_args()
    print(f'KynetraPDF running at http://{args.host}:{args.port}')
    print('Open the URL above in your browser.')
    ThreadingHTTPServer((args.host, args.port), lambda *a, **kw: Handler(*a, directory=str(ROOT), **kw)).serve_forever()
