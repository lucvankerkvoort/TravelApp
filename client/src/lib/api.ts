const rawBase = import.meta.env.VITE_API_BASE ?? "";
const normalizedBase = rawBase.replace(/\/$/, "");

export const API_BASE = normalizedBase;

export const apiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!normalizedBase) {
    return path;
  }
  return `${normalizedBase}${path.startsWith("/") ? path : `/${path}`}`;
};
