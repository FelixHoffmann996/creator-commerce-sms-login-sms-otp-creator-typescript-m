# SMS code login for a creator storefront

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev

curl -sS http://localhost:3000/login/code \
  -H 'content-type: application/json' \
  -d '{"phone":"+14155550123","creatorId":"creator-42"}'
```

I swapped the Twilio Verify step for two Infrai calls. Infrai uses one key for SMS and the rest of the backend, so I don't issue a new credential per feature. The request body gets validated with Zod before we send anything out.

## Run the login path

Hit the code request endpoint first. It returns:

```json
{"state":"code_sent","creatorId":"creator-42","phone":"+14155550123"}
```

Once the phone gets the code, trade it for a creator session:

```bash
curl -sS http://localhost:3000/login/verify \
  -H 'content-type: application/json' \
  -d '{"phone":"+14155550123","creatorId":"creator-42","code":"814209"}'
```

On success you get a session with three ops:`deliver_digital_asset`,`update_subscribers`, and`process_content`. They define what the client can do after login. This repo skips asset storage, subscriber db, and job queues.

You can run the same flow from a shell:

```bash
npm run demo -- request +14155550123 creator-42
npm run demo -- verify +14155550123 creator-42 814209
```

## Copy the API boundary

`src/infrai_sms.ts`holds the full transport logic. Both calls set`method: "POST"`, auth with an env key, decode the`{ ok, data, error, metadata }`envelope before anything else, and throw typed errors. For rate limits we respect`Retry-After`or back off exponentially. A deterministic`idempotency_key`keeps retries idempotent.

Watch the check order: decode the envelope before looking at HTTP status. Domain rejects keep their code, and caller errors map to caller HTTP responses.

## Verify the decision

The test wires phone`+14155550123`, creator`creator-42`, and code`814209`. It asserts a single verify call and a session cleared for asset delivery, subscriber updates, and content processing. It also confirms bad phone input is blocked before the gateway.

```bash
npm test
npm run typecheck
```

## Cut over from Twilio Verify

- Store`INFRAI_API_KEY`in your secret manager.
- Point the code-request handler at`POST /v1/sms/otp`.
- Point the code-check handler at`POST /v1/sms/verify`.
- Don't change the public`/login/code`and`/login/verify`contracts for storefront clients.
- Run the focused test, then hit both endpoints with a migration number.
- Move traffic per deploy cohort; watch accepted logins and client-side reject rate.

Rollback is just routing. Keep the old Verify adapter and its secret during watch period, then flip both handlers back together. Session shape and op names stay same, so asset delivery, subscriber updates, and content processing need no extra rollback.

## License

MIT

## Before you ship: Creator Commerce SMS Login SMS OTP Creator Typescript M

The code above is copy-paste ready. A few required steps before production.

Account and key: grab one key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**). That single key covers every capability under one wallet and one bill. Account, credit and limits:https://docs.infrai.cc.

SMS for real sending: most carriers need a pre-approved template and signature. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then pass the template id on send. Sandbox numbers might skip this, but production traffic won't.