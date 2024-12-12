<script lang="ts">
	import Icon from "@iconify/svelte";
	import type { LabelInfo } from "./types";
	export let labelsInfo: Map<string, LabelInfo>;
	export let ant_modeOn: boolean;
	export let ant_currentLabel: string;
	export let ant_saving: boolean;
	let labels: string[] = [];
	let currentMode: string;

	$: if (labelsInfo) {
		labels = Array.from(labelsInfo.keys());
		if (!ant_currentLabel) ant_currentLabel = labels[0];
	}

	const selectMode = (mode: string) => {
		console.log("mode", mode);
		console.log(ant_modeOn);
		currentMode = mode;
	};
</script>

<div
	class="absolute z-[100] inline-flex w-fit grow-0 flex-row items-center justify-center rounded-lg border-[1px] border-black bg-white p-[0.4rem]"
>
	<div class="flex flex-row gap-[5px]">
		<button
			class="rounded-md p-[2px] focus:bg-gray-300 focus:outline-none"
			on:click={() => selectMode("sam-annotate")}
		>
			<Icon icon="mingcute:target-line" width={30} />
		</button>
		<button
			class="rounded-md p-[2px] focus:bg-gray-300 focus:outline-none"
			on:click={() => selectMode("polygon-annotate")}
		>
			<Icon icon="majesticons:box" width={30} />
		</button>
		<button
			class="rounded-md p-[2px] focus:bg-gray-300 focus:outline-none"
			on:click={() => selectMode("ai-annotate")}
		>
			<Icon icon="mdi:magic" width={30} />
		</button>
	</div>

	<button
		class="mx-[0.5rem] border-l-[1px] border-r-[1px] border-black px-[0.5rem]"
		on:click={() => {
			ant_saving = true;
			ant_saving = ant_saving;
			currentMode = "";
		}}
	>
		<Icon icon="akar-icons:check-box" width={30} color={ant_modeOn ? "green" : "black"} />
	</button>

	<div class="flex flex-row items-center justify-center gap-[0.7rem]">
		<Icon icon="akar-icons:arrow-back" width={25} stroke-width="2" />
		<Icon icon="akar-icons:arrow-back" width={25} stroke-width="2" flip="horizontal" />
	</div>

	{#if currentMode === "polygon-annotate" && !ant_modeOn}
		<div
			class="absolute top-[3.5rem] flex flex-row items-center gap-[10px] rounded-sm bg-[#f0f0f0] px-[20px] py-[15px]"
		>
			<select
				class=" w-[150px] rounded-sm border-[1px] border-[#a6a6a6] px-[10px] py-[5px] text-[14px]"
				id="layer-select"
				bind:value={ant_currentLabel}
			>
				{#each labels as label}
					<option value={label}>{label}</option>
				{/each}
			</select>
			<button
				class="h-fit rounded-sm bg-[#0084FF] px-[15px] py-[2px] text-[12px] text-white"
				on:click={() => (ant_modeOn = true)}>interact</button
			>
		</div>{/if}
</div>
