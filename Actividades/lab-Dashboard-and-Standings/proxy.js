const http = require('http');
const https = require('https');
const url = require('url');

const API_BASE = 'https://worldcup26.ir';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const targetUrl = `${API_BASE}${req.url}`;
  console.log(`[PROXY] ${req.method} ${targetUrl}`);

  const options = {
    method: req.method,
    headers: { ...req.headers },
  };
  delete options.headers.host;

  const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[PROXY] Error:', err);
    res.writeHead(500);
    res.end('Proxy error');
  });

  if (req.method === 'POST' || req.method === 'PUT') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Proxy CORS corriendo en http://localhost:${PORT}`);
  console.log(`Redirigiendo solicitudes a ${API_BASE}`);
});
