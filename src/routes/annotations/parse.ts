import type { ImageInfo, LabelInfo, PolygonInfo, ImageData } from "./types";
import vkbeautify from "vkbeautify";

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
		console.log(xmlDoc);

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
					polygonInfo.push({ label, points: curPoints, status: "normal" });
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

export const updateCVATXML = async (
	filePath: string,
	labelsInfo: Map<string, LabelInfo>,
	images: ImageData[]
) => {
	try {
		// Fetch the XML file
		const res = await fetch(filePath);
		if (!res.ok) {
			throw new Error("Failed to fetch XML file");
		}

		const xmlString = await res.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, "application/xml");

		// create a new XML document to updated labels
		const labelsDoc = xmlDoc.createElement("labels");
		labelsInfo.forEach((label, info) => {
			const labelElement = xmlDoc.createElement("label");
			const nameElement = xmlDoc.createElement("name");
			const typeElement = xmlDoc.createElement("type");
			const colorElement = xmlDoc.createElement("color");
			const attributeElement = xmlDoc.createElement("attributes");

			nameElement.textContent = info;
			typeElement.textContent = label.type;
			colorElement.textContent = label.color;

			labelElement.appendChild(nameElement);
			labelElement.appendChild(colorElement);
			labelElement.appendChild(typeElement);
			labelElement.appendChild(attributeElement);

			labelsDoc.appendChild(labelElement);
		});

		// Replace the existing labels with the updated labels
		const oldLabels = xmlDoc.getElementsByTagName("labels")[0];
		const parent = oldLabels.parentNode;
		if (parent) {
			parent.replaceChild(labelsDoc, oldLabels);
		}

		// assume no new images are added, so the order of images is the same
		const imagesDoc = Array.from(xmlDoc.getElementsByTagName("image"));
		imagesDoc.forEach((imageDoc, imgId) => {
			const polygonsDoc = Array.from(imageDoc.getElementsByTagName("polygon"));
			const polygonsInfo = images[imgId].origin.polygonPoints;

			polygonsInfo.forEach((polygonInfo, polygonId) => {
				let polygonDoc: HTMLElement | SVGPolygonElement;
				if (polygonId < polygonsDoc.length) {
					// Reuse existing polygon element
					polygonDoc = polygonsDoc[polygonId];
				} else {
					// Create a new polygon element
					polygonDoc = xmlDoc.createElement("polygon");

					// Inherit attributes from the last polygon element
					const lastPolygon = polygonsDoc[polygonsDoc.length - 1];
					if (lastPolygon) {
						// Copy all attributes from the last polygon
						Array.from(lastPolygon.attributes).forEach((attr) => {
							polygonDoc.setAttribute(attr.name, attr.value);
						});
					}

					// Append the new polygon element
					imageDoc.appendChild(polygonDoc);
				}

				// Update polygon-specific attributes
				if (polygonInfo.status === "deleted") {
					// Remove the polygon element
					polygonDoc.remove();
					return;
				} else if (polygonInfo.status === "changed") {
					polygonDoc.setAttribute("label", polygonInfo.label);
					const formattedPoints = polygonInfo.points
						.reduce<string[]>((acc, cur, idx) => {
							if (idx % 2 === 0) {
								acc.push(`${cur},${polygonInfo.points[idx + 1]}`);
							}
							return acc;
						}, [])
						.join(";");
					polygonDoc.setAttribute("points", formattedPoints);
				}
			});
		});

		// download the updated XML file
		// Serialize the XML document
		const serializer = new XMLSerializer();
		const updatedXmlString = vkbeautify.xml(serializer.serializeToString(xmlDoc));

		// Create a Blob and download the file
		const blob = new Blob([updatedXmlString], { type: "application/xml" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "updated_annotations.xml"; // Desired file name
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);

		console.log("XML file saved for download.");
	} catch (error) {
		console.error("Error parsing XML:", error);
		return undefined;
	}
};
