<script>
	import CarbonAdd from "~icons/carbon/add-alt";
	import CarbonSubtract from "~icons/carbon/subtract-alt";
	export let handleMouseMove = null;
	export let handleMouseClick = null;
	export let handleMouseOut = null;
	export let image = null;
	export let maskImg = null;
	export let savedClicks = [];
	export let savedMaskImgs = [];
	export let modelScale = null;
	
	let imageElement = null;
	let displayScale = 1;
	
	// Calculate the scale between image coordinates and displayed coordinates
	$: if (image && imageElement) {
		const displayWidth = imageElement.offsetWidth;
		displayScale = displayWidth / image.width;
	}
</script>

<div id="img-div" class="relative min-h-0 min-w-0 w-full h-full">
	{#if image}
		<div
			class="relative w-full h-full"
			on:mousemove={handleMouseMove}
			on:touchstart={handleMouseMove}
			on:mouseleave={handleMouseOut}
			on:mousedown={handleMouseClick}
		>
			<img 
				bind:this={imageElement}
				src={image.src} 
				class="w-full h-full object-contain" 
				alt="Source"
			/>
			
			<!-- Mask overlay - positioned absolutely to cover the image exactly -->
			{#if maskImg}
				<img 
					src={maskImg.src} 
					alt="Mask" 
					class="absolute top-0 left-0 w-full h-full object-contain opacity-60 pointer-events-none z-20"
				/>
			{/if}
			
			<!-- Saved masks overlay -->
			{#if savedMaskImgs}
				{#each savedMaskImgs as savedMaskImg}
					<img 
						src={savedMaskImg.src} 
						alt="Saved mask" 
						class="absolute top-0 left-0 w-full h-full object-contain opacity-60 pointer-events-none z-20"
					/>
				{/each}
			{/if}
			
			<!-- Click markers - positioned using display coordinates -->
			{#if savedClicks && displayScale}
				{#each savedClicks as savedClick}
					{@const displayX = savedClick.click.x * displayScale}
					{@const displayY = savedClick.click.y * displayScale}
					{#if savedClick.click.clickType === 1}
						<div
							class="absolute flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white border-2 border-white shadow-lg z-30"
							style="left: {displayX - 10}px; top: {displayY - 10}px;"
						>
							<CarbonAdd class="w-3 h-3" />
						</div>
					{:else}
						<div
							class="absolute flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white border-2 border-white shadow-lg z-30"
							style="left: {displayX - 10}px; top: {displayY - 10}px;"
						>
							<CarbonSubtract class="w-3 h-3" />
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	{/if}
</div>
