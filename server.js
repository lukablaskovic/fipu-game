import http from "node:http";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "dist");
const port = Number.parseInt(process.env.PORT || "8080", 10);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";
  res.writeHead(statusCode, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  const requestUrl = new URL(req.url || "/", "http://localhost");
  const pathname = decodeURIComponent(requestUrl.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;

  const filePath = path.resolve(distDir, `.${requestedPath}`);
  const isInsideDist = filePath.startsWith(distDir);

  if (!isInsideDist) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (fileStats.isFile()) {
      sendFile(res, filePath);
      return;
    }
  } catch {
    // Fall through to SPA fallback.
  }

  const fallback = path.resolve(distDir, "index.html");
  try {
    await access(fallback);
    sendFile(res, fallback);
  } catch {
    sendText(
      res,
      500,
      "Build output not found. Run `npm run build` before starting the server."
    );
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});
