import { writable, get, type Writable } from "svelte/store";
import type { ImageData, PolygonInfo } from "./types";
import {
	convertOriginalPointsToStageCoordinates,
	convertStageCoordinatePointsToOriginal,
	getLabelPositionIndexes,
	getRatio,
} from "./utils";

import { MAX_WIDTH_SMALL, MAX_HEIGHT_SMALL, MAX_WIDTH_LARGE, MAX_HEIGHT_LARGE } from "./constants";

// MANAGE ACTIONS THAT CREATE A SNAPSHOT
export const snapshots = writable<ImageData[][]>([]); // history of all the snapshots, updated when there is a change in any image
export const images = writable<ImageData[]>([]); // current snapshot
export const currentImage = writable<ImageData | undefined>(undefined);

// current snapshot is updated when the snapshots are updated
snapshots.subscribe((snapshots) => {
	if (snapshots.length > 0) {
		images.set(snapshots[snapshots.length - 1]);
	}
});

// currentImage.subscribe((value) => {
// 	if (value === undefined) return;
// 	const changeImageID = value.origin.id;
// 	if (changeImageID === undefined) return;

// 	// recalculate polygons coordinates to match with the size of the list section on the left or (convertedPolygons)
// 	const scale = getRatio(
// 		MAX_WIDTH_SMALL,
// 		MAX_HEIGHT_SMALL,
// 		value.origin.width,
// 		value.origin.height
// 	);

// 	const convertedPolygons = value.origin.polygonPoints.map((polygon) =>
// 		convertOriginalPointsToStageCoordinates(
// 			polygon.points,
// 			scale,
// 			value.origin.width,
// 			value.origin.height,
// 			MAX_WIDTH_SMALL,
// 			MAX_HEIGHT_SMALL
// 		)
// 	);

// 	images.update((images) => {
// 		images[changeImageID].convertedPolygons = convertedPolygons;
// 		return images;
// 	});
// });

export const addSnapshot = (snapshot: ImageData[]) => {
	snapshots.update((snapshots) => [...snapshots, snapshot]);
};

export const removeSnapshotAfterThis = (index: number) => {
	snapshots.update((snapshots) => snapshots.slice(0, index + 1));
};

export const clearSnapshots = () => {
	snapshots.update(() => []);
};

export const setImages = (imageData: ImageData[]) => {
	images.update(() => imageData);
};

export const clearImages = () => {
	images.update(() => []);
};

export const clearAll = () => {
	clearSnapshots();
	clearImages();
};

export const actionSaveAnnotationChanges = (
	event: CustomEvent,
	currentImageValue: ImageData | undefined,
	polygonIndex: number,
	index: number,
	MAX_WIDTH_LARGE: number,
	MAX_HEIGHT_LARGE: number,
	MAX_WIDTH_SMALL: number,
	MAX_HEIGHT_SMALL: number
) => {
	if (!currentImageValue) return;

	const x = currentImageValue.convertedPolygons[polygonIndex][index];
	const y = currentImageValue.convertedPolygons[polygonIndex][index + 1];

	// convert the points to the original coordinates
	const originalPoints = convertStageCoordinatePointsToOriginal(
		[x, y],
		currentImageValue.scale,
		currentImageValue.origin.width,
		currentImageValue.origin.height,
		MAX_WIDTH_LARGE,
		MAX_HEIGHT_LARGE
	);

	// Update points in the current snapshot
	if (!currentImage) return;
	const currentImageId = currentImageValue.origin.id;
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
	console.log(get(currentImage)?.convertedPolygons[polygonIndex][index]);

	addSnapshot(newSnapshot);

	// // update currentImage
	// currentImage.update((value) => {
	// 	if (value === undefined) return;
	// 	value.origin.polygonPoints = newPolygonPoints;
	// 	return value;
	// });

	// console.log(get(currentImage)?.convertedPolygons[polygonIndex][index]);
};

