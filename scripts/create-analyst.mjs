import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = readline.createInterface({ input: stdin, output: stdout });

const name = await rl.question("Analyst name: ");
const username = await rl.question("Analyst username: ");
const password = await rl.question("Temporary password: ");
rl.close();

const passwordHash = await bcrypt.hash(password, 12);
const entry = { name, username, passwordHash };

// Next.js expands unescaped `$` in .env files as variable references, which
// corrupts a bcrypt hash (it's full of `$`). Escape them for the .env value.
const envSafeJson = JSON.stringify(entry).replace(/\$/g, "\\$");

console.log("\nAnalyst record:\n");
console.log(JSON.stringify(entry, null, 2));
console.log(
  "\nANALYSTS_JSON must be a JSON array of these objects. Add this analyst by" +
    " pasting the escaped line below into your .env file (Railway variables" +
    " do NOT need escaping — only .env files do):\n"
);
console.log(`ANALYSTS_JSON=[${envSafeJson}]`);
console.log(
  "\nIf ANALYSTS_JSON already has other analysts, add this object inside the" +
    " existing array instead of replacing it, and escape every `$` the same way."
);
