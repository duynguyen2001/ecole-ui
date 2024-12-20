<script lang="ts">
	import { onMount } from "svelte";
	import { parseCVATXML, updateCVATXML } from "./parse";
	import { Stage, Layer, Line, Circle, Image, Group, Text, Rect } from "svelte-konva";
	import { snapshots, images, addSnapshot, actionSaveNewPolyonAdded } from "./actions";
	import Icon from "@iconify/svelte";
	import type {
		LabelInfo,
		ImageInfo,
		PolygonInfo,
		ImageData,
		labelAbsolutePosition,
	} from "./types";
	import LayersCol from "./LayersCol.svelte";
	import AnnotationTools from "./AnnotationTools.svelte";
	import { clearAll, isLocked, isVisible, setUpLockState, setUpVisibility } from "./store";
	import { get } from "svelte/store";

	import {
		convertOriginalPointsToStageCoordinates,
		getLabelPosition,
		getLabelPositionIndexes,
		getRatio,
		validatePolygonPoints,
		addTransparency,
		convertStageCoordinatePointsToOriginal,
	} from "./utils";

	import {
		MAX_WIDTH_LARGE,
		MAX_HEIGHT_LARGE,
		MAX_WIDTH_SMALL,
		MAX_HEIGHT_SMALL,
	} from "./constants";

	let originLabelsInfo = new Map<string, LabelInfo>();
	let currentImageIndex: number = -1;
	let currentLayer: number = -1;
	let currentLayerFocused = false;
	let doneLoading = false;

	let currentImage: ImageData | undefined = undefined;
	let labelPositions: labelAbsolutePosition[] = [];
	let labelsInfo: Map<string, LabelInfo> = new Map();
	let imageElements: ImageInfo[] = [];

	// for current annotation
	let ant_modeOn = false;
	let ant_newPoints: number[] = [];
	let ant_currentLabel: string = "";
	let ant_saving = false;

	// Example usage:
	const getPolygonPoints = async () => {
		const result = await parseCVATXML("/ecole/annotations/bowl.xml");
		if (!result) return;
		originLabelsInfo = result.labelsMap;
		labelsInfo = new Map(originLabelsInfo);
		imageElements = result.imageElements;
		const tempImages: ImageData[] = imageElements.map((obj) => ({
			origin: obj,
			imgObj: undefined,
			convertedPolygons: [],
			scale: 1,
			scaledWidth: 0,
			scaledHeight: 0,
			changed: false,
			coorsInfo: getLabelPositionIndexes(
				obj.polygonPoints.map((polygon) => polygon.points),
				obj.width,
				obj.height
			),
		}));
		images.update(() => tempImages);
	};

	onMount(() => {
		const load = async () => {
			await getPolygonPoints();
			loadImages();
		};
		load();

		// back button handler
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key === "z") {
				event.preventDefault(); // Prevent default undo behavior
				console.log("Control + Z pressed!", get(snapshots).length);
				if (get(snapshots).length > 1 && currentImageIndex !== -1) {
					// update snapshots
					snapshots.update((prev) => {
						const newSnapshots = [...prev];
						newSnapshots.pop();
						return newSnapshots;
					});
					images.update(() => get(snapshots)[get(snapshots).length - 1]);
					handleClick(get(images)[currentImageIndex]);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		// Cleanup event listener when the component is destroyed
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	});

	async function loadImages() {
		// Load all the images from the database
		console.log("Loading image");

		const loadPromises = get(images).map((obj) => {
			return new Promise<void>((resolve) => {
				const img = new window.Image();
				img.src = `/ecole/images/bowl/${obj.origin.imagePath}`;
				img.onload = () => {
					obj.imgObj = img;
					obj.scale = getRatio(MAX_WIDTH_SMALL, MAX_HEIGHT_SMALL, img.width, img.height);
					obj.scaledWidth = img.width * obj.scale;
					obj.scaledHeight = img.height * obj.scale;
					obj.convertedPolygons = obj.origin.polygonPoints.map((polygon) =>
						convertOriginalPointsToStageCoordinates(
							polygon.points,
							obj.scale,
							img.width,
							img.height,
							MAX_WIDTH_SMALL,
							MAX_HEIGHT_SMALL
						)
					);
					resolve(); // Resolve the promise when the image is loaded
				};
			});
		});

		await Promise.all(loadPromises); // Wait for all images to load
		addSnapshot(get(images));
		doneLoading = true;
	}

	$: if (currentImage) {
		labelPositions = getLabelPosition(
			{ width: currentImage.scaledWidth, height: currentImage.scaledHeight },
			[MAX_WIDTH_LARGE, MAX_HEIGHT_LARGE],
			currentImage,
			10,
			0.3,
			12
		);
	}

	function handleClick(image_info: ImageData) {
		currentImageIndex = image_info.origin.id;
		currentLayer = -1;

		currentImage = undefined;
		const currentImageTemp = {
			...JSON.parse(JSON.stringify(image_info)),
			convertedPolygons: [],
		};
		const img = new window.Image();
		img.src = `/ecole/images/bowl/${image_info.origin.imagePath}`;
		img.onload = () => {
			if (!currentImageTemp) return;
			currentImageTemp.imgObj = img;
			currentImageTemp.scale = getRatio(
				MAX_WIDTH_LARGE * (2 / 3),
				MAX_HEIGHT_LARGE * (2 / 3),
				img.width,
				img.height
			);

			if (currentImageTemp.imgObj) {
				currentImageTemp.scaledWidth = currentImageTemp.imgObj.width * currentImageTemp.scale;
				currentImageTemp.scaledHeight = currentImageTemp.imgObj.height * currentImageTemp.scale;
				currentImageTemp.convertedPolygons = currentImageTemp.origin.polygonPoints.map(
					(polygon: PolygonInfo) =>
						convertOriginalPointsToStageCoordinates(
							polygon.points,
							currentImageTemp.scale,
							currentImageTemp.origin.width,
							currentImageTemp.origin.height,
							MAX_WIDTH_LARGE,
							MAX_HEIGHT_LARGE
						)
				);
				currentImage = currentImageTemp;
			}

			// set up states for lock and visibility
			clearAll();
			setUpLockState(currentImageTemp.origin.polygonPoints.length);
			setUpVisibility(currentImageTemp.origin.polygonPoints.length);
		};
	}

	function handleDragMoveCompletePolygon(polygonIndex: number, index: number, event: CustomEvent) {
		const curGroup = event.detail.currentTarget;

		if (!currentImage) return;
		const x = Math.round(event.detail.target.getStage().getPointerPosition().x);
		const y = Math.round(event.detail.target.getStage().getPointerPosition().y);

		// calculate bounds
		const firstPoint = convertOriginalPointsToStageCoordinates(
			[0, 0],
			currentImage.scale,
			currentImage.origin.width,
			currentImage.origin.height,
			MAX_WIDTH_LARGE,
			MAX_HEIGHT_LARGE
		);

		const lastPoint = convertOriginalPointsToStageCoordinates(
			[currentImage.origin.width, currentImage.origin.height],
			currentImage.scale,
			currentImage.origin.width,
			currentImage.origin.height,
			MAX_WIDTH_LARGE,
			MAX_HEIGHT_LARGE
		);

		console.log(
			"last ",
			currentImage.convertedPolygons[polygonIndex][index],
			currentImage.convertedPolygons[polygonIndex][index + 1]
		);

		// check if the point is within the image
		if (x < firstPoint[0] || x > lastPoint[0] || y < firstPoint[1] || y > lastPoint[1]) {
			console.log("invalid points");
			// the difference between the current point and the bound points relateive to the stage coordinate
			const diffX = x < firstPoint[0] ? x - firstPoint[0] : x > lastPoint[0] ? x - lastPoint[0] : 0;
			const diffY = y < firstPoint[1] ? y - firstPoint[1] : y > lastPoint[1] ? y - lastPoint[1] : 0;
			curGroup.x(curGroup.x() - diffX);
			curGroup.y(curGroup.y() - diffY);
			currentImage.convertedPolygons[polygonIndex][index] =
				x < firstPoint[0] ? firstPoint[0] : x > lastPoint[0] ? lastPoint[0] : x;
			currentImage.convertedPolygons[polygonIndex][index + 1] =
				y < firstPoint[1] ? firstPoint[1] : y > lastPoint[1] ? lastPoint[1] : y;
		} else {
			currentImage.convertedPolygons[polygonIndex][index] = x;
			currentImage.convertedPolygons[polygonIndex][index + 1] = y;
		}

		console.log(
			"current ",
			currentImage.convertedPolygons[polygonIndex][index],
			currentImage.convertedPolygons[polygonIndex][index + 1]
		);
	}

	function saveChanges() {
		console.log("save changes");
		updateCVATXML("/ecole/annotations/bowl.xml", labelsInfo, get(images));
	}

	function handleAnnotate(
		event: CustomEvent,
		currentImage: ImageData | undefined,
		MAX_WIDTH_LARGE: number,
		MAX_HEIGHT_LARGE: number
	) {
		if (!currentImage) return;
		const x = Math.round(event.detail.target.getStage().getPointerPosition().x);
		const y = Math.round(event.detail.target.getStage().getPointerPosition().y);
		console.log(x, y);

		// check if the point is within the image
		if (
			!validatePolygonPoints(
				[x, y],
				currentImage.scale,
				currentImage.origin.width,
				currentImage.origin.height,
				MAX_WIDTH_LARGE,
				MAX_HEIGHT_LARGE
			)
		) {
			console.log("invalid points");
			return;
		}

		ant_newPoints = [...ant_newPoints, x, y];
	}

	// handle the saving of the new polygon annotation
	$: if (ant_saving) {
		if (ant_newPoints.length > 4) {
			const newImageData = actionSaveNewPolyonAdded(
				ant_newPoints,
				currentImage,
				MAX_WIDTH_LARGE,
				MAX_HEIGHT_LARGE,
				ant_currentLabel
			);

			// update currentImage
			if (newImageData) handleClick(newImageData);
		}
		ant_newPoints = [];
		ant_saving = false;
		ant_modeOn = false;
	}

	const actionSaveAnnotationChanges = (
		event: CustomEvent,
		polygonIndex: number,
		index: number,
		MAX_WIDTH_LARGE: number,
		MAX_HEIGHT_LARGE: number,
		MAX_WIDTH_SMALL: number,
		MAX_HEIGHT_SMALL: number
	) => {
		if (!currentImage) return;

		const x = currentImage.convertedPolygons[polygonIndex][index];
		const y = currentImage.convertedPolygons[polygonIndex][index + 1];

		// convert the points to the original coordinates
		const originalPoints = convertStageCoordinatePointsToOriginal(
			[x, y],
			currentImage.scale,
			currentImage.origin.width,
			currentImage.origin.height,
			MAX_WIDTH_LARGE,
			MAX_HEIGHT_LARGE
		);

		// Update points in the current snapshot
		if (!currentImage) return;
		const currentImageId = currentImage.origin.id;
		if (currentImageId === undefined) return;

		// Try to utilize copy as reference to save the memory, only deepy copy at the root of changes
		// create copy of polygonPoints
		const originCurrentImage = get(images)[currentImageId];
		const newPolygonPoints = [...originCurrentImage.origin.polygonPoints];
		// deep copy of the points
		newPolygonPoints[polygonIndex] = {
			...newPolygonPoints[polygonIndex],
			points: [
				...newPolygonPoints[polygonIndex].points.slice(0, index),
				originalPoints[0],
				originalPoints[1],
				...newPolygonPoints[polygonIndex].points.slice(index + 2),
			],
		};
		newPolygonPoints[polygonIndex].status = "changed";

		// create copy of origin
		const newOrigin = { ...originCurrentImage.origin };
		newOrigin.polygonPoints = newPolygonPoints;

		// create copy of ImageData
		const newImageData = { ...originCurrentImage };
		newImageData.origin = newOrigin;

		// create copy of images
		const newSnapshot = [...get(images)];
		newSnapshot[currentImageId] = newImageData;

		// update the convertedPolygons
		const newConvertedPolygons = newImageData.convertedPolygons.slice();
		newConvertedPolygons[polygonIndex] = convertOriginalPointsToStageCoordinates(
			newPolygonPoints[polygonIndex].points,
			get(images)[currentImageId].scale,
			newImageData.origin.width,
			newImageData.origin.height,
			MAX_WIDTH_SMALL,
			MAX_HEIGHT_SMALL
		);

		newImageData.convertedPolygons = newConvertedPolygons;
		console.log(
			"end",
			currentImage.convertedPolygons[polygonIndex][index],
			currentImage.convertedPolygons[polygonIndex][index + 1]
		);

		addSnapshot(newSnapshot);

		// update currentImage
		// currentImage.origin.polygonPoints = newPolygonPoints;

		// console.log(get(currentImage)?.convertedPolygons[polygonIndex][index]);
	};
</script>

<div class="flex-start flex h-full flex-col gap-[5px]">
	<!-- <div class="top-section">
		<h1 class="text-[2rem]">Annotations</h1>
		<div class="flex flex-row gap-[5px]">
			<div class="file-upload">
				<input type="file" accept="image/*" on:change={handleFileChange} />
			</div>
			<button class="rounded border-[1px] border-black px-[5px]" on:click={completePolygon}
				>Complete Polygon</button
			>`
			<button class="rounded border-[1px] border-black px-[5px]" on:click={clearPolygons}
				>Clear Polygons</button
			>
		</div>
	</div> -->
	<div class="flex h-full w-full grow flex-row gap-[30px]">
		<div class="relative h-[90vh]">
			<div class="h-full overflow-y-auto">
				<div class="grid grid-cols-2 gap-[5px]">
					{#if doneLoading && labelsInfo}
						{#each $images as image_info}
							<div
								class=" mx-[4px] mt-[4px] flex flex-1 items-center justify-center"
								role="button"
								tabindex="-1"
							>
								<div
									class=" focus:outline-none focus:ring-2 focus:ring-black"
									tabindex="0"
									role="button"
								>
									<Stage
										class="border-[1px] border-black"
										config={{ width: MAX_HEIGHT_SMALL, height: MAX_WIDTH_SMALL }}
										on:click={() => handleClick(image_info)}
									>
										<Layer>
											{#if image_info.imgObj}
												<Image
													config={{
														image: image_info.imgObj,
														x: (MAX_WIDTH_SMALL - image_info.scaledWidth) / 2,
														y: (MAX_HEIGHT_SMALL - image_info.scaledHeight) / 2,
														width: image_info.scaledWidth,
														height: image_info.scaledHeight,
														listening: false,
													}}
												/>
												{#each image_info.convertedPolygons as polygon, i0}
													{#if image_info.origin.polygonPoints[i0].status !== "deleted"}
														<Group>
															<Line
																config={{
																	points: polygon,
																	stroke: labelsInfo?.get(image_info.origin.polygonPoints[i0].label)
																		?.color,
																	strokeWidth: 2,
																	closed: true,
																	lineJoint: "round",
																	fill: addTransparency(
																		labelsInfo?.get(image_info.origin.polygonPoints[i0].label)
																			?.color,
																		0.5
																	),
																	hitStrokeWidth: 0,
																}}
															/>
														</Group>
													{/if}
												{/each}
											{/if}
										</Layer>
									</Stage>
								</div>
							</div>
						{/each}
					{/if}
				</div>
				<button on:click={() => saveChanges()}>
					<Icon
						class="absolute right-[-50px] top-0 z-[1000]"
						icon="mdi:content-save-edit"
						width="35"
						height="35"
						color="#333333"
						role="button"
					/>
				</button>
			</div>
		</div>
		<div class="justify-top relative flex h-full w-[60%] flex-col items-center">
			<AnnotationTools {labelsInfo} bind:ant_modeOn bind:ant_currentLabel bind:ant_saving />
			{#if currentImage}
				<div class="flex items-center justify-center" role="button" tabindex="-1">
					<Stage
						class="inline-block"
						config={{ width: MAX_WIDTH_LARGE, height: MAX_HEIGHT_LARGE }}
						on:click={(e) => {
							console.log(e);
							ant_modeOn && handleAnnotate(e, currentImage, MAX_WIDTH_LARGE, MAX_HEIGHT_LARGE);
						}}
					>
						{#if currentImage.imgObj}
							<Layer>
								<Image
									config={{
										image: currentImage.imgObj,
										x: (MAX_WIDTH_LARGE - currentImage.scaledWidth) / 2,
										y: (MAX_HEIGHT_LARGE - currentImage.scaledHeight) / 2,
										width: currentImage.scaledWidth,
										height: currentImage.scaledHeight,
										listening: false,
									}}
								/>
							</Layer>
							<Layer>
								{#each currentImage.convertedPolygons as polygon, i0}
									{#if currentImage.origin.polygonPoints[i0].status !== "deleted"}
										{#if $isVisible[i0]}
											<Group
												config={{ listening: !ant_modeOn }}
												on:dblclick={(event) => {
													event.detail.currentTarget.moveToBottom();
												}}
												on:mouseenter={() => (currentLayer = i0)}
												on:mouseleave={() => {
													currentLayer = -1;
													currentLayerFocused = false;
												}}
												on:click={() => {
													currentLayerFocused = true;
												}}
											>
												<Line
													config={{
														points: polygon,
														stroke: labelsInfo?.get(currentImage.origin.polygonPoints[i0].label)
															?.color,
														strokeWidth: 2,
														closed: true,
														lineJoint: "round",
														fill: addTransparency(
															labelsInfo?.get(currentImage.origin.polygonPoints[i0].label)?.color,
															currentLayer === i0 ? 0.7 : 0
														),
														hitStrokeWidth: 0,
													}}
												/>
												{#if !ant_modeOn}
													{#each polygon as point, i1}
														{#if i1 % 2 === 0}
															<Group
																config={{
																	x: currentImage.convertedPolygons[i0][i1],
																	y: currentImage.convertedPolygons[i0][i1 + 1],
																	draggable: true,
																}}
																on:dragmove={(event) => {
																	handleDragMoveCompletePolygon(i0, i1, event);
																}}
																on:dragend={(event) => {
																	actionSaveAnnotationChanges(
																		event,
																		i0,
																		i1,
																		MAX_WIDTH_LARGE,
																		MAX_HEIGHT_LARGE,
																		MAX_WIDTH_SMALL,
																		MAX_HEIGHT_SMALL
																	);
																}}
															>
																{#if !$isLocked[i0]}
																	<Circle
																		config={{
																			fill: labelsInfo?.get(
																				currentImage.origin.polygonPoints[i0].label
																			)?.color,
																			radius: 4,
																			stroke: "black",
																			strokeWidth: 1,
																		}}
																	/>
																{/if}
																{#if labelPositions[i0].pointIndex === i1}
																	<Line
																		config={{
																			points: [
																				0,
																				0,
																				labelPositions[i0].endPos[0] -
																					currentImage.convertedPolygons[i0][i1],
																				labelPositions[i0].endPos[1] -
																					currentImage.convertedPolygons[i0][i1 + 1],
																			],
																			stroke: labelsInfo?.get(
																				currentImage.origin.polygonPoints[i0].label
																			)?.color,
																			strokeWidth: 2,
																		}}
																	/>
																	<Group
																		config={{
																			x: labelPositions[i0].textPos[0],
																			y: labelPositions[i0].textPos[1],
																			draggable: true,
																		}}
																		on:dragmove={(event) => {
																			event.preventDefault();

																			// Update the label position
																			const labelX = event.detail.target.x();
																			const labelY = event.detail.target.y();

																			// Move the label to the new position
																			labelPositions[i0].textPos = [labelX, labelY];

																			// Update only the end of the line connected to the label
																			labelPositions[i0].endPos = [labelX, labelY];
																		}}
																	>
																		<Rect
																			config={{
																				width:
																					currentImage.origin.polygonPoints[i0].label.length * 6 +
																					10,
																				height: 16,
																				fill: "white",
																				stroke: labelsInfo?.get(
																					currentImage.origin.polygonPoints[i0].label
																				)?.color,
																				strokeWidth: 2,
																			}}
																		/>
																		<Text
																			config={{
																				text: currentImage.origin.polygonPoints[i0].label,
																				width:
																					currentImage.origin.polygonPoints[i0].label.length * 6 +
																					10,
																				align: "center",
																				y: 16 / 2 - 12 / 2,
																				fontSize: 12,
																				fill: "black",
																			}}
																		/>
																	</Group>
																{/if}
															</Group>
														{/if}
													{/each}
												{/if}
											</Group>
										{/if}
									{/if}
								{/each}
								{#if ant_modeOn && ant_newPoints.length > 0}
									<Group>
										<Line
											config={{
												points: ant_newPoints,
												stroke: labelsInfo?.get(ant_currentLabel)?.color,
												strokeWidth: 2,
												closed: false,
												lineJoint: "round",
												fill: addTransparency(labelsInfo?.get("bowl")?.color, 0.5),
												hitStrokeWidth: 0,
											}}
										/>
										{#each ant_newPoints as point, i1}
											{#if i1 % 2 === 0}
												<Circle
													config={{
														x: ant_newPoints[i1],
														y: ant_newPoints[i1 + 1],
														fill: labelsInfo?.get(ant_currentLabel)?.color,
														radius: 4,
														stroke: "black",
														strokeWidth: 1,
													}}
												/>
											{/if}
										{/each}
									</Group>
								{/if}
							</Layer>
						{/if}
					</Stage>
				</div>
			{/if}
		</div>
		<div class="flex-1 border-[1px] border-black">
			<LayersCol bind:currentImage bind:labelsInfo bind:currentLayer bind:currentLayerFocused />
		</div>
	</div>
</div>

<style>
</style>
