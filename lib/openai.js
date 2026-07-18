const OPENAI_IMAGE_EDIT_URL = "https://api.openai.com/v1/images/edits";

export async function editImage({ buffer, mimeType, filename, prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
  form.append("prompt", prompt);
  form.append("image", new Blob([buffer], { type: mimeType }), filename);
  form.append("size", "1024x1024");
  form.append("quality", "medium");
  form.append("input_fidelity", "high");
  form.append("output_format", "png");

  const response = await fetch(OPENAI_IMAGE_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(55_000),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${response.status})`;
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  const base64 = payload?.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI returned no image data");
  return Buffer.from(base64, "base64");
}
