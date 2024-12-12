<script lang="ts">
	import { onMount } from "svelte";
	import { parseCVATXML, updateCVATXML } from "./parse";
	import { Stage, Layer, Line, Circle, Image, Group, Text, Rect } from "svelte-konva";
	import { snapshots, images } from "./actions";
	import Icon from "@iconify/svelte";
	import type {
		LabelInfo,
		ImageInfo,
		PolygonInfo,
		ImageData,
		edgePointsOfPolygon,
		labelPosition,
		labelAbsolutePosition,
	} from "./types";
	import LayersCol from "./LayersCol.svelte";
	import AnnotationTools from "./AnnotationTools.svelte";
	import { clearAll, isLocked, isVisible, setUpLockState, setUpVisibility } from "./store";

	let points: number[] = []; // Array of points for the current polygon

	const addTransparency = (hex: string | undefined, opacity: number) => {
		if (!hex) return `rgba(0, 0, 0, 0)`;
		return `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(
			hex.slice(5, 7),
			16
		)}, ${opacity})`;
	};

	let originLabelsInfo = new Map<string, LabelInfo>();
	let currentImage: ImageData | undefined = undefined;
	let currentImageIndex: number = -1;
	let currentLayer: number = -1;
	let currentLayerFocused = false;
	const MAX_HEIGHT_SMALL = 100;
	const MAX_WIDTH_SMALL = 100;
	const MAX_HEIGHT_LARGE = 600;
	const MAX_WIDTH_LARGE = 600;
	let doneLoading = false;

	let labelPositions: labelAbsolutePosition[] = [];

	let labelsInfo: Map<string, LabelInfo> = new Map();
	let imageElements: ImageInfo[] = [];

	// for current annotation
	let ant_modeOn = false;
	let ant_newPoints: number[] = [];
	let ant_currentLabel: string = "";
	let ant_saving = false;

	const getLabelPosition = (
		imageObjSize: { width: number; height: number },
		frameDimension: number[],
		imageObj: ImageData | undefined,
		inclinePixel: number,
		distanceRatio: number,
		fontSize: number
	): labelAbsolutePosition[] => {
		const finalPositions: labelAbsolutePosition[] = [];
		const middlePoint = [frameDimension[0] / 2, frameDimension[1] / 2];
		const convertedPointPolygons = imageObj?.convertedPolygons;
		const polygonsInfo = imageObj?.origin.polygonPoints;
		if (!convertedPointPolygons || !polygonsInfo) return [];
		const posInfo = imageObj?.coorsInfo;

		// calculate the position of the image edges
		const imageEdges = {
			left: (frameDimension[0] - imageObjSize.width) / 2,
			right: (frameDimension[0] + imageObjSize.width) / 2,
			top: (frameDimension[1] - imageObjSize.height) / 2,
			bottom: (frameDimension[1] + imageObjSize.height) / 2,
		};

		for (let i = 0; i < posInfo.length; i++) {
			const index = posInfo[i].index;
			const pos = posInfo[i].pos;
			const points = convertedPointPolygons ? convertedPointPolygons[i] : [];
			const label = polygonsInfo ? polygonsInfo[i].label : "";
			const distanceToMiddle = getDistanceBetweenPoints(
				points[index],
				points[index + 1],
				middlePoint[0],
				middlePoint[1]
			);
			if (pos === "top-left") {
				const temp = {
					pointIndex: index,
					endPos: [points[index] - inclinePixel, imageEdges.top - distanceRatio * distanceToMiddle],
					textPos: [
						points[index] - inclinePixel - (label.length * 6) / 2,
						imageEdges.top - distanceRatio * distanceToMiddle - fontSize * 1.1,
					],
				};
				finalPositions.push(temp);
			} else if (pos === "top-right") {
				const temp = {
					pointIndex: index,
					endPos: [points[index] + inclinePixel, imageEdges.top - distanceRatio * distanceToMiddle],
					textPos: [
						points[index] + inclinePixel - (label.length * 6) / 2,
						imageEdges.top - distanceRatio * distanceToMiddle - (fontSize * 1.1) / 2,
					],
				};
				finalPositions.push(temp);
			} else if (pos === "bottom-left") {
				const temp = {
					pointIndex: index,
					endPos: [
						points[index] - inclinePixel,
						imageEdges.bottom + distanceRatio * distanceToMiddle,
					],
					textPos: [
						points[index] - inclinePixel - (label.length * 6) / 2,
						imageEdges.bottom + distanceRatio * distanceToMiddle,
					],
				};
				finalPositions.push(temp);
			} else if (pos === "bottom-right") {
				const temp = {
					pointIndex: index,
					endPos: [
						points[index] + inclinePixel,
						imageEdges.bottom + distanceRatio * distanceToMiddle,
					],
					textPos: [
						points[index] + inclinePixel - (label.length * 6) / 2,
						imageEdges.bottom + distanceRatio * distanceToMiddle,
					],
				};
				finalPositions.push(temp);
			} else if (pos === "left") {
				const temp = {
					pointIndex: index,
					endPos: [
						imageEdges.left - distanceRatio * distanceToMiddle,
						points[index + 1] - inclinePixel,
					],
					textPos: [
						imageEdges.left - distanceRatio * distanceToMiddle - (label.length * 6) / 2,
						points[index + 1] - inclinePixel - (fontSize * 1.1) / 2,
					],
				};
				finalPositions.push(temp);
			} else {
				const temp = {
					pointIndex: index,
					endPos: [
						imageEdges.right + distanceRatio * distanceToMiddle,
						points[index + 1] - inclinePixel,
					],
					textPos: [
						imageEdges.right + distanceRatio * distanceToMiddle - (label.length * 6) / 2,
						points[index + 1] - inclinePixel - (fontSize * 1.1) / 2,
					],
				};
				finalPositions.push(temp);
			}
		}

		return finalPositions;
	};

	const getEdgePointsIndicesOfPolygon = (points: number[]): edgePointsOfPolygon => {
		let left = Infinity;
		let top = Infinity;
		let right = -Infinity;
		let bottom = -Infinity;

		let leftIndex = -1;
		let topIndex = -1;
		let rightIndex = -1;
		let bottomIndex = -1;

		for (let i = 0; i < points.length; i += 2) {
			// Check for min x
			if (points[i] < left) {
				left = points[i];
				leftIndex = i;
			}
			// Check for min y
			if (points[i + 1] < top) {
				top = points[i + 1];
				topIndex = i;
			}
			// Check for max x
			if (points[i] > right) {
				right = points[i];
				rightIndex = i;
			}
			// Check for max y
			if (points[i + 1] > bottom) {
				bottom = points[i + 1];
				bottomIndex = i;
			}
		}

		return { topIndex, bottomIndex, leftIndex, rightIndex };
	};

	const getMiddlePointOfPolygon = (
		indexCoords: edgePointsOfPolygon,
		polygon: number[]
	): number[] => {
		return [
			(polygon[indexCoords.leftIndex] + polygon[indexCoords.rightIndex]) / 2,
			(polygon[indexCoords.topIndex + 1] + polygon[indexCoords.bottomIndex + 1]) / 2,
		];
	};

	// split the height frame into 3 parts; first part is the top, second part is the middle, and the third part is the bottom
	const getLabelRelativePositions = (
		heightImg: number,
		widthImg: number,
		middlePoint: number[]
	): labelPosition => {
		if (middlePoint[1] < heightImg / 3) {
			if (middlePoint[0] < widthImg / 2) return "top-left";
			else return "top-right";
		} else if (middlePoint[1] >= heightImg * (2 / 3)) {
			if (middlePoint[0] < widthImg / 2) return "bottom-left";
			else return "bottom-right";
		} else {
			if (middlePoint[0] < widthImg / 2) return "left";
			else return "right";
		}
	};

	// return indexes of the point where the label should be placed for polygons
	const getLabelPositionIndexes = (
		polygons: number[][],
		widthImg: number,
		heightImg: number
	): { index: number; pos: string }[] => {
		const finalPositions: { index: number; pos: string }[] = [];
		for (let i = 0; i < polygons.length; i++) {
			const edgePoints = getEdgePointsIndicesOfPolygon(polygons[i]);
			const middlePoint = getMiddlePointOfPolygon(edgePoints, polygons[i]);
			const position = getLabelRelativePositions(heightImg, widthImg, middlePoint);
			if (position.includes("top"))
				finalPositions.push({ index: edgePoints.topIndex, pos: position });
			else if (position.includes("bottom"))
				finalPositions.push({ index: edgePoints.bottomIndex, pos: position });
			else if (position === "left")
				finalPositions.push({ index: edgePoints.leftIndex, pos: position });
			else finalPositions.push({ index: edgePoints.rightIndex, pos: position });
		}
		return finalPositions;
	};

	function getDistanceBetweenPoints(x1: number, y1: number, x2: number, y2: number): number {
		return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
	}

	// converting the points to coordinates relative to the image
	const convertOriginalPointsToStageCoordinates = (
		points: number[],
		image_info: ImageData | undefined,
		maxWidth: number,
		maxHeight: number
	): number[] => {
		if (!image_info) return [];
		// console.log(image_info?.scaledWidth, image_info?.scaledHeight, image_info?.scale);
		const newPoints = points.map((point, i) => {
			if (i % 2 === 0)
				return (
					Math.round(((maxWidth - image_info?.scaledWidth) / 2 + point * image_info.scale) * 100) /
					100
				);
			else
				return (
					Math.round(
						((maxHeight - image_info?.scaledHeight) / 2 + point * image_info.scale) * 100
					) / 100
				);
		});
		return newPoints;
	};

	const convertStageCoordinatePointsToOriginal = (
		points: number[],
		image_info: ImageData | undefined,
		maxWidth: number,
		maxHeight: number
	): number[] => {
		if (!image_info) return [];
		const newPoints = points.map((point, i) => {
			if (i % 2 === 0)
				return (
					Math.round(
						((point - (maxWidth - image_info?.scaledWidth) / 2) / image_info.scale) * 100
					) / 100
				);
			else
				return (
					Math.round(
						((point - (maxHeight - image_info?.scaledHeight) / 2) / image_info.scale) * 100
					) / 100
				);
		});

		return newPoints;
	};

	// validate the polygon points when the user is annotating
	const validatePolygonPoints = (
		points: number[],
		image_info: ImageData | undefined,
		maxWidth: number,
		maxHeight: number
	): boolean => {
		if (!image_info) return false;
		// the positions of the point at the (0, 0) is the top left corner of the image and the point at (maxWidth, maxHeight) is the bottom right corner of the image
		const firstPoint = convertOriginalPointsToStageCoordinates(
			[0, 0],
			image_info,
			maxWidth,
			maxHeight
		);
		const lastPoint = convertOriginalPointsToStageCoordinates(
			[image_info.origin.width, image_info.origin.height],
			image_info,
			maxWidth,
			maxHeight
		);

		// check if the polygon is within the image
		for (let i = 0; i < points.length; i += 2) {
			// check if the point is within the image
			if (
				points[i] < firstPoint[0] ||
				points[i] > lastPoint[0] ||
				points[i + 1] < firstPoint[1] ||
				points[i + 1] > lastPoint[1]
			)
				return false;
		}
		return true;
	};

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
				console.log("Control + Z pressed!");
				if (snapshots.length > 1 && currentImageIndex !== -1) {
					snapshots.pop();
					images = snapshots[snapshots.length - 1];
					handleClick(images[currentImageIndex]);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		// Cleanup event listener when the component is destroyed
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	});

	function getRatio(maxWidth: number, maxHeight: number, width: number, height: number) {
		// if width or height is 0, return 1
		if (width === 0 || height === 0) return 1;
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
				img.src = `/ecole/images/bowl/${obj.origin.imagePath}`;
				img.onload = () => {
					obj.imgObj = img;
					obj.scale = getRatio(MAX_WIDTH_SMALL, MAX_HEIGHT_SMALL, img.width, img.height);
					obj.scaledWidth = img.width * obj.scale;
					obj.scaledHeight = img.height * obj.scale;
					obj.convertedPolygons = obj.origin.polygonPoints.map((polygon) =>
						convertOriginalPointsToStageCoordinates(
							polygon.points,
							obj,
							MAX_WIDTH_SMALL,
							MAX_HEIGHT_SMALL
						)
					);
					resolve(); // Resolve the promise when the image is loaded
				};
			});
		});

		await Promise.all(loadPromises); // Wait for all images to load
		snapshots.push(images);
		doneLoading = true;
	}

	$: if (currentImage) {
		console.log("change detected");
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
		// const pointerPos = event?.detail?.target?.pointerPos;
		// if (pointerPos) {
		// 	points = [...points, Math.round(pointerPos.x), Math.round(pointerPos.y)];
		// }
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
							currentImageTemp,
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

	const handleMouseMove = (event, name) => {
		showLabel = true;
		labelText = name;
		updateLabelPosition(event);
	};

	const handleMouseOut = () => {
		showLabel = false;
	};

	const updateLabelPosition = (event) => {
		labelX = event.detail?.evt?.clientX + 10; // Offset to appear slightly below and to the right of the cursor
		labelY = event.detail?.evt?.clientY + 10;
	};

	function actionSaveAnnotationChanges(
		event: CustomEvent,
		currentImage: ImageData | undefined,
		polygonIndex: number,
		index: number,
		MAX_WIDTH_LARGE: number,
		MAX_HEIGHT_LARGE: number
	) {
		if (!currentImage) return;

		const x = currentImage.convertedPolygons[polygonIndex][index];
		const y = currentImage.convertedPolygons[polygonIndex][index + 1];

		// convert the points to the original coordinates
		const originalPoints = convertStageCoordinatePointsToOriginal(
			[x, y],
			currentImage,
			MAX_WIDTH_LARGE,
			MAX_HEIGHT_LARGE
		);

		// Update points in the current snapshot
		if (!currentImage) return;
		const currentImageId = currentImage.origin.id;
		if (currentImageId === undefined) return;

		// Try to utilize copy as reference to save the memory, only deepy copy at the root of changes
		// create copy of polygonPoints
		const originCurrentImage = images[currentImageId];
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

		// create copy of origin
		const newOrigin = { ...originCurrentImage.origin };
		newOrigin.polygonPoints = newPolygonPoints;

		// create copy of ImageData
		const newImageData = { ...originCurrentImage };
		newImageData.origin = newOrigin;

		// create copy of images
		const newSnapshot = [...images];
		newSnapshot[currentImageId] = newImageData;

		snapshots.push(newSnapshot);
		images = newSnapshot;
	}

	function handleDragMove(index, event) {
		const x = Math.round(event.detail.currentTarget.attrs.x);
		const y = Math.round(event.detail.currentTarget.attrs.y);
		// console.log(x, y);
		points[index] = x;
		points[index + 1] = y;
	}

	function handleDragMoveCompletePolygon(
		currentImage: ImageData | undefined,
		polygonIndex: number,
		index: number,
		event: CustomEvent
	) {
		const curGroup = event.detail.currentTarget;

		if (!currentImage) return;
		const x = Math.round(event.detail.target.getStage().getPointerPosition().x);
		const y = Math.round(event.detail.target.getStage().getPointerPosition().y);

		// calculate bounds
		const firstPoint = convertOriginalPointsToStageCoordinates(
			[0, 0],
			currentImage,
			MAX_WIDTH_LARGE,
			MAX_HEIGHT_LARGE
		);

		const lastPoint = convertOriginalPointsToStageCoordinates(
			[currentImage.origin.width, currentImage.origin.height],
			currentImage,
			MAX_WIDTH_LARGE,
			MAX_HEIGHT_LARGE
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
		currentImage.changed = true;
	}

	function saveChanges() {
		console.log("save changes");
		updateCVATXML("/ecole/annotations/bowl.xml", labelsInfo, images);
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
		if (!validatePolygonPoints([x, y], currentImage, MAX_WIDTH_LARGE, MAX_HEIGHT_LARGE)) {
			console.log("invalid points");
			return;
		}

		ant_newPoints = [...ant_newPoints, x, y];
	}

	// handle the saving of the new polygon annotation
	$: if (ant_saving && currentImage) {
		if (ant_newPoints.length > 4) {
			// convert the points to the original coordinates
			console.log(ant_newPoints.length);
			const originalPoints = convertStageCoordinatePointsToOriginal(
				ant_newPoints,
				currentImage,
				MAX_WIDTH_LARGE,
				MAX_HEIGHT_LARGE
			);

			// create a new snapshot with the new polygon
			const newPolygon = {
				label: ant_currentLabel,
				points: originalPoints,
			};

			const newPolygons = [...currentImage.origin.polygonPoints, newPolygon];

			// create copy of origin
			const newOrigin = { ...currentImage.origin };
			newOrigin.polygonPoints = newPolygons;

			// we just need to update the original image data from the "images" array and then we call handleclick to update the currentImage

			const originOfCurrentImage = images[currentImage.origin.id];
			const newImageData = { ...originOfCurrentImage };
			newImageData.origin = newOrigin;
			newImageData.coorsInfo = getLabelPositionIndexes(
				newPolygons.map((polygon) => polygon.points),
				newImageData.origin.width,
				newImageData.origin.height
			);

			// create copy of images
			const newSnapshot = [...images];
			newSnapshot[currentImage.origin.id] = newImageData;

			snapshots.push(newSnapshot);
			images = newSnapshot;
			console.log(images[currentImage.origin.id].origin.polygonPoints.length);

			// update currentImage
			handleClick(newImageData);
		}
		ant_newPoints = [];
		ant_saving = false;
		ant_modeOn = false;
	}
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
						{#each images as image_info}
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
																	labelsInfo?.get(image_info.origin.polygonPoints[i0].label)?.color,
																	0.5
																),
																hitStrokeWidth: 0,
															}}
														/>
													</Group>
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
						on:click={(e) =>
							ant_modeOn && handleAnnotate(e, currentImage, MAX_WIDTH_LARGE, MAX_HEIGHT_LARGE)}
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
																draggable: true,
															}}
															on:dragmove={(event) => {
																handleDragMoveCompletePolygon(currentImage, i0, i1, event);
															}}
															on:dragend={(event) =>
																actionSaveAnnotationChanges(
																	event,
																	currentImage,
																	i0,
																	i1,
																	MAX_WIDTH_LARGE,
																	MAX_HEIGHT_LARGE
																)}
														>
															{#if !$isLocked[i0]}
																<Circle
																	config={{
																		x: currentImage.convertedPolygons[i0][i1],
																		y: currentImage.convertedPolygons[i0][i1 + 1],
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
																			polygon[i1],
																			polygon[i1 + 1],
																			labelPositions[i0].endPos[0],
																			labelPositions[i0].endPos[1],
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
																				currentImage.origin.polygonPoints[i0].label.length * 6 + 10,
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
																				currentImage.origin.polygonPoints[i0].label.length * 6 + 10,
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
			<LayersCol
				bind:currentImage
				bind:labelsInfo
				bind:currentLayer
				bind:currentLayerFocused
				bind:snapshots
				bind:images
			/>
		</div>
	</div>
</div>

<style>
</style>
