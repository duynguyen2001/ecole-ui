<script lang="ts">
	import type { ImageData, LabelInfo, PolygonInfo } from "./types";
	import Icon from "@iconify/svelte";
	import { generateRandomColor } from "./HSLToRGB";
	export let currentImage: ImageData | undefined;
	export let labelsInfo: Map<string, LabelInfo>;
	export let currentLayer: number;
	export let currentLayerFocused: boolean;
	let labels: string[] = [];

	$: if (currentLayer !== undefined && currentLayerFocused) {
		const targetElement = document.querySelector(`[data-layer="${currentLayer}"]`);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}

	$: if (labelsInfo) {
		labels = Array.from(labelsInfo.keys());
	}

	$: if (currentImage) {
		console.log("change detected");
	}

	// Typed function to handle name changes
	function onNameChange(e: Event, polygon: PolygonInfo) {
		const newName = (e.target as HTMLSelectElement)?.value;
		polygon.label = newName;
		if (currentImage) currentImage.origin.polygonPoints = [...currentImage.origin.polygonPoints];
	}

	function addNewLabel(e: KeyboardEvent) {
		if (e.key === "Enter") {
			const newLabel = (e.target as HTMLInputElement)?.value;
			if (!newLabel) return;
			if (e.target) {
				(e.target as HTMLInputElement).value = "";
			}
			labelsInfo.set(newLabel, {
				color: generateRandomColor(
					Array.from(labelsInfo.values()).map((info) => info.color),
					90,
					50
				),
				type: "polygon",
			});
			labelsInfo = new Map(labelsInfo);
			console.log(labelsInfo);
		}
	}

	function changeColor(label: string) {
		console.log("change color");
		return (e: Event) => {
			const color: string = (e.target as HTMLInputElement)?.value;
			if (!color) return;
			labelsInfo.set(label, {
				color,
				type: "polygon",
			});
			labelsInfo = new Map(labelsInfo);
			console.log(labelsInfo);
		};
	}
</script>

<div class="flex h-full w-full flex-col">
	<div class="h-1/2 overflow-y-auto">
		<div class="bg-[#D9D9D9] p-[10px]">Layers</div>
		{#if currentImage && labelsInfo}
			<div class="flex flex-col gap-[1px] px-[10px] py-[10px]">
				{#each currentImage.origin.polygonPoints as polygon, i}
					<div
						data-layer={i}
						class={`gap-end relative flex flex-row items-center justify-between rounded-[5px] border-[2px] border-solid p-[10px] ${
							i === currentLayer ? "border-black" : "border-transparent hover:border-black"
						}`}
						style={`background-color: ${labelsInfo?.get(polygon.label)?.color}; `}
						role="cell"
						tabindex="0"
					>
						<div class="absolute left-[3px] top-[1px] text-[8px]">{i + 1}</div>
						<select
							class="rounded-sm text-[12px]"
							id="layer-select"
							bind:value={polygon.label}
							on:change={(e) => onNameChange(e, polygon)}
						>
							{#each labels as label}
								<option value={label}>{label}</option>
							{/each}
						</select>
						<div class="flex flex-row items-center gap-[10px]">
							<Icon icon="mdi:lock" />
							<Icon icon="mdi:eye" />
							<Icon icon="mdi:trash" />
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
	<div class="flex h-1/2 flex-col">
		<div class="bg-[#D9D9D9] p-[10px]">Labels</div>
		<input
			class="w-full border-b-[2px] border-solid border-[#D9D9D9] p-[5px] text-[12px]"
			type="text"
			placeholder="Add a new label"
			on:keydown={addNewLabel}
		/>
		<div class="my-[15px] flex flex-1 flex-col gap-[10px] overflow-y-auto px-[20px] text-[12px]">
			{#each labelsInfo.entries() as [label, info]}
				<div class="flex flex-row items-center gap-[10px]">
					<input
						class="h-5 w-5"
						id="color-picker"
						type="color"
						value={info.color}
						on:change={changeColor(label)}
					/>
					<span>{label}</span>
				</div>
			{/each}
		</div>
	</div>
</div>
