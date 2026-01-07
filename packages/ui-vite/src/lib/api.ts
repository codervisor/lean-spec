import { getBackend, APIError } from "./backend-adapter";

export const api = getBackend();

export { APIError };