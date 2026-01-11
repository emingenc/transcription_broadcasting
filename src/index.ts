import { config } from "./config/env";
import { MentraService } from "./services/MentraService";
import { sessionManager } from "./services/SessionManager";

// --- Proxy to Mentra AppServer ---
async function proxyToMentra(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mentraUrl = `http://127.0.0.1:${config.internalPort}${url.pathname}${url.search}`;
  
  try {
    const proxyReq = new Request(mentraUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });
    
    return await fetch(proxyReq);
  } catch (e: any) {
    return new Response(`Server error: ${e.message}`, { status: 502 });
  }
}

// --- Health Check ---
function handleHealthCheck(): Response {
  return Response.json({ 
    ok: true, 
    connectedGlasses: sessionManager.getConnectedCount() 
  });
}

// --- Request Router ---
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  
  // Health check (no auth)
  if (url.pathname === "/health") {
    return handleHealthCheck();
  }
  
  // Everything else goes to Mentra AppServer (webview, auth, broadcast API)
  return proxyToMentra(req);
}

// --- Start ---
async function main() {
  console.log("🚀 Mentra Cast starting...");

  // Start Mentra AppServer on internal port
  const mentraApp = new MentraService();
  await mentraApp.start();

  // Start Bun HTTP server on main port (proxy to AppServer)
  Bun.serve({
    port: config.port,
    hostname: "0.0.0.0",
    fetch: handleRequest,
  });

  console.log(`✨ Server ready on http://0.0.0.0:${config.port}`);
}

main().catch(console.error);

