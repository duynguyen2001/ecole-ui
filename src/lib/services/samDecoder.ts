/**
 * SAM ONNX Decoder Service
 * Preloads and manages the ONNX decoder model for fast access
 */
import * as ort from "onnxruntime-web";

class SAMDecoderService {
	private static instance: SAMDecoderService;
	private decoderModel: ort.InferenceSession | null = null;
	private loadingPromise: Promise<void> | null = null;
	private isLoaded = false;

	private constructor() {}

	static getInstance(): SAMDecoderService {
		if (!SAMDecoderService.instance) {
			SAMDecoderService.instance = new SAMDecoderService();
		}
		return SAMDecoderService.instance;
	}

	/**
	 * Preload the ONNX decoder model
	 * Can be called multiple times safely - will only load once
	 */
	async preload(): Promise<void> {
		// If already loaded, return immediately
		if (this.isLoaded && this.decoderModel) {
			return;
		}

		// If currently loading, wait for that to complete
		if (this.loadingPromise) {
			return this.loadingPromise;
		}

		// Start loading
		this.loadingPromise = this._loadDecoder();
		return this.loadingPromise;
	}

	private async _loadDecoder(): Promise<void> {
		try {
			console.log("🔄 Preloading ONNX decoder model...");
			const startTime = performance.now();

			// Configure ONNX Runtime
			ort.env.wasm.wasmPaths = "/onnx-wasm/";
			ort.env.wasm.numThreads = 1;
			ort.env.logLevel = "error"; // Suppress CPU vendor warnings

			const DECODER_PATH = "/sam2_onnx/sam2_hiera_large.decoder.onnx";

			this.decoderModel = await ort.InferenceSession.create(DECODER_PATH, {
				executionProviders: ["wasm"],
				graphOptimizationLevel: "all",
			});

			const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
			console.log(`✅ ONNX decoder preloaded in ${loadTime}s`);
			
			this.isLoaded = true;
		} catch (error) {
			console.error("❌ Error preloading ONNX decoder:", error);
			this.loadingPromise = null; // Reset so it can be retried
			throw error;
		}
	}

	/**
	 * Get the loaded decoder model
	 * Will preload if not already loaded
	 */
	async getDecoder(): Promise<ort.InferenceSession> {
		if (!this.isLoaded || !this.decoderModel) {
			await this.preload();
		}
		
		if (!this.decoderModel) {
			throw new Error("Failed to load decoder model");
		}
		
		return this.decoderModel;
	}

	/**
	 * Check if decoder is already loaded
	 */
	isDecoderLoaded(): boolean {
		return this.isLoaded && this.decoderModel !== null;
	}
}

// Export singleton instance
export const samDecoder = SAMDecoderService.getInstance();

