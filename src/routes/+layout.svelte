<script lang="ts">
	import "../styles/main.css";
	import { onMount } from "svelte";
	import ProfilDropDown from "$lib/components/ProfileDropDown.svelte";
	import Icon from "@iconify/svelte";
	let username = "User";

	onMount(() => {
		// Fetch user data or perform other initialization
	});
</script>

<main>
	<div
		class="flex h-12 items-center justify-between border-b border-black bg-white py-[2rem] pl-[1rem] pr-[2rem]"
	>
		<h1 class="text-[1.2rem] font-normal">ECOLE-MIRACLE</h1>
		<div class="user-profile flex flex-row content-center items-center justify-center gap-[1rem]">
			<span>{username}</span>
			<ProfilDropDown />
		</div>
	</div>

	<div class="content">
		<div class="border-r border-black bg-[#f0f0f0] px-[1rem] py-[1rem]">
			<ul class="flex flex-col gap-[20px]">
				<li class="flex flex-col items-center">
					<Icon icon="mdi:label-multiple" width="25" height="25" color="#333333" />
					<div class="text-[12px]">Labels</div>
				</li>

				<li class="flex flex-col items-center">
					<Icon icon="mdi:clipboard-text-history-outline" width="25" height="25" color="#333333" />
					<div class="text-[12px]">History</div>
				</li>

				<li class="flex flex-col items-center">
					<Icon icon="mdi:train" width="25" height="25" color="#333333" />
					<div class="text-[12px]">Retrain</div>
				</li>

				<li class="flex flex-col items-center border-t border-black pt-[0.8rem]">
					<Icon icon="mdi:tooltip-help" width="25" height="25" color="#333333" />
					<div class="text-[12px]">Help</div>
				</li>
			</ul>
		</div>

		<div class="main-content bg-white">
			<!-- Main content will go here -->
			<slot />
		</div>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.user-profile {
		display: flex;
		align-items: center;
	}

	.content {
		display: flex;
		flex: 1;
	}

	.main-content {
		flex: 1;
	}
</style>
