// @ts-check
import { defineConfig } from "astro/config";
import siteConfig from "./src/data/site.config.json" with { type: "json" };

export default defineConfig({
  site: `https://${siteConfig.domain}`,
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
});
