import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/kit/vite";
import dotenv from "dotenv";

dotenv.config({ path: "./.env.local" });
dotenv.config({ path: "./.env" });

process.env.PUBLIC_VERSION ??= process.env.npm_package_version;

// Clean up APP_BASE to ensure it's valid for SvelteKit
const APP_BASE = process.env.APP_BASE || "";
const cleanBase = APP_BASE.trim().replace(/\/$/, "");
const validBase = cleanBase === "" || cleanBase.startsWith("/") ? cleanBase : "";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),

		paths: {
			base: validBase,
		},
		csrf: {
			// handled in hooks.server.ts, because we can have multiple valid origins
			checkOrigin: false,
		},
	},
};

export default config;
