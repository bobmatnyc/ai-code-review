import { NextResponse } from "next/server";
import { Request as NodeRequest } from "next/server";

function createMockRequest(path: string, body: unknown): NodeRequest {
  return new NodeRequest(`http://localhost/api/playground/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function dispatchToHandler(path: string, body: unknown) {
  const handlerMap: Record<string, () => Promise<{ POST: (req: Request) => Promise<Response> }>> = {
    "cover-prompt": () => import(`../../../../../playground/api/cover-prompt/route`),
    "cover-image": () => import(`../../../../../playground/api/cover-image/route`),
  };

  const loadHandler = handlerMap[path];
  if (!loadHandler) {
    throw new Error(`Unknown playground API path: ${path}`);
  }

  const { POST: handler } = await loadHandler();
  return handler(createMockRequest(path, body));
}

// Update the POST method's forwarding logic
return await dispatchToHandler(path, body);
