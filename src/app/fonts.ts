import localFont from "next/font/local";

// Les 4 polices de la charte (licences web à vérifier avant la mise en production)
const tropic = localFont({ src: "../fonts/TropicGround-Regular.otf", variable: "--font-tropic", display: "swap" });
const dizzy = localFont({ src: "../fonts/ATP-Dizzy.otf", variable: "--font-dizzy", display: "swap" });
const anton = localFont({ src: "../fonts/Anton.otf", variable: "--font-anton", display: "swap" });
const pain = localFont({ src: "../fonts/Pain de Mie.otf", variable: "--font-pain", display: "swap" });

/** Variables CSS des polices, à poser sur <html> */
export const fontVariables = `${tropic.variable} ${dizzy.variable} ${anton.variable} ${pain.variable}`;
