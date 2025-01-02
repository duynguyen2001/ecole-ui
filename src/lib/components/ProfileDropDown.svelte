<script lang="ts">
	import { onMount } from "svelte";
	import { navigate } from "svelte-routing";

	interface Mode {
		name: string;
		icon: string;
		path: string;
		locked?: boolean;
	}

	let isOpen = false;
	let githubName = "";

	const modes = [
		{ name: "Annotator", icon: "⚙", path: "/annotator", locked: false },
		{ name: "Knowledge Engineer", icon: "⚙", path: "/knowledge-engineer", locked: true },
		{ name: "Analyst", icon: "〰", path: "/analyst", locked: true },
	];

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function selectMode(mode: Mode) {
		if (!mode.locked) {
			navigate(mode.path);
			isOpen = false;
		}
	}

	onMount(async () => {
		// Fetch the GitHub name from your API or state management
		githubName = "github_name"; // Replace with actual fetch logic

		// detecting outside click
		window.addEventListener("click", (e) => {
			if (!(e.target as Element)?.closest(".dropdown")) {
				isOpen = false;
			}
		});
	});
</script>

<div class="dropdown relative">
	<button on:click={toggleDropdown} class="flex h-10 w-10 items-center justify-center rounded-full">
		<img src="/ecole/annotations/profile_square.jpg" alt="Profile Icon" class="rounded-full" />
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-300 bg-white shadow-md"
		>
			<div class="flex items-center border-b border-gray-200 p-2">
				<div class="flex h-[2rem] w-[2rem] items-center justify-center">
					<div class="h-[70%] w-[70%] rounded-full bg-black" />
				</div>
				<span class="ml-2 text-gray-700">{githubName}</span>
			</div>
			{#each modes as mode}
				<button
					on:click={() => selectMode(mode)}
					class="flex w-full items-center p-2 text-left transition-colors duration-200 hover:bg-gray-100"
					class:opacity-50={mode.locked}
					class:cursor-not-allowed={mode.locked}
				>
					<span class="mr-[0.5rem] flex h-[2rem] w-[2rem] items-center justify-center"
						>{mode.icon}</span
					>
					{mode.name}
					{#if mode.locked}
						<span class="ml-auto text-gray-500">🔒</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
