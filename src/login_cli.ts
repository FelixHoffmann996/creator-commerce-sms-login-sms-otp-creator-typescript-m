import { openCreatorSession, requestCreatorCode } from "./creator_access";

const [command, phone, creatorId, code] = process.argv.slice(2);

if (command === "request" && phone && creatorId) {
  console.log(await requestCreatorCode({ phone, creatorId }));
} else if (command === "verify" && phone && creatorId && code) {
  console.log(await openCreatorSession({ phone, creatorId, code }));
} else {
  console.error("usage: npm run demo -- request <phone> <creator-id> | verify <phone> <creator-id> <code>");
  process.exitCode = 2;
}
