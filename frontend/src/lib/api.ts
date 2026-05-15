import type { ImageRecord } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchImages(): Promise<ImageRecord[]> {
  const response = await fetch(`${API_BASE}/images`);
  return parseResponse<ImageRecord[]>(response);
}

export async function generateImage(
  prompt: string,
  candidateLabels: string[],
): Promise<ImageRecord> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, candidate_labels: candidateLabels }),
  });

  return parseResponse<ImageRecord>(response);
}

export async function uploadImage(file: File, candidateLabels: string[]): Promise<ImageRecord> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("candidate_labels", candidateLabels.join(","));

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  return parseResponse<ImageRecord>(response);
}
