// Generate app/public/og-image.png (1200x630) from the brand icon + wordmark.
// Run: node scripts/gen-og.mjs
import fs from "fs";
import { Resvg } from "@resvg/resvg-js";

const logo = fs.readFileSync("app/public/obscura-logo.svg", "utf8");
// extract the icon <g> group (everything from first <g> to last </g>), drop the wordmark <text>
let icon = logo.slice(logo.indexOf("<g>"), logo.lastIndexOf("</g>") + 4);
icon = icon.replace(/class="st1"/g, 'fill="#FFFFFF"'); // icon native bbox ~ x[15,83] y[11,89]

// place icon at screen x[150,355] y[205,440]; scale ~3.0, translate accordingly
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="22%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0B0614"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#8B5CF6"/>
  <g transform="translate(105,206) scale(3.0)">${icon}</g>
  <text x="410" y="300" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="128" font-weight="700" letter-spacing="-4" fill="#FFFFFF">Obscura</text>
  <text x="414" y="368" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="42" font-weight="500" fill="#D8CFE8">Confidential Agentic Credit</text>
  <text x="414" y="424" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="29" font-weight="600" letter-spacing="0.5" fill="#8B5CF6">Zama FHE · ERC-7984 · Ethereum Sepolia</text>
</svg>`;

const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 }, font: { loadSystemFonts: true } });
const png = resvg.render().asPng();
fs.writeFileSync("app/public/og-image.png", png);
console.log("wrote app/public/og-image.png", png.length, "bytes");
