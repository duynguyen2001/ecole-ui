<script lang="ts">
	import { onMount } from "svelte";
	import type { MessageFile } from "$lib/types/Message";
	import CarbonZoomIn from "~icons/carbon/zoom-in";
	import CarbonZoomOut from "~icons/carbon/zoom-out";
	import CarbonFitToScreen from "~icons/carbon/fit-to-screen";
	import CarbonClose from "~icons/carbon/close";

	export let focusedImage: {
		file: MessageFile;
		src: string;
		regions?: any[];
	} | null = null;

	let zoomLevel = 1;
	let isPanning = false;
	let panX = 0;
	let panY = 0;
	let startX = 0;
	let startY = 0;

	function zoomIn() {
		zoomLevel = Math.min(zoomLevel + 0.25, 3);
	}

	function zoomOut() {
		zoomLevel = Math.max(zoomLevel - 0.25, 0.5);
	}

	function resetZoom() {
		zoomLevel = 1;
		panX = 0;
		panY = 0;
	}

	function handleMouseDown(e: MouseEvent) {
		if (e.button === 0) {
			// Left click
			isPanning = true;
			startX = e.clientX - panX;
			startY = e.clientY - panY;
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (isPanning) {
			panX = e.clientX - startX;
			panY = e.clientY - startY;
		}
	}

	function handleMouseUp() {
		isPanning = false;
	}

	function clearFocus() {
		focusedImage = null;
		resetZoom();
	}

	$: if (!focusedImage) {
		resetZoom();
	}
</script>

<svelte:window on:mouseup={handleMouseUp} on:mousemove={handleMouseMove} />

<div
	class="flex h-full flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Media Viewer</h2>
			{#if focusedImage}
				<p class="text-sm text-gray-500 dark:text-gray-400">
					{focusedImage.file.name}
					{#if focusedImage.regions && focusedImage.regions.length > 0}
						<span class="ml-2 text-blue-600 dark:text-blue-400">
							({focusedImage.regions.length} region{focusedImage.regions.length > 1 ? "s" : ""})
						</span>
					{/if}
				</p>
			{/if}
		</div>
		{#if focusedImage}
			<button
				on:click={clearFocus}
				class="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
				title="Clear focus"
			>
				<CarbonClose class="text-xl" />
			</button>
		{/if}
	</div>

	<!-- Toolbar -->
	{#if focusedImage}
		<div class="flex items-center gap-2 border-b border-gray-200 p-2 dark:border-gray-700">
			<button
				on:click={zoomIn}
				class="rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
				title="Zoom In"
			>
				<CarbonZoomIn class="text-xl" />
			</button>
			<button
				on:click={zoomOut}
				class="rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
				title="Zoom Out"
			>
				<CarbonZoomOut class="text-xl" />
			</button>
			<button
				on:click={resetZoom}
				class="rounded-md p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
				title="Reset View"
			>
				<CarbonFitToScreen class="text-xl" />
			</button>
			<span class="ml-auto text-sm text-gray-600 dark:text-gray-400">
				{Math.round(zoomLevel * 100)}%
			</span>
		</div>
	{/if}

	<!-- Image Display Area -->
	<div class="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
		{#if focusedImage}
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div
				class="flex h-full w-full items-center justify-center"
				on:mousedown={handleMouseDown}
				style="cursor: {isPanning ? 'grabbing' : 'grab'}"
			>
				<div
					class="relative"
					style="transform: translate({panX}px, {panY}px) scale({zoomLevel}); transform-origin: center;"
				>
					<img
						src={focusedImage.src}
						alt={focusedImage.file.name}
						class="max-h-[80vh] max-w-full select-none object-contain"
						draggable="false"
					/>

					<!-- Render regions if available -->
					{#if focusedImage.regions && focusedImage.regions.length > 0}
						<div class="absolute left-0 top-0 h-full w-full">
							{#each focusedImage.regions as region, idx}
								<div
									class="absolute border-2 border-blue-500 bg-blue-500/20"
									style="
										left: {region.x}px;
										top: {region.y}px;
										width: {region.width}px;
										height: {region.height}px;
									"
								>
									<span
										class="absolute -top-6 left-0 rounded bg-blue-500 px-2 py-1 text-xs text-white"
									>
										{region.name || `Region ${idx + 1}`}
									</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="flex h-full items-center justify-center text-center">
				<div class="max-w-md px-4">
					<svg
						class="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
						No Image Selected
					</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Click on an image in the conversation or upload an image to view it here.
					</p>
					<p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
						Use the zoom controls to inspect details. Click and drag to pan around the image.
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Info Panel -->
	{#if focusedImage}
		<div class="border-t border-gray-200 p-4 dark:border-gray-700">
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-gray-600 dark:text-gray-400">File:</span>
					<span class="font-medium text-gray-900 dark:text-gray-100">{focusedImage.file.name}</span>
				</div>
				{#if focusedImage.file.size}
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Size:</span>
						<span class="font-medium text-gray-900 dark:text-gray-100">
							{(focusedImage.file.size / 1024).toFixed(2)} KB
						</span>
					</div>
				{/if}
				{#if focusedImage.file.mime}
					<div class="flex justify-between">
						<span class="text-gray-600 dark:text-gray-400">Type:</span>
						<span class="font-medium text-gray-900 dark:text-gray-100">
							{focusedImage.file.mime}
						</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Prevent text selection during panning */
	:global(body.panning) {
		user-select: none;
	}
</style>
