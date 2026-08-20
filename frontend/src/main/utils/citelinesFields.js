/**
 * Utilities for the app's `CITELINES_`-prefixed BibTeX fields (e.g. `CITELINES_relevance`,
 * `CITELINES_position`, `CITELINES_references`, `CITELINES_citations`): stripping them out of
 * raw BibTeX text before it's shown for editing, and re-injecting them before it's sent back to
 * the backend. See issue #19.
 *
 * This is a small, purpose-built brace/quote-aware field splitter — not a full BibTeX grammar —
 * since the only thing it needs to do correctly is identify top-level `name = value` fields
 * inside a `@type{citeKey, ...}` entry (including when a value itself contains nested braces or
 * commas) without needing to understand any bibliographic semantics. The backend (JBibTeX) is
 * still the source of truth for actual BibTeX validity.
 */

export const RELEVANCE_OPTIONS = [
  "High",
  "Medium",
  "Low",
  "None",
  "Unreviewed",
];
export const DEFAULT_RELEVANCE = "Unreviewed";

const CITELINES_PREFIX = "citelines_";
// Exported so other code that reads relevance straight off entry.keyValuePairs (rather than
// parsing raw BibTeX text) can key on the same lowercase name the backend actually persists it
// under — BibTexConverterService.toBibTexEntry lowercases every field name when it parses
// pasted/edited BibTeX text, so "CITELINES_relevance" as written in source text always ends up
// stored as "citelines_relevance".
export const RELEVANCE_FIELD_NAME = `${CITELINES_PREFIX}relevance`;

/**
 * Splits `text` on top-level occurrences of `splitChar` — i.e. not inside a `{...}` (which may
 * itself be nested) or a `"..."` (which may itself contain nested `{...}`, per BibTeX quoting
 * rules).
 * @param {string} text
 * @param {string} splitChar - a single character to split on
 * @returns {string[]}
 */
function splitTopLevel(text, splitChar) {
  const stack = [];
  const parts = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const top = stack[stack.length - 1];

    if (top === "quote") {
      if (ch === "{") {
        stack.push("brace");
      } else if (ch === '"') {
        stack.pop();
      }
      continue;
    }

    if (top === "brace") {
      if (ch === "{") {
        stack.push("brace");
      } else if (ch === "}") {
        stack.pop();
      }
      continue;
    }

    if (ch === "{") {
      stack.push("brace");
    } else if (ch === '"') {
      stack.push("quote");
    } else if (ch === splitChar) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/**
 * Finds each `@type{...}` entry in `text` (there may be more than one), returning the character
 * span of its body — the citeKey and fields, i.e. everything between the outer `{`/`}`.
 * @param {string} text
 * @returns {{bodyStart: number, bodyEnd: number, headerEnd: number}[]}
 */
function findEntryBodySpans(text) {
  const spans = [];
  const stack = [];
  let bodyStart = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // Quotes never delimit anything at this level: entries are always brace-delimited, and a
    // quote nested inside the entry's outer brace is just literal text as far as finding where
    // the entry ENDS is concerned (splitTopLevel handles quote-vs-brace nesting separately, once
    // we're splitting an already-isolated entry body into individual fields).
    if (stack.length > 0) {
      if (ch === "{") {
        stack.push("brace");
      } else if (ch === "}") {
        stack.pop();
        if (stack.length === 0) {
          spans.push({ bodyStart, bodyEnd: i });
          bodyStart = -1;
        }
      }
      continue;
    }

    if (ch === "@") {
      const openBrace = text.indexOf("{", i);
      if (openBrace === -1) break;
      stack.push("brace");
      bodyStart = openBrace + 1;
      i = openBrace;
    }
  }
  return spans;
}

/** Splits an entry body into its citeKey portion and its raw (untrimmed) field chunks. */
function splitEntryBody(body) {
  const parts = splitTopLevel(body, ",");
  const [citeKeyPart, ...rest] = parts;
  // A trailing comma after the last field produces one empty trailing chunk; drop it.
  const fieldChunks = rest.filter((chunk) => chunk.trim().length > 0);
  return { citeKeyPart, fieldChunks };
}

