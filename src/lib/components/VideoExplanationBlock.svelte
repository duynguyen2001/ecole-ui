<script lang="ts">
	import { onDestroy, onMount } from "svelte";

	export let json_data = {
		objects: {
			boot: [
				"",
				"",
				"",
				"",
				"color: brown\nposition: left",
				"color: brown\nposition: left",
				"color: brown\nposition: left",
				"color: brown\nposition: left",
			],
			trash: [
				"",
				"",
				"",
				"",
				"type: plastic bottle\nposition: center",
				"type: plastic bottle\nposition: center",
				"type: plastic bottle\nposition: center",
				"type: plastic bottle\nposition: center",
			],
		},
		relations: [
			"boot - next to - trash",
			"boot - next to - trash",
			"boot - next to - trash",
			"boot - next to - trash",
		],
		blended_imgs: [
			"69c90fcf-02d4-49f8-9caf-d6ef999b25d9",
			"69c90fcf-02d4-49f8-9caf-d6ef999b25d9",
			"69c90fcf-02d4-49f8-9caf-d6ef999b25d9",
			"69c90fcf-02d4-49f8-9caf-d6ef999b25d9",
		],
	};

	let ifAnimated = false;
	let images: string[] = [];
	let currentIndex: number = 0;
	let interval: NodeJS.Timeout | undefined;
	let localURLs: Record<string, string> = {};
	let finished = false;

	onMount(() => {
		// Preload images
		images = json_data.blended_imgs.map((id) => `/images/${id}`);

		images.forEach((imageURL, i) => {
			fetch(imageURL)
				.then((response) => response.blob())
				.then((blob) => {
					localURLs[i] = URL.createObjectURL(blob);
					if (Object.keys(localURLs).length === images.length) {
						finished = true;
					}
				});
		});

		return () => {
			// Revoke all object URLs
			Object.values(localURLs).forEach((url) => URL.revokeObjectURL(url));
		};
	});

	onDestroy(() => {
		if (interval) {
			clearInterval(interval);
		}
	});
</script>

<div>
	{#if images.length > 0}
		<div class={`grid grid-rows-${images.length} grid-flow-col gap-4`}>
			<button
				class="m-4 rounded-lg border border-gray-200 px-2 py-2 text-sm shadow-sm transition-all hover:border-gray-300 active:shadow-inner dark:border-gray-600 dark:hover:border-gray-400"
				on:click={() => {
					ifAnimated = !ifAnimated
					if (!ifAnimated) {
						clearInterval(interval);
						interval = undefined;
					} else {
						interval = setInterval(() => {
							currentIndex = (currentIndex + 1) % images.length;
						}, 1000);
					}
				}}
			>
				{ifAnimated ? "Stop" : "Start"} Animation
			</button>
			{#each Object.entries(localURLs) as [index, _]}
				<button
					on:click={() => {
						currentIndex = Number(index);
					}}
					class={"m-4 rounded-lg border border-gray-200 px-2 py-2 text-sm shadow-sm transition-all hover:border-gray-300 active:shadow-inner dark:border-gray-600 dark:hover:border-gray-400" +
						(currentIndex === +index ? " bg-gray-200" : "")}
				>
					{index}
				</button>
			{/each}
		</div>

		{#if finished}
			<div class="grid grid-cols-2">
				<img src={localURLs[currentIndex]} alt="motion" />

				<div class="flex flex-col">
					{#if json_data.objects && Object.keys(json_data.objects).length > 0}
						<h2>Objects</h2>
						<table>
							<tr class="bg-gray-100 capitalize">
								<th>Name</th>
								<th>Attribute</th>
								<th>Value</th>
							</tr>
							{#each Object.entries(json_data.objects) as [key, value]}
								{#if value[currentIndex]}
									{#each value[currentIndex].split("\n").entries() as [idx, attr]}
										<tr>
											{#if idx === 0}
												<td rowspan={value[currentIndex].split("\n").length}>{key}</td>
											{/if}
											{#if attr.split(":").length > 1}
												<td>{attr.split(":")[0]}</td>
												<td>{attr.split(":")[1]}</td>
											{/if}
										</tr>
									{/each}
								{/if}
							{/each}
						</table>
					{/if}

					{#if json_data.relations[currentIndex]}
						<h2>Relations</h2>
						<table>
							<tr class="bg-gray-100 capitalize">
								<th>Relation</th>
							</tr>
							<tr>
								{#each json_data.relations[currentIndex].split(", ") as relation}
									<td>{relation}</td>
								{/each}
							</tr>
						</table>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>
