// Quick test of emulator bridge connection
const http = require('http');

const data = JSON.stringify({
  prompt: "Test connection to Gemma model"
});

const options = {
  hostname: '10.0.2.2',
  port: 8080,
  path: '/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  },
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log('✓ Connection successful, status:', res.statusCode);
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (err) => {
  console.log('✗ Connection failed:', err.message);
  console.log('Bridge service needs to be running on port 8080 in emulator');
});

req.on('timeout', () => {
  console.log('✗ Connection timeout - emulator not responding');
  req.destroy();
});

req.write(data);
req.end();