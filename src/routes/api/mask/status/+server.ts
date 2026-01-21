import type { RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const DATA_SERVER_URL = env.DATA_SERVER_URL || "http://localhost:8005";

export const GET: RequestHandler = async () => {
	try {
		const response = await fetch(`${DATA_SERVER_URL}/sam/status`);
		
		if (!response.ok) {
			return new Response(
				JSON.stringify({ error: `Backend error: ${response.statusText}` }),
				{ status: response.status, headers: { "Content-Type": "application/json" } }
			);
		}

		const data = await response.json();
		
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		console.error("Error checking SAM status:", error);
		return new Response(
			JSON.stringify({ 
				error: "Failed to connect to SAM backend",
				message: error instanceof Error ? error.message : String(error)
			}),
			{ status: 503, headers: { "Content-Type": "application/json" } }
		);
	}
};