/** Parses one raw field chunk ("  name = {value}") into {name, value}, or null if malformed. */
function parseFieldChunk(chunk) {
  const eq = chunk.indexOf("=");
  if (eq === -1) {
    return null;
  }
  const name = chunk.slice(0, eq).trim().toLowerCase();
  let value = chunk.slice(eq + 1).trim();
  if (
    (value.startsWith("{") && value.endsWith("}")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  }
  return { name, value };
}

function normalizeRelevance(rawValue) {
  const match = RELEVANCE_OPTIONS.find(
    (option) => option.toLowerCase() === rawValue.trim().toLowerCase(),
  );
  return match ?? DEFAULT_RELEVANCE;
}

/**
 * Strips every `CITELINES_`-prefixed field out of the first BibTeX entry found in `rawBibtex`,
 * returning the cleaned-up text (safe to show for editing), the entry's relevance (defaulting to
 * "Unreviewed" if no `CITELINES_relevance` field was present or its value wasn't recognized), and
 * a map of any other `CITELINES_*` fields found (e.g. `citelines_position`), so they can be
 * restored later via {@link injectCitelinesFields}.
 *
 * @param {string} rawBibtex
 * @returns {{strippedBibtex: string, relevance: string, preservedFields: Record<string,string>}}
 */
export function extractCitelinesFields(rawBibtex) {
  if (!rawBibtex) {
    return {
      strippedBibtex: rawBibtex ?? "",
      relevance: DEFAULT_RELEVANCE,
      preservedFields: {},
    };
  }

  const spans = findEntryBodySpans(rawBibtex);
  if (spans.length === 0) {
    return {
      strippedBibtex: rawBibtex,
      relevance: DEFAULT_RELEVANCE,
      preservedFields: {},
    };
  }

  const { bodyStart, bodyEnd } = spans[0];
  const body = rawBibtex.slice(bodyStart, bodyEnd);
  const { citeKeyPart, fieldChunks } = splitEntryBody(body);

  let relevance = DEFAULT_RELEVANCE;
  const preservedFields = {};
  const keptChunks = [];
  let foundCitelinesField = false;

  for (const chunk of fieldChunks) {
    const field = parseFieldChunk(chunk);
    if (!field) {
      keptChunks.push(chunk.trim());
      continue;
    }
    if (field.name === RELEVANCE_FIELD_NAME) {
      relevance = normalizeRelevance(field.value);
      foundCitelinesField = true;
    } else if (field.name.startsWith(CITELINES_PREFIX)) {
      preservedFields[field.name] = field.value;
      foundCitelinesField = true;
    } else {
      keptChunks.push(chunk.trim());
    }
  }

  // Nothing to strip: return the original text untouched rather than a reformatted
  // (but equivalent) rebuild, so editing an entry that predates this feature causes no diff.
  if (!foundCitelinesField) {
    return { strippedBibtex: rawBibtex, relevance, preservedFields };
  }

  const rebuiltBody = [
    citeKeyPart.trim(),
    ...keptChunks.map((c) => `\n  ${c}`),
  ].join(",");
  const strippedBibtex =
    rawBibtex.slice(0, bodyStart) +
    rebuiltBody +
    ",\n" +
    rawBibtex.slice(bodyEnd);

  return { strippedBibtex, relevance, preservedFields };
}

/**
 * Injects a `CITELINES_relevance` field (plus any other preserved `CITELINES_*` fields) into
 * every BibTeX entry found in `rawBibtex`, ready to send to the backend. Any `CITELINES_*` field
 * already present in `rawBibtex` is dropped first, so this is safe to call even if the user
 * hand-edited one in.
 *
 * @param {string} rawBibtex
 * @param {string} relevance - one of {@link RELEVANCE_OPTIONS}
 * @param {Record<string,string>} [preservedFields] - other `citelines_*` fields to restore verbatim
 * @returns {string}
 */
export function injectCitelinesFields(
  rawBibtex,
  relevance,
  preservedFields = {},
) {
  if (!rawBibtex) {
    return rawBibtex ?? "";
  }

  const spans = findEntryBodySpans(rawBibtex);
  if (spans.length === 0) {
    return rawBibtex;
  }

  const extraFields = { [RELEVANCE_FIELD_NAME]: relevance, ...preservedFields };
  const extraChunks = Object.entries(extraFields).map(
    ([name, value]) =>
      `\n  CITELINES_${name.slice(CITELINES_PREFIX.length)} = {${value}}`,
  );

  let result = "";
  let cursor = 0;
  for (const { bodyStart, bodyEnd } of spans) {
    const body = rawBibtex.slice(bodyStart, bodyEnd);
    const { citeKeyPart, fieldChunks } = splitEntryBody(body);
    const keptChunks = fieldChunks
      .filter((chunk) => {
        const field = parseFieldChunk(chunk);
        return !(field && field.name.startsWith(CITELINES_PREFIX));
      })
      .map((chunk) => chunk.trim());

    const rebuiltBody = [
      citeKeyPart.trim(),
      ...keptChunks.map((c) => `\n  ${c}`),
      ...extraChunks,
    ].join(",");

    result += rawBibtex.slice(cursor, bodyStart) + rebuiltBody + ",\n";
    cursor = bodyEnd;
  }
  result += rawBibtex.slice(cursor);

  return result;
}
