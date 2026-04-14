/**
 * Client-side file upload helper.
 * Uploads a file to the server which stores it in S3, then returns the URL.
 */
export async function storagePut(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${text}`);
  }

  const data = await res.json();
  return data.url as string;
}
