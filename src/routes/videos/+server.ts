import { IMAGE_SERVER_URL } from "$env/static/private";
import type { RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler  = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return new Response(JSON.stringify({ error: "No file found in request" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Create FormData to send to FastAPI
		const apiFormData = new FormData();
		apiFormData.append("file", file, file.name);
		// Send the video file to FastAPI server
		const response = await fetch(`${IMAGE_SERVER_URL}/videos/`, {
			method: "POST",
			body: apiFormData,
		});

		const data = await response.json();

		if (response.ok) {
			return new Response(JSON.stringify(data), {
				status: 200
			});
		} else {
			console.error("data", data);
			return new Response(JSON.stringify(data), {
				status: 400,
				headers: {
					"Content-Type": "application/json",
				},
			});
		}
	} catch (error) {
		return new Response(JSON.stringify({ error: error as Error }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};