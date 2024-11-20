export interface LabelInfo {
	color: string;
	type: string;
}

export interface PolygonInfo {
	label: string;
	points: number[];
}

export interface ImageInfo {
	id: number;
	imagePath: string;
	polygonPoints: PolygonInfo[];
	width: number;
	height: number;
}

export type CanvasImageSource =
	| HTMLImageElement
	| HTMLVideoElement
	| HTMLCanvasElement
	| ImageBitmap;

export interface ImageData {
	origin: ImageInfo;
	imgObj: CanvasImageSource | undefined;
	scale: number;
	scaledWidth: number;
	scaledHeight: number;
	convertedPolygons: number[][];
	changed: boolean;
	coorsInfo: { index: number; pos: string }[]; // index of the points where the
}

export interface edgePointsOfPolygon {
	topIndex: number;
	bottomIndex: number;
	leftIndex: number;
	rightIndex: number;
}

export type labelPosition =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right"
	| "left"
	| "right";

export interface labelAbsolutePosition {
	pointIndex: number;
	endPos: number[];
	textPos: number[];
}
