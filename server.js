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
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(req, res, filePath, fileStats, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";
  const baseHeaders = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  };
  const method = req.method || "GET";
  const rangeHeader = req.headers.range;

  if (typeof rangeHeader === "string" && rangeHeader.startsWith("bytes=")) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match) {
      res.writeHead(416, {
        ...baseHeaders,
        "Content-Range": `bytes */${fileStats.size}`,
      });
      res.end();
      return;
    }

    const start = match[1] === "" ? 0 : Number.parseInt(match[1], 10);
    const end =
      match[2] === "" ? fileStats.size - 1 : Number.parseInt(match[2], 10);

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      end < start ||
      end >= fileStats.size
    ) {
      res.writeHead(416, {
        ...baseHeaders,
        "Content-Range": `bytes */${fileStats.size}`,
      });
      res.end();
      return;
    }

    const contentLength = end - start + 1;
    res.writeHead(206, {
      ...baseHeaders,
      "Content-Length": contentLength,
      "Content-Range": `bytes ${start}-${end}/${fileStats.size}`,
    });

    if (method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.writeHead(statusCode, {
    ...baseHeaders,
    "Content-Length": fileStats.size,
  });

  if (method === "HEAD") {
    res.end();
    return;
  }

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
      sendFile(req, res, filePath, fileStats);
      return;
    }
  } catch {
    // Fall through to SPA fallback.
  }

  const fallback = path.resolve(distDir, "index.html");
  try {
    await access(fallback);
    const fallbackStats = await stat(fallback);
    sendFile(req, res, fallback, fallbackStats);
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
