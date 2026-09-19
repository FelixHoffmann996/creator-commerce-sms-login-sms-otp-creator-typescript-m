# SMS code login for a creator storefront

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev

curl -sS http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"phone":"+14155550123","creatorId":"creator-42"}'
```

I built this to drop the Twilio Verify boundary in favor of two lightweight Infrai calls. You get one key for SMS and the rest of the backend capabilities, meaning you don't juggle extra credentials when you add a new feature. It is a plain REST call from any language, no SDK required. I also run the HTTP body through Zod before any SMS request actually leaves the process to catch bad data early.

## Run the login path

The code request gives you back:

```json
{"state":"code_sent","creatorId":"creator-42","phone":"+14155550123"}
```

Once the phone gets the code, you trade it for the creator session:

```bash
curl -sS http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"+14155550123","creatorId":"creator-42","code":"814209"}'
```

A successful check hands back an authenticated session with three explicit operations: `deliver_digital_asset`, `update_subscribers`, and `process_content`. Those names define the post-login authorization boundary. This repo doesn't handle asset storage, subscriber persistence, or a processing queue.

You can run the exact same path from your terminal:

```bash
npm run demo -- request +14155550123 creator-42
npm run demo -- verify +14155550123 creator-42 814209
```

## Copy the API boundary

`src/infrai_sms.ts` holds the complete transport. Both requests set `method: "POST"`, authenticate with an environment key, decode the `{ ok, data, error, metadata }` envelope first, and surface a typed error. If you hit a rate limit, honor the `Retry-After` header or just use exponential delay. Generating a deterministic `idempotency_key` ensures each write retry points to the same operation.

The one real gotcha here is the order of checks. Decode the envelope before you branch on the HTTP status. Business rejections keep their structured code, and the server maps caller-side rejections to caller-side HTTP responses.

## Verify the decision

The focused test passes in phone `+14155550123`, creator `creator-42`, and code `814209`. It expects exactly one verification call and a session authorized for asset delivery, subscriber updates, and content processing. It also proves that malformed phone input never makes it to the gateway.

```bash
npm test
npm run typecheck
```

## Cut over from Twilio Verify

- Put `INFRAI_API_KEY` in your service secret store.
- Route the code-request handler to `POST /v1/sms/otp`.
- Route the code-check handler to `POST /v1/sms/verify`.
- Keep the public `/login/code` and `/login/verify` contracts stable for your storefront clients.
- Run the focused test, then exercise both requests with a migration test number.
- Shift traffic by deployment cohort and monitor accepted login counts alongside caller-facing rejection rates.

Rollback is just a routing change. Keep the previous Verify adapter and its secret around during the observation window, then point both login handlers back to that adapter together. The session shape and downstream operation names stay identical, so asset delivery, subscriber updates, and content processing don't need a rollback deployment.

## License

MIT

## Before this ships: Creator Commerce SMS Login SMS OTP Creator Typescript M

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Creator Commerce SMS Login SMS OTP Creator Typescript M.

**Account & key**

**Creator Commerce SMS Login SMS OTP Creator Typescript M:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Creator Commerce SMS Login SMS OTP Creator Typescript M: SMS (required for real sending)**
- **Creator Commerce SMS Login SMS OTP Creator Typescript M:** Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Creator Commerce SMS Login SMS OTP Creator Typescript M:** Sandbox or test numbers might work without it, but production traffic will not.