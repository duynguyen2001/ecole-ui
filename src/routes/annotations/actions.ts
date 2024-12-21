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
	polygonIndex: number,
	index: number,
	MAX_WIDTH_LARGE: number,
	MAX_HEIGHT_LARGE: number,
	MAX_WIDTH_SMALL: number,
	MAX_HEIGHT_SMALL: number
) => {
	const currentImageV = get(currentImage);
	if (!currentImageV) return;

	const x = currentImageV.convertedPolygons[polygonIndex][index];
	const y = currentImageV.convertedPolygons[polygonIndex][index + 1];

	// convert the points to the original coordinates
	const originalPoints = convertStageCoordinatePointsToOriginal(
		[x, y],
		currentImageV.scale,
		currentImageV.origin.width,
		currentImageV.origin.height,
		MAX_WIDTH_LARGE,
		MAX_HEIGHT_LARGE
	);

	// Update points in the current snapshot
	if (!currentImage) return;
	const currentImageId = currentImageV.origin.id;
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
		currentImageV.convertedPolygons[polygonIndex][index],
		currentImageV.convertedPolygons[polygonIndex][index + 1]
	);

	addSnapshot(newSnapshot);
};

export const actionSaveNewPolyonAdded = (
	ant_newPoints: number[],
	MAX_WIDTH_LARGE: number,
	MAX_HEIGHT_LARGE: number,
	ant_currentLabel: string
) => {
	const currentImageV = get(currentImage);
	if (!currentImageV) return;
	// convert the points to the original coordinates
	const originalPoints = convertStageCoordinatePointsToOriginal(
		ant_newPoints,
		currentImageV.scale,
		currentImageV.origin.width,
		currentImageV.origin.height,
		MAX_WIDTH_LARGE,
		MAX_HEIGHT_LARGE
	);

	// create a new snapshot with the new polygon
	const newPolygon = {
		label: ant_currentLabel,
		points: originalPoints,
		status: "changed" as const, // changed because it is a new polygon and it needs to be saved
	};

	const newPolygons = [...currentImageV.origin.polygonPoints, newPolygon];

	// create copy of origin
	const newOrigin = { ...currentImageV.origin };
	newOrigin.polygonPoints = newPolygons;

	// we just need to update the original image data from the "images" array and then we call handleclick to update the currentImage

	const originOfCurrentImage = get(images)[currentImageV.origin.id];
	const newImageData = { ...originOfCurrentImage };
	newImageData.origin = newOrigin;
	newImageData.coorsInfo = getLabelPositionIndexes(
		newPolygons.map((polygon) => polygon.points),
		newImageData.origin.width,
		newImageData.origin.height
	);
	// create copy of images
	const newSnapshot = [...get(images)];
	newSnapshot[currentImageV.origin.id] = newImageData;

	// update the convertedPolygons
	const newConvertedPolygons = newImageData.convertedPolygons.slice();
	newConvertedPolygons.push(
		convertOriginalPointsToStageCoordinates(
			originalPoints,
			get(images)[currentImageV.origin.id].scale,
			newImageData.origin.width,
			newImageData.origin.height,
			MAX_WIDTH_SMALL,
			MAX_HEIGHT_SMALL
		)
	);

	addSnapshot(newSnapshot);
	console.log(
		get(snapshots)[get(snapshots).length - 1][currentImageV.origin.id].origin.polygonPoints
	);

	return newImageData;
};

export const actionSaveLabelChanges = (polygonIndex: number, replaceLabel: string) => {
	const currentImageV = get(currentImage);
	if (!currentImageV) return;

	// Update points in the current snapshot
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

	currentImage.update((value) => {
		if (!value) return;
		return {
			...value,
			origin: newOrigin,
		};
	});
};

export const actionDeletePolygon = (polygonIndex: number) => {
	const currentImageV = get(currentImage);
	if (!currentImageV) return;

	// UPDATE IMAGES
	const currentImageId = currentImageV.origin.id;
	const currentImageData = get(images)[currentImageId];
	const newPolygons = currentImageData.origin.polygonPoints.slice();
	newPolygons[polygonIndex] = {
		...newPolygons[polygonIndex],
		status: "deleted",
	};
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

	// Replace the array reference
	currentImage.update((value) => {
		if (!value) return;
		console.log("delete");
		return {
			...value,
			origin: newOrigin,
		};
	});
};
