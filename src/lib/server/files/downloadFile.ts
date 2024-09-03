import { collections } from "$lib/server/database";
import type { Conversation } from "$lib/types/Conversation";
import type { MessageFile } from "$lib/types/Message";
import type { SharedConversation } from "$lib/types/SharedConversation";
import { error } from "@sveltejs/kit";

export async function downloadFile(
	sha256: string,
	convId: Conversation["_id"] | SharedConversation["_id"]
): Promise<MessageFile & { type: "base64" }> {
	const fileId = collections.bucket.find({ filename: `${convId.toString()}-${sha256}` });
	
	const file = await fileId.next();
	if (!file) {
		throw error(404, "File not found");
	}
	if (file.metadata?.conversation !== convId.toString()) {
		throw error(403, "You don't have access to this file.");
	}

	const mime = file.metadata?.mime;
	const name = file.filename;

	const fileStream = collections.bucket.openDownloadStream(file._id);

	const buffer = await new Promise<Buffer>((resolve, reject) => {
		const chunks: Uint8Array[] = [];
		fileStream.on("data", (chunk) => chunks.push(chunk));
		fileStream.on("error", reject);
		fileStream.on("end", () => resolve(Buffer.concat(chunks)));
	});

	return { type: "base64", name, value: buffer.toString("base64"), mime };
}

export async function downloadVideo(
	video_id: string,
): Promise<MessageFile & { type: "base64" }> {
	return { type: "video", name: "video.mp4", value: video_id, mime: "video/mp4" };
}