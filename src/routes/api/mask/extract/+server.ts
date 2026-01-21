import type { RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const DATA_SERVER_URL = env.DATA_SERVER_URL || "http://localhost:8005";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		
		const response = await fetch(`${DATA_SERVER_URL}/sam/extract`, {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Backend extract error:", errorText);
			return new Response(
				JSON.stringify({ error: `Backend error: ${response.statusText}` }),
				{ status: response.status, headers: { "Content-Type": "application/json" } }
			);
		}

		// Return the image blob directly
		const blob = await response.blob();
		
		return new Response(blob, {
			status: 200,
			headers: {
				"Content-Type": "image/png",
				"Content-Disposition": 'attachment; filename="segmented_region.png"'
			}
		});
	} catch (error) {
		console.error("Error extracting region:", error);
		return new Response(
			JSON.stringify({ 
				error: "Failed to extract region",
				message: error instanceof Error ? error.message : String(error)
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } }
		);
	}
};

