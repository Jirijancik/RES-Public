import "server-only";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

export async function serverFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}
