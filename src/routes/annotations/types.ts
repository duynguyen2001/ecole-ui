export interface LabelInfo {
	color: string;
	type: string;
}

export interface PolygonInfo {
	label: string;
	points: number[];
	status: "deleted" | "changed" | "normal"; // flag to indicate if the polygon is deleted to show up on the screen. This helps to keep track of the id of each polygon to overwrite the corresponding polygon in the XML file. It also helps to keep track of the polygons that have been changed to efficiently update the XML file.
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
