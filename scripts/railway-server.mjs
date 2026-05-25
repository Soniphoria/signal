import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const port = Number(process.env.PORT || 3000);
const backendOrigin = process.env.SIGNAL_BACKEND_ORIGIN || "https://backend.soniphoria.app";

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".webmanifest", "application/manifest+json"],
  [".mid", "audio/midi"],
  [".midi", "audio/midi"],
  [".wav", "audio/wav"],
  [".mp3", "audio/mpeg"],
]);

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, content-type, Authorization");
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const resolveDistPath = (requestPath) => {
  const decodedPath = decodeURIComponent(requestPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(distDir, normalizedPath);

  if (!filePath.startsWith(distDir)) {
    return undefined;
  }

  return filePath;
};

const fileExists = async (filePath) => {
  try {
    const stat = await readFile(filePath);
    return stat;
  } catch {
    return undefined;
  }
};

const streamFile = async (res, filePath) => {
  const ext = path.extname(filePath);
  const contentType = contentTypes.get(ext) || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(res);
};

const getFallbackFile = (pathname) => {
  if (pathname === "/" || pathname === "") return "index.html";
  if (pathname === "/edit") return "edit.html";
  if (pathname === "/auth") return "auth.html";
  if (pathname === "/support") return "support.html";
  if (pathname === "/privacy") return "privacy.html";
  if (pathname === "/profile" || pathname === "/home") return "community.html";
  if (pathname.startsWith("/users/") || pathname.startsWith("/songs/")) return "community.html";
  if (pathname.startsWith("/projects/")) return "edit.html";
  if (pathname === "/track" || pathname.startsWith("/track/")) return "edit.html";
  if (pathname === "/arrange" || pathname.startsWith("/arrange/")) return "edit.html";
  if (pathname === "/tempo" || pathname.startsWith("/tempo/")) return "edit.html";
  return undefined;
};

const extractAzureBlobPath = (url) => {
  const queryPath = url.searchParams.get("path");
  if (queryPath) return queryPath;

  return url.pathname
    .replace(/^\/api\/azure-proxy\//, "")
    .replace(/^\/azure-proxy\//, "")
    .replace(/^\/api\/azure-proxy/, "")
    .replace(/^\/azure-proxy/, "");
};

const handleAzureProxy = async (req, res, url) => {
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const blobPath = extractAzureBlobPath(url);

  if (!blobPath) {
    sendJson(res, 400, {
      error: "No blob path provided",
      requestUrl: req.url,
      extractedPath: blobPath,
    });
    return;
  }

  const azureAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "kaiyolaustorageaccount";
  const containerName = "dawify-output";
  const azureUrl = `https://${azureAccountName}.blob.core.windows.net/${containerName}/${blobPath}`;
  const response = await fetch(azureUrl);

  if (!response.ok) {
    sendJson(res, response.status, {
      error: `Failed to fetch from Azure: ${response.status} ${response.statusText}`,
      azureUrl,
    });
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  res.writeHead(200, {
    "Content-Type": response.headers.get("content-type") || "audio/midi",
    "Content-Length": String(uint8Array.length),
    "Cache-Control": "public, max-age=3600",
  });
  res.end(Buffer.from(uint8Array));
};

const proxyBackendApi = async (req, res, url) => {
  const upstreamUrl = new URL(url.pathname.replace(/^\/api/, "") + url.search, backendOrigin);
  const headers = new Headers(req.headers);
  headers.set("host", upstreamUrl.host);

  const response = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
    duplex: "half",
  });

  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
};

const server = createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname.startsWith("/api/azure-proxy") || pathname.startsWith("/azure-proxy")) {
      await handleAzureProxy(req, res, url);
      return;
    }

    if (pathname.startsWith("/api/")) {
      await proxyBackendApi(req, res, url);
      return;
    }

    const directPath = resolveDistPath(pathname);
    if (directPath && await fileExists(directPath)) {
      await streamFile(res, directPath);
      return;
    }

    const fallbackFile = getFallbackFile(pathname);
    if (fallbackFile) {
      await streamFile(res, path.join(distDir, fallbackFile));
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("[railway-server] request failed", error);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Signal Railway server listening on ${port}`);
});
