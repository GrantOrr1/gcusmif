function renderBlock(block: string, key: number) {
  const lines = block.split("\n");
  if (lines[0].startsWith("# ")) {
    const heading = lines[0].slice(2).trim();
    const rest = lines.slice(1).join("\n").trim();
    return (
      <section key={key}>
        <h2 className="text-xl font-semibold text-foreground">{heading}</h2>
        {rest && <p className="mt-2 text-sm leading-relaxed text-muted">{rest}</p>}
      </section>
    );
  }
  return (
    <p key={key} className="text-sm leading-relaxed text-muted">
      {block}
    </p>
  );
}

export default function PageContent({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).filter(Boolean);
  return <div className="space-y-6">{blocks.map((block, i) => renderBlock(block, i))}</div>;
}
