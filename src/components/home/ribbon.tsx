/*
 * Ruban des registres musicaux : chaque mot et chaque étoile s'illumine de l'intérieur,
 * à son propre rythme, comme des étoiles qui scintillent. La lumière reste dans les lettres
 * (dégradé découpé par le texte), sans halo autour des contours.
 */
const genres = ["Afro house", "Deep house", "Tech house", "Afro tech", "Disco house"];
const tokens = [...genres, ...genres.slice(0, 4)];

// Pseudo-hasard déterministe : mêmes valeurs côté serveur et navigateur
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
const timing = (i: number) => ({
  "--tw-dur": `${(2.4 + rand(i) * 3.2).toFixed(2)}s`,
  "--tw-delay": `${(-rand(i + 50) * 6).toFixed(2)}s`,
  "--tw-x": `${Math.round(20 + rand(i + 100) * 60)}%`,
});

export function Ribbon({ className }: { className: string }) {
  return (
    <div aria-hidden className={`overflow-hidden border-y border-cosmic-black bg-ultraviolet ${className}`} style={{ rotate: "-5deg" }}>
      <p className="flex items-center gap-[0.45em] whitespace-pre font-label text-[22px] uppercase leading-none tracking-[0.04em] text-violet-pale lg:text-[34px]">
        {tokens.map((word, i) => (
          <span key={i} className="flex items-center gap-[0.45em]">
            <span className="twinkle-word" data-text={word} style={timing(i) as React.CSSProperties}>
              {word}
            </span>
            {i < tokens.length - 1 && (
              <span className="twinkle-star" style={timing(i + 20) as React.CSSProperties}>
                ✦
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
