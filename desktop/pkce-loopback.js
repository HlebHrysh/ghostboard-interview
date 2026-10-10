/**
 * Ghostboard Desktop — OAuth 2.0 PKCE Loopback Server
 * 
 * Complies with RFC 7636 (Proof Key for Code Exchange):
 * - Generates high-entropy cryptographic code_verifier & code_challenge (SHA-256)
 * - Spins up an ephemeral local HTTP server on 127.0.0.1 (dynamic OS port)
 * - Serves a branded confirmation page upon authorization
 * - Safely resolves code + verifier for session token exchange
 */

const http = require('http');
const crypto = require('crypto');
const { shell } = require('electron');

function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

class PkceLoopback {
  constructor(serverBaseUrl = 'https://ghostboard.ai') {
    this.serverBaseUrl = serverBaseUrl.replace(/\/$/, '');
    this.server = null;
    this.timeoutTimer = null;
  }

  /**
   * Generates PKCE parameters according to RFC 7636.
   */
  generatePkce() {
    // 32 bytes high-entropy random verifier
    const verifierBuffer = crypto.randomBytes(32);
    const verifier = base64UrlEncode(verifierBuffer);

    // SHA-256 Code Challenge
    const hash = crypto.createHash('sha256').update(verifier).digest();
    const challenge = base64UrlEncode(hash);

    // CSRF State parameter
    const state = base64UrlEncode(crypto.randomBytes(16));

    return { verifier, challenge, state };
  }

  /**
   * Starts the loopback server and opens the browser for authorization.
   * Returns a promise that resolves with { code, verifier } or rejects on error/timeout.
   */
  startAuthFlow() {
    return new Promise((resolve, reject) => {
      const { verifier, challenge, state } = this.generatePkce();

      this.server = http.createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url, 'http://127.0.0.1');

          if (reqUrl.pathname === '/callback') {
            const receivedState = reqUrl.searchParams.get('state');
            const code = reqUrl.searchParams.get('code');
            const directToken = reqUrl.searchParams.get('token');
            const error = reqUrl.searchParams.get('error');

            if (error) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(this._renderHtml('Помилка авторизації', `Сервер повернув помилку: ${error}`, false));
              this.cleanup();
              return reject(new Error(`OAuth error: ${error}`));
            }

            if (receivedState !== state) {
              res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(this._renderHtml('Помилка безпеки', 'Невідповідність параметра CSRF state.', false));
              this.cleanup();
              return reject(new Error('State mismatch: CSRF validation failed'));
            }

            // Success response
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this._renderHtml('Успішна авторизація!', 'Ghostboard Desktop підключено. Можете закрити цю вкладку.', true));

            this.cleanup();
            resolve({
              code: code || null,
              verifier,
              directToken: directToken || null,
            });
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          this.cleanup();
          reject(err);
        }
      });

      // Bind to 127.0.0.1:0 for dynamic OS port allocation
      this.server.listen(0, '127.0.0.1', () => {
        const port = this.server.address().port;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        // Build browser authentication URL
        const authUrl = new URL(`${this.serverBaseUrl}/auth/login`);
        authUrl.searchParams.set('client', 'desktop');
        authUrl.searchParams.set('code_challenge', challenge);
        authUrl.searchParams.set('code_challenge_method', 'S256');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('redirect_uri', redirectUri);

        // Open default OS browser
        shell.openExternal(authUrl.toString()).catch((err) => {
          this.cleanup();
          reject(new Error(`Failed to open system browser: ${err.message}`));
        });

        // 5-minute timeout guard
        this.timeoutTimer = setTimeout(() => {
          this.cleanup();
          reject(new Error('Browser authorization timed out (5 minutes).'));
        }, 5 * 60 * 1000);
      });

      this.server.on('error', (err) => {
        this.cleanup();
        reject(err);
      });
    });
  }

  cleanup() {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  _renderHtml(title, message, isSuccess) {
    const accentColor = isSuccess ? '#10b981' : '#ef4444';
    return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <title>${title} — Ghostboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000000;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: rgba(10, 10, 14, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(20px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid ${accentColor};
      color: ${accentColor};
      font-size: 24px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 10px;
      letter-spacing: -0.02em;
    }
    p {
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.6;
    }
    .btn-return {
      display: inline-block;
      margin-top: 24px;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-return:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${isSuccess ? '✓' : '✕'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="javascript:window.close()" class="btn-return">Закрити вкладку</a>
  </div>
</body>
</html>`;
  }
}

module.exports = { PkceLoopback };
