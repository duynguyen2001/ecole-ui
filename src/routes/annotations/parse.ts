import type { ImageInfo, LabelInfo, PolygonInfo } from "./types";

export const parseCVATXML = async (
	filePath: string
): Promise<{ labelsMap: Map<string, LabelInfo>; imageElements: ImageInfo[] } | undefined> => {
	try {
		// Fetch the XML file
		const res = await fetch(filePath);
		if (!res.ok) {
			throw new Error("Failed to fetch XML file");
		}

		const xmlString = await res.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, "application/xml");

		const labelsMap = new Map<string, LabelInfo>();

		// get all the label details
		const labels = xmlDoc.getElementsByTagName("labels");
		const labelElements = labels[0].getElementsByTagName("label");
		Array.from(labelElements).map((label) => {
			const color = label.getElementsByTagName("color")[0].textContent || "";
			const name = label.getElementsByTagName("name")[0].textContent || "";
			const type = label.getElementsByTagName("type")[0].textContent || "";
			labelsMap.set(name, { color, type });
		});

		const imageElements: ImageInfo[] = [];

		// get all <image> elements
		const images = xmlDoc.getElementsByTagName("image");
		for (let n = 0; n < images.length; n++) {
			// Get the image attributes
			const id = parseInt(images[n].getAttribute("id") || "0");
			const imagePath = images[n].getAttribute("name") || "";
			const width = parseInt(images[n].getAttribute("width") || "0");
			const height = parseInt(images[n].getAttribute("height") || "0");
			const polygons = images[n].getElementsByTagName("polygon");

			// Array to hold the arrays of points for each polygon
			const polygonInfo: PolygonInfo[] = [];

			// Iterate through each <polygon> element
			for (let i = 0; i < polygons.length; i++) {
				const polygon = polygons[i];
				const label = polygon.getAttribute("label") || "";
				const pointsString = polygon.getAttribute("points");
				const curPoints: number[] = [];
				if (pointsString) {
					// Split the points string into individual points
					pointsString.split(";").map((point) => {
						const [x, y] = point.split(",");
						curPoints.push(parseFloat(x), parseFloat(y));
					});

					// Add the points to the array
					polygonInfo.push({ label, points: curPoints });
				}
			}
			imageElements.push({ id, imagePath, polygonPoints: polygonInfo, width, height });
		}
		console.log(labelsMap, imageElements);
		return { labelsMap, imageElements };
	} catch (error) {
		console.error("Error parsing XML:", error);
		return undefined;
	}
};
