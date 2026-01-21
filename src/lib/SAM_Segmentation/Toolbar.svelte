<script>
	import CarbonAdd from "~icons/carbon/add-alt";
	import CarbonSubtract from "~icons/carbon/subtract-alt";
	import CarbonDelete from "~icons/carbon/delete";
	import CarbonUndo from "~icons/carbon/undo";
	import CarbonCheckmark from "~icons/carbon/checkmark";

	// You can define functions to handle button clicks here
	export let handleAdd = () => {
		console.log("Add clicked");
	};

	export let handleMinus = () => {
		console.log("Minus clicked");
	};

	export let handleRemove = () => {
		console.log("Remove clicked");
	};

	export let handleDelete = () => {
		console.log("Delete clicked");
	};

	export let handleSubmit = () => {
		console.log("Submit clicked");
	};

	export let hasRegions = false;
</script>

<div>
	<div class="toolbar">
		<div class="button-group">
			<button on:click={handleAdd} class="flex items-center justify-center bg-blue-500">
				<CarbonAdd />
			</button>
			Add
		</div>
		<div class="button-group">
			<button on:click={handleMinus} class="flex items-center justify-center bg-red-500">
				<CarbonSubtract />
			</button>
			Minus
		</div>
		<div class="button-group">
			<button on:click={handleRemove} class="flex items-center justify-center bg-yellow-500">
				<CarbonUndo />
			</button>
			Undo
		</div>
		<div class="button-group">
			<button on:click={handleDelete} class="flex items-center justify-center bg-red-500">
				<CarbonDelete />
			</button>
			Delete
		</div>

		<div class="button-group mt-4">
			<button 
				on:click={handleSubmit} 
				disabled={!hasRegions}
				class="flex items-center justify-center bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<CarbonCheckmark />
			</button>
			Submit
		</div>
	</div>
	<div />
</div>

<style>
	.toolbar {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		background-color: transparent;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 10px;
		margin: 10px;
	}

	.toolbar button {
		color: white;
		width: 30px;
		height: 30px;
		margin: 5px;
		border-radius: 10px;
		cursor: pointer;
		border-radius: 5px;
		font-size: 16px;
	}

	.button-group {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
	/* .toolbar button:hover {
		background-color: #45a049;
	} */
</style>
