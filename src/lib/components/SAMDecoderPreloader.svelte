<script lang="ts">
	import { onMount } from "svelte";
	import { samDecoder } from "$lib/services/samDecoder";

	// Preload the decoder model when this component mounts
	onMount(async () => {
		try {
			// Start preloading in background
			samDecoder.preload().catch((error) => {
				console.warn("Failed to preload SAM decoder:", error);
			});
		} catch (error) {
			// Silently fail - will load on-demand if preload fails
			console.warn("SAM decoder preload error:", error);
		}
	});
</script>

<!-- This component is invisible and just preloads the decoder -->

