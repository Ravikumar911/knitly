import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

const port = Number(process.env.MOCK_OLLAMA_PORT || 3302);
const model = "mock-swiggy";
const reply =
  "Local mock assistant: your recent spending is mostly Swiggy food delivery right now.";

const server = createServer(async (req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "127.0.0.1"}`,
  );

  if (req.method === "GET" && url.pathname === "/healthz") {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/v1/models") {
    return sendJson(res, 200, {
      object: "list",
      data: [
        { id: model, object: "model", created: 0, owned_by: "slashcash-e2e" },
      ],
    });
  }

  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    const body = await readJson(req);
    const isStream = body?.stream === true;

    if (!isStream) {
      return sendJson(res, 200, {
        id: "mock-chat-completion",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: reply,
            },
          },
        ],
      });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const chunks = reply.split(" ");
    for (const [index, token] of chunks.entries()) {
      writeSseChunk(res, {
        id: "mock-chat-completion",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: {
              ...(index === 0 ? { role: "assistant" } : {}),
              content: `${token}${index < chunks.length - 1 ? " " : ""}`,
            },
            finish_reason: null,
          },
        ],
      });
      await sleep(20);
    }

    writeSseChunk(res, {
      id: "mock-chat-completion",
      object: "chat.completion.chunk",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    });

    res.end("data: [DONE]\n\n");
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`mock-ollama listening on ${port}\n`);
});

process.once("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.once("SIGINT", () => {
  server.close(() => process.exit(0));
});

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
    string,
    unknown
  >;
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function writeSseChunk(res: ServerResponse, body: unknown) {
  res.write(`data: ${JSON.stringify(body)}\n\n`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
