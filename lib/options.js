export const PRESENTATION_MODES = Object.freeze([
  "auto",
  "white studio",
  "premium",
  "lifestyle",
  "model",
]);

export const MODEL_TYPES = Object.freeze([
  "man",
  "woman",
  "child",
  "teen",
  "senior woman",
  "senior man",
  "plus-size woman",
  "plus-size man",
]);

const MODE_DIRECTIONS = Object.freeze({
  auto:
    "Identify the item category and choose the most suitable truthful marketplace presentation. Prefer a clean studio product shot unless a simple lifestyle context materially helps buyers understand the item.",
  "white studio":
    "Place the item alone in a bright seamless white ecommerce studio with a subtle, physically realistic contact shadow.",
  premium:
    "Place the item in an understated premium catalog setting with neutral charcoal and warm gray tones, controlled softbox lighting, and no distracting props.",
  lifestyle:
    "Place the item in a tasteful, realistic everyday setting appropriate to the item, while keeping the item unobstructed and visually dominant.",
  model:
    "Show the item naturally worn or held by a photorealistic {modelType}. Use a simple catalog pose, realistic anatomy, natural fit and folds, and an uncluttered studio setting.",
});

const DEFAULT_RULES = Object.freeze([
  "Preserve the exact item identity, silhouette, proportions, construction, and visible condition.",
  "Preserve every visible color, logo, print, texture, stitch, label, scratch, stain, crease, scuff, and sign of wear.",
  "Do not repair, beautify, redesign, recolor, remove defects, invent hidden details, or add accessories to the item.",
  "Change only the background, lighting around the item, and—when requested—the person presenting it.",
]);

export function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeChoice(value) {
  return String(one(value) ?? "").trim().toLowerCase();
}

export function parsePreservationRules(value) {
  const raw = one(value);
  if (!raw) return [];

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return cleanRules(parsed);
    } catch {
      return cleanRules(raw.split(/[\n,]+/));
    }
  }

  return [];
}

function cleanRules(rules) {
  return rules
    .map((rule) => String(rule).trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((rule) => rule.slice(0, 300));
}

export function validateOptions(fields) {
  const presentationMode = normalizeChoice(fields.presentationMode);
  const modelType = normalizeChoice(fields.modelType);

  if (!PRESENTATION_MODES.includes(presentationMode)) {
    throw new ClientError(
      `presentationMode must be one of: ${PRESENTATION_MODES.join(", ")}`
    );
  }

  if (!MODEL_TYPES.includes(modelType)) {
    throw new ClientError(`modelType must be one of: ${MODEL_TYPES.join(", ")}`);
  }

  return {
    presentationMode,
    modelType,
    preservationRules: parsePreservationRules(fields.preservationRules),
  };
}

export function buildPrompt({ presentationMode, modelType, preservationRules }) {
  const direction = MODE_DIRECTIONS[presentationMode].replace(
    "{modelType}",
    modelType
  );
  const rules = [...DEFAULT_RULES, ...preservationRules];

  return [
    "Create one truthful marketplace listing photo by editing the supplied photo.",
    direction,
    "The supplied image is the sole source of truth for the item.",
    "Preservation requirements:",
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    "Do not add text, watermarks, borders, price tags, duplicate items, or marketplace branding.",
    "Return a polished square product photograph. Accuracy is more important than perfection.",
  ].join("\n");
}

export class ClientError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "ClientError";
    this.statusCode = statusCode;
  }
}
