<script lang="ts">
	import { func1 } from "./utils";
	import { onMount } from "svelte";
	import { parseCVATXML } from "./parse";
	import { Stage, Layer, Line, Circle, Image, Group } from "svelte-konva";
	let points: number[] = []; // Array of points for the current polygon
	let allPolygons: number[][][] = [];
	let imagePaths: string[] = [];

	type CanvasImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

	type ImageData = {
		src: string;
		imgObj: CanvasImageSource | undefined;
		polygons: number[][];
		scale: number;
		width: number;
		height: number;
		convertedPolygons: number[][];
		changed: boolean;
	};

	let images: ImageData[] = [];
	let currentImage: ImageData | undefined = undefined;
	const MAX_HEIGHT_SMALL = 250;
	const MAX_WIDTH_SMALL = 250;
	const MAX_HEIGHT_LARGE = 400;
	const MAX_WIDTH_LARGE = 400;
	let doneLoading = false;

	// converting the points to coordinates relative to the image
	const convertPointsToImageCoordinates = (
		points: number[],
		image_info: ImageData | undefined,
		maxWidth: number,
		maxHeight: number
	): number[] => {
		if (!image_info) return [];
		console.log(image_info?.width, image_info?.height, image_info?.scale);
		const newPoints = points.map((point, i) => {
			if (i % 2 === 0) return (maxWidth - image_info?.width) / 2 + point * image_info.scale;
			else return (maxHeight - image_info?.height) / 2 + point * image_info.scale;
		});
		return newPoints;
	};

	// Example usage:
	const getPolygonPoints = async () => {
		const { allPolygonsPoints, allImagePaths } = await parseCVATXML("/ecole/annotations/bowl.xml");
		// Complete the image paths
		imagePaths = allImagePaths.map((path) => `/ecole/images/${path}`);

		// Create the images
		images = allImagePaths.map((path, i) => ({
			src: path,
			imgObj: undefined,
			polygons: allPolygonsPoints[i],
			convertedPolygons: [],
			scale: 1,
			width: 0,
			height: 0,
		}));
	};

	onMount(async () => {
		const load = async () => {
			await getPolygonPoints();
			loadImages();
		};
		await load();
	});

	function getRatio(maxWidth: number, maxHeight: number, width: number, height: number) {
		const ratio = Math.min(maxWidth / width, maxHeight / height);
		// console.log(maxWidth, maxHeight, width, height, ratio);
		return ratio;
	}

	async function loadImages() {
		// Load all the images from the database
		console.log("Loading image");

		const loadPromises = images.map((obj) => {
			return new Promise<void>((resolve) => {
				const img = new window.Image();
				img.src = `/ecole/images/bowl/${obj.src}`;
				img.onload = () => {
					obj.imgObj = img;
					obj.scale = getRatio(MAX_WIDTH_SMALL, MAX_HEIGHT_SMALL, img.width, img.height);
					obj.width = img.width * obj.scale;
					obj.height = img.height * obj.scale;
					obj.convertedPolygons = obj.polygons.map((polygon) =>
						convertPointsToImageCoordinates(polygon, obj, MAX_WIDTH_SMALL, MAX_HEIGHT_SMALL)
					);
					resolve(); // Resolve the promise when the image is loaded
				};
			});
		});

		await Promise.all(loadPromises); // Wait for all images to load
		doneLoading = true;
	}

	function handleClick(image_info: ImageData) {
		currentImage = undefined;
		// const pointerPos = event?.detail?.target?.pointerPos;
		// if (pointerPos) {
		// 	points = [...points, Math.round(pointerPos.x), Math.round(pointerPos.y)];
		// }
		const currentImageTemp = {
			...JSON.parse(JSON.stringify(image_info)),
			polygons: image_info.polygons.map((polygon) => [...polygon]),
			convertedPolygons: [],
		};
		console.log(currentImageTemp.polygons);
		const img = new window.Image();
		img.src = `/ecole/images/bowl/${image_info.src}`;
		img.onload = () => {
			if (!currentImageTemp) return;
			currentImageTemp.imgObj = img;
			currentImageTemp.scale = getRatio(MAX_WIDTH_LARGE, MAX_HEIGHT_LARGE, img.width, img.height);
			if (currentImageTemp.imgObj) {
				currentImageTemp.width = currentImageTemp.imgObj.width * currentImageTemp.scale;
				currentImageTemp.height = currentImageTemp.imgObj.height * currentImageTemp.scale;
				console.log(currentImageTemp.scale, currentImageTemp.width, currentImageTemp.height);
				currentImageTemp.convertedPolygons = currentImageTemp.polygons.map((polygon) =>
					convertPointsToImageCoordinates(
						polygon,
						currentImageTemp,
						MAX_WIDTH_LARGE,
						MAX_HEIGHT_LARGE
					)
				);
				currentImage = currentImageTemp;
			}
		};
	}

	// function completePolygon() {
	// 	console.log(points);
	// 	if (points.length >= 6) {
	// 		polygons = [...polygons, points];
	// 		points = [];
	// 	}
	// }

	// function clearPolygons() {
	// 	points = [];
	// 	polygons = [];
	// }

	// function handleFileChange(event) {
	// 	const file = event.target.files[0];
	// 	const reader = new FileReader();
	// 	reader.onload = (e) => {
	// 		const img = new window.Image();
	// 		img.src = (e.target?.result as string) || "";
	// 		img.onload = () => {
	// 			imageObj = img;
	// 		};
	// 	};
	// 	reader.readAsDataURL(file);
	// }

	function handleDragMove(index, event) {
		const x = Math.round(event.detail.currentTarget.attrs.x);
		const y = Math.round(event.detail.currentTarget.attrs.y);
		console.log(x, y);
		points[index] = x;
		points[index + 1] = y;
	}

	function handleDragMoveCompletePolygon(currentImage, polygonIndex, index, event) {
		const x = Math.round(event.detail.currentTarget.attrs.x);
		const y = Math.round(event.detail.currentTarget.attrs.y);
		console.log(
			`before ${currentImage.convertedPolygons[polygonIndex][index]}, ${
				currentImage.convertedPolygons[polygonIndex][index + 1]
			}`
		);
		console.log(`after ${x} ${y}`);
		currentImage.convertedPolygons[polygonIndex][index] = x;
		currentImage.convertedPolygons[polygonIndex][index + 1] = y;
		currentImage.changed = true;
	}
