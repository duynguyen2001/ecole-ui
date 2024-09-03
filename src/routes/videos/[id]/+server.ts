import { IMAGE_SERVER_URL } from "$env/static/private";
import type { RequestEvent } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";
import fetch from "node-fetch";

export async function GET(event: RequestEvent) {
	const { id } = event.params;
	const imageUrl = IMAGE_SERVER_URL;

	try {
		const apiResponse = await fetch(`${imageUrl}/videos/${id}`, {
			headers: {
				range: event.request.headers.get("range") || "",
			},
		});

		if (!apiResponse.ok) {
			throw error(apiResponse.status, await apiResponse.text());
		}

		const headers = new Headers(apiResponse.headers);
		const readableStream = apiResponse.body;

		return new Response(readableStream, {
			headers: headers,
			status: apiResponse.status,
		});
	} catch (err) {
		throw error(500, "Failed to fetch video");
	}
}
