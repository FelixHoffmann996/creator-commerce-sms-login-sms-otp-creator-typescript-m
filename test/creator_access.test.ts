import assert from "node:assert/strict";
import test from "node:test";
import { openCreatorSession, type OtpGateway } from "../src/creator_access";

test("a verified creator receives the three commerce operations", async () => {
  const calls: Array<{ to: string; code: string; key: string }> = [];
  const gateway: OtpGateway = {
    request: async () => ({}),
    verify: async (to, code, key) => {
      calls.push({ to, code, key });
      return {};
    },
  };

  const session = await openCreatorSession(
    { phone: "+14155550123", creatorId: "creator-42", code: "814209" },
    gateway,
  );

  assert.equal(session.authenticated, true);
  assert.deepEqual(session.operations, [
    "deliver_digital_asset",
    "update_subscribers",
    "process_content",
  ]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.to, "+14155550123");
  assert.equal(calls[0]?.code, "814209");
  assert.match(calls[0]?.key ?? "", /^[a-f0-9]{64}$/);
});

test("an invalid phone is rejected before an OTP call", async () => {
  let called = false;
  const gateway: OtpGateway = {
    request: async () => ({}),
    verify: async () => {
      called = true;
      return {};
    },
  };

  await assert.rejects(
    openCreatorSession({ phone: "4155550123", creatorId: "creator-42", code: "814209" }, gateway),
  );
  assert.equal(called, false);
});
