/* eslint-disable @next/next/no-img-element -- Satori (ImageResponse) ne rend que des <img> classiques, pas next/image */
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { ticketValidUntil } from "./ticket-token";

export type TicketEvent = { name: string; venue: string | null; city: string; country: string; starts_at: string };

// Couleurs de la charte (src/app/globals.css) : Satori n'accède pas aux tokens Tailwind
const BLACK = "#090a10";
const INDIGO = "#202052";
const IVORY = "#f3e9d5";
const COPPER = "#e66c3f";

export const longDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);

/** Dernier jour de validité (inclus) : la veille de la limite exclusive */
export const lastValidDay = (startsAt: string) => longDate(new Date(ticketValidUntil(startsAt).getTime() - 1));

const root = process.cwd();
const font = (file: string) => readFile(path.join(root, "src", "fonts", file));

async function assets() {
  const [title, label, body, logo] = await Promise.all([
    font("ATP-Dizzy.otf"),
    font("Anton.otf"),
    font("Pain de Mie.otf"),
    readFile(path.join(root, "public", "brand", "logo-blanc.svg")),
  ]);
  return {
    fonts: [
      { name: "Dizzy", data: title, weight: 400 as const, style: "normal" as const },
      { name: "Anton", data: label, weight: 400 as const, style: "normal" as const },
      { name: "Pain", data: body, weight: 400 as const, style: "normal" as const },
    ],
    logo: `data:image/svg+xml;base64,${logo.toString("base64")}`,
  };
}

const toBuffer = async (res: ImageResponse) => Buffer.from(await res.arrayBuffer());

/** Logo LA TEUF en PNG (les clients mail n'affichent pas le SVG), destiné à l'en-tête de l'e-mail */
export async function renderLogoPng(): Promise<Buffer> {
  const { logo } = await assets();
  // Ratio du logo : 1882 × 1841
  return toBuffer(new ImageResponse(<img src={logo} width={204} height={200} alt="" />, { width: 204, height: 200 }));
}

/** Billet à télécharger et à partager : le QR code habillé de la charte LA TEUF */
export async function renderTicketPng(opts: {
  token: string;
  ticketId: string;
  index: number;
  total: number;
  event: TicketEvent;
}): Promise<Buffer> {
  const { token, ticketId, index, total, event } = opts;
  const [{ fonts, logo }, qr] = await Promise.all([
    assets(),
    QRCode.toDataURL(token, { errorCorrectionLevel: "M", margin: 1, width: 560, color: { dark: "#000000", light: "#ffffff" } }),
  ]);
  const place = [event.venue, event.city, event.country].filter(Boolean).join(", ");

  const el = (
    <div style={{ width: "100%", height: "100%", display: "flex", background: BLACK, padding: 40 }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: INDIGO, borderRadius: 64, padding: 56 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 38, letterSpacing: 4, color: COPPER, textTransform: "uppercase" }}>
            {`Billet ${index} / ${total}`}
          </div>
          <img src={logo} width={122} height={120} alt="" />
        </div>

        <div style={{ display: "flex", marginTop: 40, fontFamily: "Dizzy", fontSize: 84, lineHeight: 1.05, color: IVORY }}>{event.name}</div>
        <div style={{ display: "flex", marginTop: 24, fontFamily: "Anton", fontSize: 44, letterSpacing: 2, color: COPPER, textTransform: "uppercase" }}>
          {longDate(new Date(event.starts_at))}
        </div>
        <div style={{ display: "flex", marginTop: 8, fontFamily: "Pain", fontSize: 34, color: IVORY }}>{place}</div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", background: IVORY, borderRadius: 56, padding: 36 }}>
            <img src={qr} width={560} height={560} style={{ borderRadius: 24 }} alt="" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: "Anton", fontSize: 34, letterSpacing: 3, color: IVORY, textTransform: "uppercase" }}>
            {`Réf. ${ticketId.slice(0, 8).toUpperCase()} · usage unique`}
          </div>
          <div style={{ display: "flex", marginTop: 10, fontFamily: "Pain", fontSize: 30, color: IVORY, opacity: 0.8 }}>
            {`Valable jusqu'à la fin du ${lastValidDay(event.starts_at)}`}
          </div>
          <div style={{ display: "flex", marginTop: 18, fontFamily: "Anton", fontSize: 28, letterSpacing: 4, color: COPPER, textTransform: "uppercase" }}>
            LA TEUF ÉLECTRONIQUE
          </div>
        </div>
      </div>
    </div>
  );

  return toBuffer(new ImageResponse(el, { width: 1080, height: 1620, fonts }));
}