export const actionSaveNewPolyonAdded = (
	ant_newPoints: number[],
	currentImage: ImageData | undefined,
	MAX_WIDTH_LARGE: number,
	MAX_HEIGHT_LARGE: number,
	ant_currentLabel: string
) => {
	if (!currentImage) return;
	// convert the points to the original coordinates
	const originalPoints = convertStageCoordinatePointsToOriginal(
		ant_newPoints,
		currentImage.scale,
		currentImage.origin.width,
		currentImage.origin.height,
		MAX_WIDTH_LARGE,
		MAX_HEIGHT_LARGE
	);

	// create a new snapshot with the new polygon
	const newPolygon = {
		label: ant_currentLabel,
		points: originalPoints,
		status: "normal" as const,
	};

	const newPolygons = [...currentImage.origin.polygonPoints, newPolygon];

	// create copy of origin
	const newOrigin = { ...currentImage.origin };
	newOrigin.polygonPoints = newPolygons;

	// we just need to update the original image data from the "images" array and then we call handleclick to update the currentImage

	const originOfCurrentImage = get(images)[currentImage.origin.id];
	const newImageData = { ...originOfCurrentImage };
	newImageData.origin = newOrigin;
	newImageData.coorsInfo = getLabelPositionIndexes(
		newPolygons.map((polygon) => polygon.points),
		newImageData.origin.width,
		newImageData.origin.height
	);
	// create copy of images
	const newSnapshot = [...get(images)];
	newSnapshot[currentImage.origin.id] = newImageData;

	// update the convertedPolygons
	const newConvertedPolygons = newImageData.convertedPolygons.slice();
	newConvertedPolygons.push(
		convertOriginalPointsToStageCoordinates(
			originalPoints,
			get(images)[currentImage.origin.id].scale,
			newImageData.origin.width,
			newImageData.origin.height,
			MAX_WIDTH_SMALL,
			MAX_HEIGHT_SMALL
		)
	);

	addSnapshot(newSnapshot);

	return newImageData;
};

export const actionDeletePolygon = (
	currentImage: Writable<ImageData | undefined>,
	polygonIndex: number
) => {
	const currentImageV = get(currentImage);
	if (!currentImageV) return;

	// UPDATE IMAGES
	const currentImageId = currentImageV.origin.id;
	const currentImageData = get(images)[currentImageId];
	const newPolygons = [...currentImageData.origin.polygonPoints];
	const newPolygon = { ...newPolygons[polygonIndex] };
	newPolygon.status = "deleted";
	newPolygons[polygonIndex] = newPolygon;
	// create copy of origin
	const newOrigin = { ...currentImageData.origin };
	newOrigin.polygonPoints = newPolygons;
	// create copy of ImageData
	const newImageData = { ...currentImageData };
	newImageData.origin = newOrigin;
	// create copy of images
	const newSnapshot = [...get(images)];
	newSnapshot[currentImageId] = newImageData;
	addSnapshot(newSnapshot);
	console.log(
		"before",
		get(snapshots)[get(snapshots).length - 2][currentImageId].origin.polygonPoints
	);
	console.log(
		"updated",
		get(snapshots)[get(snapshots).length - 1][currentImageId].origin.polygonPoints
	);

	// UPDATE CURRENT IMAGE
	currentImage.update((value) => {
		if (value === undefined) return;
		value.origin.polygonPoints = newPolygons;
		return value;
	});
};

export const actionSaveLabelChanges = (
	currentImage: Writable<ImageData | undefined>,
	polygonIndex: number,
	replaceLabel: string
) => {
	console.log("save label changes");
	const currentImageV = get(currentImage);

	// Update points in the current snapshot
	if (!currentImageV) return;
	const currentImageId = currentImageV.origin.id;

	const originCurrentImage = get(images)[currentImageId];
	const newPolygonPoints = [...originCurrentImage.origin.polygonPoints];
	newPolygonPoints[polygonIndex] = {
		...newPolygonPoints[polygonIndex],
		label: replaceLabel,
		status: "changed",
	};

	// create copy of origin
	const newOrigin = { ...originCurrentImage.origin };
	newOrigin.polygonPoints = newPolygonPoints;

	// create copy of ImageData
	const newImageData = { ...originCurrentImage };
	newImageData.origin = newOrigin;

	// create copy of images
	const newSnapshot = [...get(images)];
	newSnapshot[currentImageId] = newImageData;

	addSnapshot(newSnapshot);

	// update currentImage
	currentImage.update((value) => {
		if (value === undefined) return;
		value.origin.polygonPoints[polygonIndex].label = replaceLabel;
		value.origin.polygonPoints[polygonIndex].status = "changed";
		return value;
	});
};
