import bcrypt from "bcryptjs";

export type Analyst = {
  email: string;
  passwordHash: string;
  name: string;
};

let cachedAnalysts: Analyst[] | null = null;

function loadAnalysts(): Analyst[] {
  if (cachedAnalysts) return cachedAnalysts;

  const raw = process.env.ANALYSTS_JSON;
  if (!raw) {
    cachedAnalysts = [];
    return cachedAnalysts;
  }

  try {
    const parsed = JSON.parse(raw) as Analyst[];
    cachedAnalysts = parsed;
  } catch {
    console.error("ANALYSTS_JSON is not valid JSON");
    cachedAnalysts = [];
  }

  return cachedAnalysts;
}

export function findAnalystByEmail(email: string): Analyst | undefined {
  return loadAnalysts().find(
    (a) => a.email.toLowerCase() === email.toLowerCase()
  );
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
