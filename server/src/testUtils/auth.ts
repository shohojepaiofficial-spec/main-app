import { signAccessToken } from "../utils/authTokens";
export const testSessionId = "bcb15185-95f2-446f-98d7-461eea02f9f3";
export const signTestAccessToken = (...args: Parameters<typeof signAccessToken>) =>
  signAccessToken(args[0], args[1], args[2], { sid: testSessionId, version: 0 });
