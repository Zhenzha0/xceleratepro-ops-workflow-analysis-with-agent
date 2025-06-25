import http.server
import socketserver
import json

class QwenHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"status": "connected", "model": "qwen2.5-1.5b-instruct"}
            self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        if self.path == '/generate':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            data = json.loads(body.decode())
            
            # TODO: Connect to actual Qwen model in AI Edge Gallery
            response_text = f"Qwen Analysis: {data.get('prompt', '')}"
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {"response": response_text, "model": "qwen2.5-1.5b-instruct"}
            self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    with socketserver.TCPServer(("", 8080), QwenHandler) as httpd:
        print("Qwen Bridge Active - Port 8080")
        httpd.serve_forever()