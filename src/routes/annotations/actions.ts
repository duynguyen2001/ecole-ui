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

export const actionSaveLabelChanges = (
	currentImage: ImageData | undefined,
	polygonIndex: number,
	replaceLabel: string
) => {
	if (!currentImage) return;

	// Update points in the current snapshot
	const currentImageId = currentImage.origin.id;

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
	// currentImage.origin.polygonPoints[polygonIndex].label = replaceLabel;
	// currentImage.origin.polygonPoints[polygonIndex].status = "changed";

	currentImage = {
		...currentImage,
		origin: newOrigin,
	};
};