</script>

<div class="flex-start flex h-full flex-col gap-[5px]">
	<div class="top-section">
		<h1 class="text-[2rem]">Annotations</h1>
		<!-- <div class="flex flex-row gap-[5px]">
			<div class="file-upload">
				<input type="file" accept="image/*" on:change={handleFileChange} />
			</div>
			<button class="rounded border-[1px] border-black px-[5px]" on:click={completePolygon}
				>Complete Polygon</button
			>
			<button class="rounded border-[1px] border-black px-[5px]" on:click={clearPolygons}
				>Clear Polygons</button
			>
		</div> -->
	</div>
	<div class="flex w-full grow flex-row gap-[30px]">
		<div class="h-[80vh] w-1/2 overflow-y-auto">
			<div class="grid grid-cols-2 gap-[5px]">
				{#if doneLoading}
					{#each images as image_info}
						<div class="flex flex-1 items-center justify-center" role="button" tabindex="-1">
							<Stage
								class="inline-block border-[1px] border-black"
								config={{ width: MAX_HEIGHT_SMALL, height: MAX_WIDTH_SMALL }}
								on:click={() => handleClick(image_info)}
							>
								<Layer>
									{#if image_info.imgObj}
										<Image
											config={{
												image: image_info.imgObj,
												x: (MAX_WIDTH_SMALL - image_info.width) / 2,
												y: (MAX_HEIGHT_SMALL - image_info.height) / 2,
												width: image_info.width,
												height: image_info.height,
												listening: false,
											}}
										/>
										{#each image_info.convertedPolygons as polygon, i0}
											<Group>
												<Line
													config={{
														points: polygon,
														stroke: "red",
														strokeWidth: 2,
														closed: true,
														lineJoint: "round",
														fill: "rgba(255, 0, 0, 0.2)",
														hitStrokeWidth: 0,
													}}
												/>
												<!-- {#each polygon as point, i1}
													{#if i1 % 2 === 0}
														<Circle
															config={{
																x: point,
																y: polygon[i1 + 1],
																fill: "green",
																radius: 5,
																draggable: true,
															}}
															on:dragmove={(event) => handleDragMoveCompletePolygon(i0, i1, event)}
														/>
													{/if}
												{/each} -->
											</Group>
										{/each}
									{/if}
								</Layer>
							</Stage>
						</div>
					{/each}
				{/if}
			</div>
		</div>
		<div class="h-2/3 w-1/2 border-[1px] border-black">
			{#if currentImage}
				<div class="flex items-center justify-center" role="button" tabindex="-1">
					<Stage
						class="inline-block border-[1px] border-black"
						config={{ width: MAX_WIDTH_LARGE, height: MAX_HEIGHT_LARGE }}
					>
						<Layer>
							{#if currentImage.imgObj}
								<Image
									config={{
										image: currentImage.imgObj,
										x: (MAX_WIDTH_LARGE - currentImage.width) / 2,
										y: (MAX_HEIGHT_LARGE - currentImage.height) / 2,
										width: currentImage.width,
										height: currentImage.height,
										listening: false,
									}}
								/>
								{#each currentImage.convertedPolygons as polygon, i0}
									<Group
										config={{
											draggable: true,
										}}
									>
										<Line
											config={{
												points: polygon,
												stroke: "red",
												strokeWidth: 2,
												closed: true,
												lineJoint: "round",
												fill: "rgba(255, 0, 0, 0.2)",
												hitStrokeWidth: 0,
											}}
										/>
										{#each polygon as point, i1}
											{#if i1 % 2 === 0}
												<Circle
													config={{
														x: point,
														y: polygon[i1 + 1],
														fill: "green",
														radius: 5,
														draggable: true,
													}}
													on:dragmove={(event) =>
														handleDragMoveCompletePolygon(currentImage, i0, i1, event)}
												/>
											{/if}
										{/each}
									</Group>
								{/each}
							{/if}
						</Layer>
					</Stage>
				</div>
			{/if}
		</div>
	</div>
</div>
