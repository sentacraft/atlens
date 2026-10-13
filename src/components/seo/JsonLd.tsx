// `<` is escaped so a `</script>` inside a JSON string cannot close the tag.
export default function JsonLd({ data }: { data: object }) {
  const safe = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
