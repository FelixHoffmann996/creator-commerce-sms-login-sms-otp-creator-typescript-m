import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai_sms";
import { openCreatorSession, requestCreatorCode } from "./creator_access";

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function route(request: IncomingMessage, response: ServerResponse) {
  try {
    if (request.method !== "POST") return reply(response, 405, { error: "method_not_allowed" });
    const body = await readJson(request);
    if (request.url === "/login/code") return reply(response, 202, await requestCreatorCode(body));
    if (request.url === "/login/verify") return reply(response, 200, await openCreatorSession(body));
    return reply(response, 404, { error: "route_not_found" });
  } catch (error) {
    if (error instanceof ZodError) return reply(response, 400, { error: "invalid_request", issues: error.issues });
    if (error instanceof SyntaxError) return reply(response, 400, { error: "invalid_json" });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return reply(response, status, { error: error.code, message: error.message });
    }
    console.error(error);
    return reply(response, 502, { error: "upstream_transport_error" });
  }
}

const port = Number(process.env.PORT ?? 3000);
createServer(route).listen(port, () => console.log(`creator login listening on http://localhost:${port}`));
