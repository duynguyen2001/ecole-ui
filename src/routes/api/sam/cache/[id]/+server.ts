import type { RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const DATA_SERVER_URL = env.DATA_SERVER_URL || "http://localhost:8005";

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		
		const response = await fetch(`${DATA_SERVER_URL}/sam/cache/${id}`, {
			method: "DELETE",
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Backend cache clear error:", errorText);
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
		console.error("Error clearing cache:", error);
		return new Response(
			JSON.stringify({ 
				error: "Failed to clear cache",
				message: error instanceof Error ? error.message : String(error)
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};

