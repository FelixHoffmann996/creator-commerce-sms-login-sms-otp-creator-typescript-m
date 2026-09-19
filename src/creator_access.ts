import { createHash } from "node:crypto";
import { z } from "zod";
import { infrai, type OtpResult } from "./infrai_sms";

export const requestCodeBody = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  creatorId: z.string().min(1).max(80),
}).strict();

export const verifyCodeBody = requestCodeBody.extend({
  code: z.string().regex(/^\d{4,10}$/),
}).strict();

export type CreatorSession = {
  creatorId: string;
  phone: string;
  authenticated: true;
  operations: readonly ["deliver_digital_asset", "update_subscribers", "process_content"];
};

export interface OtpGateway {
  request(to: string, idempotencyKey: string): Promise<OtpResult>;
  verify(to: string, code: string, idempotencyKey: string): Promise<OtpResult>;
}

export const liveOtpGateway: OtpGateway = {
  request: (to, key) => infrai.sms.otp(to, key),
  verify: (to, code, key) => infrai.sms.verify(to, code, key),
};

function operationKey(action: "request" | "verify", creatorId: string, value: string): string {
  return createHash("sha256").update(`${action}:${creatorId}:${value}`).digest("hex");
}

export async function requestCreatorCode(input: unknown, gateway: OtpGateway = liveOtpGateway) {
  const body = requestCodeBody.parse(input);
  await gateway.request(body.phone, operationKey("request", body.creatorId, body.phone));
  return { state: "code_sent" as const, creatorId: body.creatorId, phone: body.phone };
}

export async function openCreatorSession(input: unknown, gateway: OtpGateway = liveOtpGateway): Promise<CreatorSession> {
  const body = verifyCodeBody.parse(input);
  await gateway.verify(body.phone, body.code, operationKey("verify", body.creatorId, `${body.phone}:${body.code}`));
  return {
    creatorId: body.creatorId,
    phone: body.phone,
    authenticated: true,
    operations: ["deliver_digital_asset", "update_subscribers", "process_content"],
  };
}
