// Regenerates ANALYSTS_JSON in .env.local from MyInput/Logins/User and Pass.txt
// (lines formatted as "Full Name - username - password"), cross-checked against
// MyInput/Analysts/Names of Analysts.txt (the current roster) so departed
// analysts automatically lose login access even if their line is still in the
// credentials file. Writes the result back with every literal `$` escaped so
// Next.js doesn't mangle the bcrypt hashes.
import bcrypt from "bcryptjs";
import fs from "node:fs";

const CREDS_PATH = "MyInput/Logins/User and Pass.txt";
const ROSTER_PATH = "MyInput/Analysts/Names of Analysts.txt";
const ENV_PATH = ".env.local";

const rosterRaw = fs.readFileSync(ROSTER_PATH, "utf8");
const rosterNames = new Set(
  rosterRaw
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => line.split(" - ")[0].trim())
);

const raw = fs.readFileSync(CREDS_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((l) => l.trim());

const accounts = [];
for (const line of lines) {
  const [name, username, password] = line.split(" - ").map((s) => s.trim());
  if (!name || !username || !password) {
    throw new Error(`Malformed line in ${CREDS_PATH}: "${line}"`);
  }
  if (!rosterNames.has(name)) {
    console.log(`Skipping "${name}" — not on the current roster (${ROSTER_PATH}).`);
    continue;
  }
  accounts.push({ name, username, passwordHash: bcrypt.hashSync(password, 10) });
}

const credentialedNames = new Set(accounts.map((a) => a.name));
for (const name of rosterNames) {
  if (!credentialedNames.has(name)) {
    console.log(`Note: "${name}" is on the roster but has no entry in ${CREDS_PATH} yet — no login created.`);
  }
}

const json = JSON.stringify(accounts);
const escaped = json.split("$").join("\\$");
const newLine = `ANALYSTS_JSON=${escaped}`;

let env = fs.readFileSync(ENV_PATH, "utf8");
if (/^ANALYSTS_JSON=.*$/m.test(env)) {
  env = env.replace(/^ANALYSTS_JSON=.*$/m, newLine);
} else {
  env = env.trimEnd() + "\n\n" + newLine + "\n";
}
fs.writeFileSync(ENV_PATH, env);

console.log(`Wrote ${accounts.length} accounts to ${ENV_PATH}`);
