<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import Modal from "./Modal.svelte";
	import Stage from "$lib/SAM_Segmentation/Stage.svelte";
	import type { MessageFile } from "$lib/types/Message";
	import * as ort from "onnxruntime-web";
	import { modelData } from "$lib/SAM_Segmentation/onnxModelAPI";
	import { onnxMaskToImage } from "$lib/SAM_Segmentation/maskUtils";
	import { samDecoder } from "$lib/services/samDecoder";

	// Helper function for image scaling (from scaleHelper.tsx)
	function handleImageScale(image: HTMLImageElement) {
		const LONG_SIDE_LENGTH = 1024;
		const w = image.naturalWidth;
		const h = image.naturalHeight;
		const samScale = LONG_SIDE_LENGTH / Math.max(h, w);
		return { height: h, width: w, samScale };
	}

	export let imageFile: MessageFile;
	export let imageSrc: string;

	const dispatch = createEventDispatcher();

	// Use /api/mask routes (proxies to backend SAM server)
	const MASK_API_BASE = "/api/mask";

	let image: HTMLImageElement | null = null;
	let maskImg: HTMLImageElement | null = null;
	let savedMaskImgs: any[] = [];
	let savedClicks: any[] = [];
	let clicks: any[] = [];
	let modelScale: any = null;
	let embeddingId: string | null = null; // Server-side embedding reference
	let imageEmbedding: any = null; // Client-side embedding tensor
	let highResFeats: any[] = []; // High-resolution features for SAM2
	let decoderModel: ort.InferenceSession | null = null; // ONNX decoder
	let isModelLoading = true;
	let loadingMessage = "Initializing...";
	let selectedRegionData: any = null;
	let usingGPU = false;

	onMount(async () => {
		try {
			// Load the image
			loadingMessage = "Loading image...";
			const img = new Image();
			img.src = imageSrc;
			img.crossOrigin = "anonymous";

			await new Promise((resolve) => {
				img.onload = resolve;
			});

			image = img;
			modelScale = handleImageScale(img);
			console.log("✓ Image loaded:", img.naturalWidth, "x", img.naturalHeight);

			// Check backend status via /api/mask/status
			loadingMessage = "Checking SAM backend...";
			const statusResponse = await fetch(`${MASK_API_BASE}/status`);
			const status = await statusResponse.json();
			
			console.log("🖥️  SAM Backend Status:", status);
			usingGPU = status.device?.includes("cuda") || false;

			if (status.status !== "ready") {
				throw new Error("SAM backend is not ready. Please start the data server with SAM support.");
			}

			// Get ONNX decoder model (preloaded or load now)
			loadingMessage = "Loading ONNX decoder...";
			if (samDecoder.isDecoderLoaded()) {
				console.log("✅ Using preloaded ONNX decoder");
				decoderModel = await samDecoder.getDecoder();
			} else {
				console.log("🔄 Loading ONNX decoder model...");
				const decoderStart = performance.now();
				decoderModel = await samDecoder.getDecoder();
				const decoderTime = ((performance.now() - decoderStart) / 1000).toFixed(2);
				console.log(`✅ ONNX Decoder loaded in ${decoderTime}s`);
			}

			// Encode image on backend GPU (this is the heavy operation)
			loadingMessage = `Encoding image on backend ${usingGPU ? "GPU" : "CPU"}...`;
			console.log(`🔄 Encoding image on backend...`);

			const encodeStart = performance.now();
			
			// Convert image to blob
			const blob = await (await fetch(imageSrc)).blob();
			const formData = new FormData();
			formData.append("file", blob, "image.jpg");

			const encodeResponse = await fetch(`${MASK_API_BASE}/encode`, {
				method: "POST",
				body: formData,
			});

			if (!encodeResponse.ok) {
				throw new Error(`Failed to encode image: ${encodeResponse.statusText}`);
			}

			const encodeData = await encodeResponse.json();
			embeddingId = encodeData.embedding_id;
			const encodeTime = ((performance.now() - encodeStart) / 1000).toFixed(2);

			// Convert base64 embeddings to tensors
			const embeddingBytes = Uint8Array.from(atob(encodeData.embedding_base64), c => c.charCodeAt(0));
			const embeddingArray = new Float32Array(embeddingBytes.buffer);
			
			// Fix: Add batch dimension if missing (SAM2 returns [C, H, W], ONNX expects [1, C, H, W])
			let embeddingShape = encodeData.embedding_shape;
			if (embeddingShape.length === 3) {
				console.log("⚠️  Adding batch dimension to embedding (SAM2 -> ONNX compatibility)");
				embeddingShape = [1, ...embeddingShape]; // [C, H, W] -> [1, C, H, W]
			}
			imageEmbedding = new ort.Tensor("float32", embeddingArray, embeddingShape);

			// Convert high-res features if available
			highResFeats = [];
			if (encodeData.high_res_feats_base64 && encodeData.high_res_shapes) {
				for (let i = 0; i < encodeData.high_res_feats_base64.length; i++) {
					const featBytes = Uint8Array.from(atob(encodeData.high_res_feats_base64[i]), c => c.charCodeAt(0));
					const featArray = new Float32Array(featBytes.buffer);
					const featTensor = new ort.Tensor("float32", featArray, encodeData.high_res_shapes[i]);
					highResFeats.push(featTensor);
				}
				console.log(`✅ Loaded ${highResFeats.length} high-res feature levels`);
			}

			console.log(`✅ Image encoded in ${encodeTime}s on backend ${usingGPU ? "GPU" : "CPU"}`);
			console.log(`   - Embedding ID: ${embeddingId}`);
			console.log(`   - Embedding shape: ${encodeData.embedding_shape}`);
			console.log(`   - High-res features: ${highResFeats.length} levels`);
			console.log(`🎉 Hybrid SAM ready: GPU encoding + ONNX decoding!`);

			isModelLoading = false;
		} catch (error: any) {
			console.error("❌ Error initializing SAM:", error);
			loadingMessage = `Error: ${error.message || error}. Please ensure the data server is running with SAM support.`;
			isModelLoading = false;
		}
	});

	async function handleMouseClick(event: CustomEvent) {
		if (!imageEmbedding || !decoderModel || !modelScale) return;

		const click = event.detail.click;
		clicks = [...clicks, click];
		savedClicks = [...savedClicks, { id: Date.now().toString(), click }];

		try {
			console.log(`🔄 Generating mask with ${clicks.length} click(s) using ONNX decoder...`);
			const decodeStart = performance.now();

			// Prepare model inputs using ONNX decoder
			const feeds = modelData({
				clicks: clicks,
				tensor: imageEmbedding,
				modelScale: modelScale,
			});

			if (!feeds) {
				throw new Error("Failed to prepare model inputs");
			}

			// Map to SAM2 decoder input names (different from SAM1)
			// SAM2 expects: image_embed + high_res_feats_0/1
			const sam2Feeds: any = {
				image_embed: feeds.image_embeddings,  // Rename for SAM2
				point_coords: feeds.point_coords,
				point_labels: feeds.point_labels,
				mask_input: feeds.mask_input,
				has_mask_input: feeds.has_mask_input,
			};

			// Add high-resolution features if available
			if (highResFeats.length >= 2) {
				sam2Feeds.high_res_feats_0 = highResFeats[0];
				sam2Feeds.high_res_feats_1 = highResFeats[1];
				console.log(`   - Using ${highResFeats.length} high-res feature levels`);
			} else {
				console.warn(`⚠️  Missing high-res features (have ${highResFeats.length}, need 2)`);
				throw new Error("High-resolution features not available. Please re-encode the image.");
			}

			// Run ONNX decoder inference locally (very fast!)
			const results = await decoderModel.run(sam2Feeds as any);
			const output = results.masks;

			// Convert ONNX mask to image
			const maskImage = onnxMaskToImage(
				output.data,
				output.dims[3],  // width
				output.dims[2]   // height
			);

			maskImg = maskImage;

			const decodeTime = ((performance.now() - decodeStart) / 1000).toFixed(3);
			console.log(`✅ Mask generated in ${decodeTime}s using local ONNX decoder`);
		} catch (error: any) {
			console.error("Error generating mask:", error);
			alert(`Error generating mask: ${error.message || error}`);
		}
	}

	function handleMouseHover(event: CustomEvent) {
		// Preview on hover if needed
	}

	function handleMouseOut() {
		// Clear preview if needed
	}

	function handleUndo() {
		if (clicks.length > 0) {
			clicks = clicks.slice(0, -1);
			savedClicks = savedClicks.slice(0, -1);
			maskImg = null;
		}
	}

	function handleDelete(event: CustomEvent) {
		const id = event.detail;
		savedMaskImgs = savedMaskImgs.filter((img) => img.id !== id);
	}

	async function handleUseRegion() {
		// Use current mask directly instead of saved masks
		if (!maskImg) return;

		try {
			loadingMessage = "Extracting segmented region...";
			isModelLoading = true;

			// Extract current mask directly
			const imageBlob = await (await fetch(imageSrc)).blob();
			const maskBlob = await (await fetch(maskImg.src)).blob();

			// Create form data for extraction
			const formData = new FormData();
			formData.append("image_file", imageBlob, "image.jpg");
			formData.append("mask_file", maskBlob, "mask.png");

			// Call backend to extract region via /api/mask/extract
			const response = await fetch(`${MASK_API_BASE}/extract`, {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Failed to extract region: ${response.statusText}`);
			}

			// Get the extracted image
			const extractedBlob = await response.blob();
			const fileName = `extracted_region.png`;
			const file = new File([extractedBlob], fileName, { type: "image/png" });

			console.log(`✅ Extracted region`);

			// Dispatch event with extracted file
			dispatch("useRegion", {
				regions: [{ id: "current", name: "Extracted Region", src: maskImg.src, clicks }],
				imageFile,
				extractedFiles: [file],
			});
			dispatch("close");
		} catch (error: any) {
			console.error("Error extracting region:", error);
			alert(`Error extracting region: ${error.message || error}`);
			isModelLoading = false;
		}
	}

	// Cleanup: clear cache when modal closes
	function handleClose() {
		if (embeddingId) {
			// Clear the embedding from backend cache via /api/mask/cache
			fetch(`${MASK_API_BASE}/cache/${embeddingId}`, {
				method: "DELETE",
			}).catch((err) => console.warn("Failed to clear cache:", err));
		}
		dispatch("close");
	}
</script>

<Modal width="max-w-[95vw]" on:close={handleClose}>
	<div class="flex h-[90vh] flex-col p-4">
		{#if isModelLoading}
			<div class="flex h-full items-center justify-center">
				<div class="text-center">
					<div class="mb-4 flex items-center justify-center">
						<svg
							class="mr-3 h-8 w-8 animate-spin text-blue-600"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							/>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
						<span class="text-lg font-semibold">{loadingMessage}</span>
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">
						{#if loadingMessage.includes("Error")}
							{loadingMessage}
						{:else}
							Hybrid SAM2: Backend {usingGPU ? "GPU" : "CPU"} encoding + ONNX decoding
						{/if}
					</div>
					{#if !loadingMessage.includes("Error")}
						<div class="mt-4 text-xs text-gray-500">
							Best of both worlds: GPU encoding (fast) + Local decoding (no latency)
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="mb-4">
				<h2 class="text-xl font-bold">Select Region of Interest</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Click Add/Minus, then click on image to create mask. Click Submit when ready.
				</p>
				{#if usingGPU}
					<p class="text-xs text-green-600 dark:text-green-400 mt-1">
						🚀 GPU Accelerated
					</p>
				{/if}
			</div>

			<div class="flex-1 overflow-hidden">
				<Stage
					{image}
					{maskImg}
					{savedMaskImgs}
					{savedClicks}
					{modelScale}
					on:mouseClick={handleMouseClick}
					on:mouseHover={handleMouseHover}
					on:mouseOut={handleMouseOut}
					on:undo={handleUndo}
					on:delete={handleDelete}
					on:submit={handleUseRegion}
				/>
			</div>
		{/if}
	</div>
</Modal>
