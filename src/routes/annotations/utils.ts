import type { edgePointsOfPolygon, ImageData, labelAbsolutePosition, labelPosition } from "./types";

export const convertOriginalPointsToStageCoordinates = (
	points: number[],
	scale: number,
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number
): number[] => {
	// console.log(image_info?.scaledWidth, image_info?.scaledHeight, image_info?.scale);
	const newPoints = points.map((point, i) => {
		if (i % 2 === 0)
			return Math.round(((maxWidth - scale * width) / 2 + point * scale) * 100) / 100;
		else return Math.round(((maxHeight - scale * height) / 2 + point * scale) * 100) / 100;
	});
	return newPoints;
};

export const convertStageCoordinatePointsToOriginal = (
	points: number[],
	scale: number,
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number
): number[] => {
	const newPoints = points.map((point, i) => {
		if (i % 2 === 0)
			return Math.round(((point - (maxWidth - scale * width) / 2) / scale) * 100) / 100;
		else return Math.round(((point - (maxHeight - scale * height) / 2) / scale) * 100) / 100;
	});

	return newPoints;
};

export const getLabelPosition = (
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
				endPos: [
					-inclinePixel,
					imageEdges.top - distanceRatio * distanceToMiddle - points[index + 1],
				],
				textPos: [
					-inclinePixel - (label.length * 6) / 2,
					imageEdges.top - distanceRatio * distanceToMiddle - fontSize * 1.1 - points[index + 1],
				],
			};
			finalPositions.push(temp);
		} else if (pos === "top-right") {
			const temp = {
				pointIndex: index,
				endPos: [
					inclinePixel,
					imageEdges.top - distanceRatio * distanceToMiddle - points[index + 1],
				],
				textPos: [
					inclinePixel - (label.length * 6) / 2,
					imageEdges.top -
						distanceRatio * distanceToMiddle -
						(fontSize * 1.1) / 2 -
						points[index + 1],
				],
			};
			finalPositions.push(temp);
		} else if (pos === "bottom-left") {
			const temp = {
				pointIndex: index,
				endPos: [
					-inclinePixel,
					imageEdges.bottom + distanceRatio * distanceToMiddle - points[index + 1],
				],
				textPos: [
					-inclinePixel - (label.length * 6) / 2,
					imageEdges.bottom + distanceRatio * distanceToMiddle - points[index + 1],
				],
			};
			finalPositions.push(temp);
		} else if (pos === "bottom-right") {
			const temp = {
				pointIndex: index,
				endPos: [
					inclinePixel,
					imageEdges.bottom + distanceRatio * distanceToMiddle - points[index + 1],
				],
				textPos: [
					inclinePixel - (label.length * 6) / 2,
					imageEdges.bottom + distanceRatio * distanceToMiddle - points[index + 1],
				],
			};
			finalPositions.push(temp);
		} else if (pos === "left") {
			const temp = {
				pointIndex: index,
				endPos: [imageEdges.left - distanceRatio * distanceToMiddle - points[index], -inclinePixel],
				textPos: [
					imageEdges.left -
						distanceRatio * distanceToMiddle -
						(label.length * 6) / 2 -
						points[index],
					-inclinePixel - (fontSize * 1.1) / 2,
				],
			};
			finalPositions.push(temp);
		} else {
			const temp = {
				pointIndex: index,
				endPos: [
					imageEdges.right + distanceRatio * distanceToMiddle - points[index],
					-inclinePixel,
				],
				textPos: [
					imageEdges.right +
						distanceRatio * distanceToMiddle -
						(label.length * 6) / 2 -
						points[index],
					-inclinePixel - (fontSize * 1.1) / 2,
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

const getMiddlePointOfPolygon = (indexCoords: edgePointsOfPolygon, polygon: number[]): number[] => {
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
export const getLabelPositionIndexes = (
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

export function getRatio(maxWidth: number, maxHeight: number, width: number, height: number) {
	// if width or height is 0, return 1
	if (width === 0 || height === 0) return 1;
	const ratio = Math.min(maxWidth / width, maxHeight / height);
	// console.log(maxWidth, maxHeight, width, height, ratio);
	return ratio;
}

// validate the polygon points when the user is annotating
export const validatePolygonPoints = (
	points: number[],
	scale: number,
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number
): boolean => {
	// the positions of the point at the (0, 0) is the top left corner of the image and the point at (maxWidth, maxHeight) is the bottom right corner of the image
	const firstPoint = convertOriginalPointsToStageCoordinates(
		[0, 0],
		scale,
		width,
		height,
		maxWidth,
		maxHeight
	);
	const lastPoint = convertOriginalPointsToStageCoordinates(
		[width, height],
		scale,
		width,
		height,
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

export const addTransparency = (hex: string | undefined, opacity: number) => {
	if (!hex) return `rgba(0, 0, 0, 0)`;
	return `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(
		hex.slice(5, 7),
		16
	)}, ${opacity})`;
};
