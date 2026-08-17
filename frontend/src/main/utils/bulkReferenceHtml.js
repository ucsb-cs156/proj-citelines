// The full ACM DL page (with "Show All References" expanded) can be several MB of markup that's
// almost entirely irrelevant to reference parsing (nav, scripts, styles, etc.) — large enough to
// trip a 413 (payload too large) on the launch-job request. The actual expanded reference list
// lives inside <div id="bibliography-collapsible-text">, itself nested inside
// <section id="bibliography"> alongside other chrome (e.g. the "Show All References" toggle UI).
// Trim the pasted HTML down client-side to just the <div class="biblioentry"> elements
// themselves — the only thing the backend actually reads — dropping everything else in between
// (toggle buttons, loading indicators, etc.), and re-wrap them in a synthetic
// <section id="bibliography"> so the backend's existing selector keeps working unmodified.
export function extractBibliographySection(rawHtml) {
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");
  const root =
    doc.querySelector("#bibliography-collapsible-text") ??
    doc.querySelector("section#bibliography");
  if (!root) {
    return rawHtml;
  }
  const entries = root.querySelectorAll("div.biblioentry");
  const innerHtml =
    entries.length > 0
      ? Array.from(entries)
          .map((entry) => entry.outerHTML)
          .join("")
      : root.outerHTML;
  return `<section id="bibliography">${innerHtml}</section>`;
}
