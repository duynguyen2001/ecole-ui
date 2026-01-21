<script lang="ts">
	import { page } from "$app/stores";
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { env as envPublic } from "$env/dynamic/public";
	import ChatWindow from "$lib/components/chat/ChatWindow.svelte";
	import ImageFocusPanel from "$lib/components/ImageFocusPanel.svelte";
	import { findCurrentModel } from "$lib/utils/models";
	import { useSettingsStore } from "$lib/stores/settings";
	import { ERROR_MESSAGES, error } from "$lib/stores/errors";
	import { pendingMessage } from "$lib/stores/pendingMessage";
	import type { MessageFile } from "$lib/types/Message";

	export let data;

	let loading = false;
	let files: File[] = [];
	let focusedImage: { file: MessageFile; src: string; regions?: any[] } | null = null;

	const settings = useSettingsStore();
	const modelId = $page.params.model;

	async function createConversation(message: string) {
		try {
			loading = true;
			// check if $settings.activeModel is a valid model
			// else check if it's an assistant, and use that model
			// else use the first model

			const validModels = data.models.map((model) => model.id);

			let model;
			if (validModels.includes($settings.activeModel)) {
				model = $settings.activeModel;
			} else {
				if (validModels.includes(data.assistant?.modelId)) {
					model = data.assistant?.modelId;
				} else {
					model = data.models[0].id;
				}
			}
			const res = await fetch(`${base}/conversation`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model,
					preprompt: $settings.customPrompts[$settings.activeModel],
				}),
			});

			if (!res.ok) {
				error.set("Error while creating conversation, try again.");
				console.error("Error while creating conversation: " + (await res.text()));
				return;
			}

			const { conversationId } = await res.json();

			// Ugly hack to use a store as temp storage, feel free to improve ^^
			pendingMessage.set({
				content: message,
				files,
			});

			// invalidateAll to update list of conversations
			await goto(`${base}/conversation/${conversationId}`, { invalidateAll: true });
		} catch (err) {
			error.set(ERROR_MESSAGES.default);
			console.error(err);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		settings.instantSet({
			activeModel: modelId,
		});
	});

	// Handle image focus when clicked or sent
	function handleImageFocus(event: CustomEvent) {
		const { file, src, regions } = event.detail;
		focusedImage = { file, src, regions };
	}

	// Update focused image when files are added
	$: if (files.length > 0) {
		const lastFile = files[files.length - 1];
		if (lastFile.type?.startsWith("image/")) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				// Extract base64 data from data URL
				const base64Data = result.split(",")[1] || "";
				focusedImage = {
					file: {
						type: "base64",
						name: lastFile.name,
						mime: lastFile.type,
						value: base64Data,
						size: lastFile.size,
					} as MessageFile,
					src: result,
				};
			};
			reader.readAsDataURL(lastFile);
		}
	}
</script>

<svelte:head>
	<meta property="og:title" content={modelId + " - " + envPublic.PUBLIC_APP_NAME} />
	<meta property="og:type" content="link" />
	<meta property="og:description" content={`Use ${modelId} with ${envPublic.PUBLIC_APP_NAME}`} />
	<meta
		property="og:image"
		content="{envPublic.PUBLIC_ORIGIN || $page.url.origin}{base}/models/{modelId}/thumbnail.png"
	/>
	<meta property="og:url" content={$page.url.href} />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex h-screen w-full">
	<!-- Main Chat Window (Left Side) - 50% width -->
	<div class="flex h-full w-1/2">
		<ChatWindow
			on:message={(ev) => createConversation(ev.detail)}
			on:imageFocus={handleImageFocus}
			{loading}
			currentModel={findCurrentModel([...data.models, ...data.oldModels], modelId)}
			models={data.models}
			bind:files
		/>
	</div>

	<!-- Image Focus Panel (Right Side) - 50% width -->
	<div class="w-1/2">
		<ImageFocusPanel bind:focusedImage />
	</div>
</div>
