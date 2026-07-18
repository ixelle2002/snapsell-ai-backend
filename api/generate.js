import fs from "node:fs/promises";
import crypto from "node:crypto";
import formidable from "formidable";
import { put } from "@vercel/blob";
import { buildPrompt, ClientError, one, validateOptions } from "../lib/options.js";
import { isAuthorized, sendJson, setCors } from "../lib/http.js";
import { editImage } from "../lib/openai.js";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  if (!isAuthorized(req)) return sendJson(res, 401, { error: "Unauthorized" });

  try {
    requireEnvironment();
    const { fields, files } = await parseForm(req);
    const options = validateOptions(fields);
    const image = one(files.image);

    if (!image) throw new ClientError("An image file is required in the 'image' field");
    if (!ALLOWED_IMAGE_TYPES.has(image.mimetype)) {
      throw new ClientError("image must be JPEG, PNG, or WebP");
    }

    const source = await fs.readFile(image.filepath);
    const output = await editImage({
      buffer: source,
      mimeType: image.mimetype,
      filename: image.originalFilename || "upload.jpg",
      prompt: buildPrompt(options),
    });

    const pathname = `generated/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.png`;
    const blob = await put(pathname, output, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    return sendJson(res, 200, { resultUrl: blob.url });
  } catch (error) {
    const statusCode = error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 500;
    if (statusCode === 500) console.error(error);
    return sendJson(res, statusCode, {
      error: statusCode === 500 ? "Image processing failed" : error.message,
    });
  }
}

function requireEnvironment() {
  const missing = ["OPENAI_API_KEY", "BLOB_READ_WRITE_TOKEN"].filter(
    (name) => !process.env[name]
  );
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}

function parseForm(req) {
  const form = formidable({
    maxFiles: 1,
    maxFileSize: MAX_FILE_SIZE,
    allowEmptyFiles: false,
    filter: ({ mimetype }) => ALLOWED_IMAGE_TYPES.has(mimetype),
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(new ClientError(error.message || "Invalid multipart form", 400));
        return;
      }
      resolve({ fields, files });
    });
  });
}
