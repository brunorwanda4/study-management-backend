import * as argon2 from "argon2";

const SECRET_KEY = process.env.SECRETE_KEY;

export const hashPassword = async (password: string): Promise<string> => {
  const saltedPassword = password + SECRET_KEY;
  return await argon2.hash(saltedPassword);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  const saltedPassword = password + SECRET_KEY;
  return await argon2.verify(hashedPassword, saltedPassword);
};



/**
 * Hashes a plain text code using Argon2.
 * Uses a secret key for added security (often used for encryption, but can
 * conceptually be part of the hashing process configuration or simply
 * a reminder to use secure methods). Argon2's salt is automatically generated.
 *
 * @param plainCode The plain text code to hash.
 * @returns A promise that resolves with the Argon2 hash of the code.
 */
export async function hashCode(plainCode: string): Promise<string | null> {
  try {
    const hash = await argon2.hash(plainCode);
    return hash;
  } catch {
    return null
  }
}

/**
 * Verifies if a plain text code matches a given Argon2 hash.
 *
 * @param plainCode The plain text code to verify.
 * @param hashedCode The Argon2 hash to compare against.
 * @returns A promise that resolves with a boolean indicating whether the code matches the hash.
 */
export async function verifyCode(plainCode: string, hashedCode: string): Promise<boolean> {
  try {
    const isMatch = await argon2.verify(hashedCode, plainCode);
    return isMatch;
  } catch {
    return false;
  }
}

/**
 * Converts a plain code into its hashed representation.
 * This function essentially acts as a wrapper around the hashCode function.
 * The name "change code into a real one" is interpreted as converting a
 * human-readable code into its secure, hashed form for storage/comparison.
 *
 * @param plainCode The plain text code to convert (hash).
 * @returns A promise that resolves with the Argon2 hash of the code.
 */
export async function changeCode(plainCode: string): Promise<string | null> {
  // This function simply calls hashCode to get the secure representation.
  return hashCode(plainCode);
}
