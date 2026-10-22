// Titre révélé mot par mot ; chaque ligne est insécable pour que le retour à la ligne
// soit identique dans toutes les langues. Le délai suit l'intro portail (--intro-delay).
export function RevealTitle({ lines, accent }: { lines: string[]; accent?: string }) {
  const accentWords = new Set(accent?.split(" "));
  let index = 0;
  return (
    <>
      {lines.map((line, l) => (
        <span key={l} className="block lg:whitespace-nowrap">
          {line.split(" ").map((word, w, words) => (
            <span key={w} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
              <span
                className={`reveal-word inline-block ${accentWords.has(word) ? "accent-word" : ""}`}
                style={{ "--i": index++ } as React.CSSProperties}
              >
                {word}
              </span>
              {w < words.length - 1 ? "\u00a0" : ""}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
