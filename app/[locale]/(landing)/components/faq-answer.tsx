export function FaqAnswer({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter(Boolean);

  return (
    <div className="space-y-3 text-left">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-base leading-relaxed text-black/55 dark:text-white/55"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
