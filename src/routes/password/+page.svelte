<script>
	import { goto } from "$app/navigation";
	let password = "";
	import { base } from "$app/paths";
	function handleSubmit() {
		fetch(`${base}/password`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ password }),
		})
			.then((res) => {
				if (res.ok) {
					console.log("Password correct");
					goto(`${base}/`);
				} else {
					alert("Incorrect password");
				}
			})
			.catch((err) => {
				console.error(err);
				alert("An error occurred. Please try again later.");
			});
	}
</script>

<main>
	<h1>ECOLE MIRACLE</h1>

	<form on:submit|preventDefault={handleSubmit} class="space-y-4 p-4 bg-gray-50 rounded-md shadow-md max-w-sm mx-auto">
		<label for="password" class="block text-sm font-medium text-gray-700">Password:</label>
		<input 
			type="password" 
			id="password" 
			bind:value={password} 
			class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base text-gray-900" 
			placeholder="Enter your password"
		/>
		<button 
			type="submit" 
			class="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		>
			Submit
		</button>
	</form>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
	}
	form {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	label {
		margin-bottom: 0.5rem;
	}
	input {
		padding: 0.5rem;
		margin-bottom: 1rem;
	}
	button {
		padding: 0.5rem 1rem;
	}
</style>
