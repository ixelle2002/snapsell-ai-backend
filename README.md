# SnapSell AI Backend

A Vercel Node.js backend that turns a seller's original product photo into a truthful marketplace presentation using OpenAI image editing. Generated PNGs are stored in Vercel Blob and returned as a durable URL.

## API

`POST /api/generate` accepts `multipart/form-data`:

| Field | Required | Values |
| --- | --- | --- |
| `image` | Yes | One JPEG, PNG, or WebP file, up to 4 MB |
| `presentationMode` | Yes | `white studio`, `premium`, `lifestyle`, `model` |
| `modelType` | Yes | `man`, `woman`, `child`, `senior`, `plus-size` |
| `preservationRules` | No | JSON array or comma/newline-separated text |

Successful response:

```json
{ "resultUrl": "https://...public.blob.vercel-storage.com/generated/...png" }
```

Example:

```bash
curl -X POST "https://YOUR-PROJECT.vercel.app/api/generate" \
  -H "Authorization: Bearer YOUR_APP_API_KEY" \
  -F "image=@./shirt.jpg" \
  -F "presentationMode=model" \
  -F "modelType=woman" \
  -F 'preservationRules=["Keep the small stain on the left sleeve","Keep the exact logo"]'
```

`modelType` is always accepted so clients can send one consistent payload. It only affects the generated scene when `presentationMode=model`.

## Local setup

1. Install Node.js 20 or newer and the Vercel CLI dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the secrets. Never put these values in an Expo/Snack app or commit them to Git.

3. Create a Vercel Blob store in the Vercel dashboard. Connecting it to the project creates `BLOB_READ_WRITE_TOKEN`. For local development, pull the linked project's variables with `npx vercel env pull .env.local`, or copy the token into `.env.local`.

4. Start the local server:

   ```bash
   npm run dev
   ```

5. Test at `http://localhost:3000/api/generate` using the curl example above.

Run unit tests with `npm test`.

## Deploy to Vercel

1. From this folder, link or create the Vercel project:

   ```bash
   npx vercel
   ```

2. In **Vercel → Project → Settings → Environment Variables**, add:

   - `OPENAI_API_KEY`: server-side OpenAI API key.
   - `OPENAI_IMAGE_MODEL`: optional; defaults to `gpt-image-2`.
   - `BLOB_READ_WRITE_TOKEN`: normally added when the Blob store is connected.
   - `APP_API_KEY`: a long random secret used by the app as a bearer token.
   - `ALLOWED_ORIGINS`: comma-separated web origins. Native mobile requests do not normally send an Origin header.

3. Deploy production:

   ```bash
   npm run deploy
   ```

4. Send a test request to the production URL before connecting the mobile UI.

## Important production notes

- The preservation prompt strongly instructs the model to retain wear and item details, but generative editing cannot guarantee pixel-perfect product fidelity. Always show the original beside the result and require the seller to verify it before listing.
- Do not ship a permanent `APP_API_KEY` inside a public mobile binary as the only abuse control. For production, replace it with user authentication, per-user quotas, rate limiting, and usage monitoring.
- Public Blob URLs make delivery simple. Add retention/deletion rules and a privacy policy before handling customer photos at scale.
- Vercel request-body limits apply before this function runs. The 4 MB application limit leaves headroom; resize phone photos in the client before upload.
- A 60-second function duration may require an appropriate Vercel plan. If image edits regularly exceed it, move generation to a queued job and have the app poll job status.

## Project layout

```text
api/generate.js     Vercel function and multipart upload handling
lib/http.js         CORS and app-secret authentication
lib/openai.js       OpenAI image-edit provider adapter
lib/options.js      Input validation and preservation prompt builder
test/               Unit tests
```
