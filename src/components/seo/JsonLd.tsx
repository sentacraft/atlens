/**
 * Server component that emits a schema.org JSON-LD block as a `<script
 * type="application/ld+json">` tag. Encapsulates two concerns the call site
 * shouldn't have to know about:
 *
 * 1. `dangerouslySetInnerHTML` is required because React entity-escapes text
 *    children, which would break the JSON when rendered inside script-data
 *    content model (browser doesn't decode entities there).
 *
 * 2. Defensive escape of `<` to `<` (valid JSON, same parsed value)
 *    prevents a `</script>` substring inside any JSON string value from
 *    prematurely closing the script tag. Browsers tokenize raw bytes when
 *    parsing script-data content — they don't care that the sequence sits
 *    inside a JSON string literal.
 *
 * Both call sites (SiteJsonLd, lens detail Product schema) go through this
 * component so the escape stays consistent.
 */
export default function JsonLd({ data }: { data: object }) {
  const safe = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
