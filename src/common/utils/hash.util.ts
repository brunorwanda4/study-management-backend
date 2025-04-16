import * as argon2 from "argon2"; 

const SECRET_KEY = process.env.SECRETE_KEY || "brunorwanda4";

export const hashPassword = async (password: string): Promise<string> => {
  const saltedPassword = password + SECRET_KEY;
  return await argon2.hash(saltedPassword);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  const saltedPassword = password + SECRET_KEY;
  return await argon2.verify(hashedPassword, saltedPassword);
};