// Étiquettes énergie officielles (EPREL) téléchargées par scripts/fetch-labels.py dans public/labels/.
// Lu au build : un modèle sans étiquette s'affiche simplement sans image.
import fs from "node:fs";

let files: Set<string>;
try {
  files = new Set(fs.readdirSync("public/labels"));
} catch {
  files = new Set();
}

export const hasLabel = (eprel: string) => files.has(`${eprel}.webp`) && files.has(`${eprel}-s.webp`);
export const labelUrl = (eprel: string, small = false) => `/labels/${eprel}${small ? "-s" : ""}.webp`;
// Ratio réel des étiquettes réfrigérateur (96 × 192 mm).
export const LABEL_RATIO = 2;
