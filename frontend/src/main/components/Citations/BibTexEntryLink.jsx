/**
 * Renders a hyperlink to the paper an entry's `keyValuePairs` describe: the full DOI URL
 * (`https://doi.org/{doi}`) if the entry has a `doi` field, otherwise the full `url` field if
 * present. Renders nothing if neither field is present. See issue #43.
 */
export default function BibTexEntryLink({
  keyValuePairs,
  testId = "BibTexEntryLink",
}) {
  const doi = keyValuePairs?.doi;
  const url = keyValuePairs?.url;

  if (doi) {
    const href = `https://doi.org/${doi}`;
    return (
      <p className="mb-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-doi-link`}
        >
          {href}
        </a>
      </p>
    );
  }

  if (url) {
    return (
      <p className="mb-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`${testId}-url-link`}
        >
          {url}
        </a>
      </p>
    );
  }

  return null;
}
