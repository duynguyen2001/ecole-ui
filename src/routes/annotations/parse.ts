export const parseCVATXML = async (
	filePath: string
): Promise<{ allPolygonsPoints: number[][][]; allImagePaths: string[] }> => {
	try {
		// Fetch the XML file
		const res = await fetch(filePath);
		if (!res.ok) {
			throw new Error("Failed to fetch XML file");
		}
		const xmlString = await res.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, "application/xml");

		const allPolygonsPoints: number[][][] = [];
		const allImagePaths: string[] = [];

		// get all <image> elements
		const images = xmlDoc.getElementsByTagName("image");
		for (let n = 0; n < images.length; n++) {
			allImagePaths.push(images[n].getAttribute("name") || "");
			// Get all <polygon> elements
			const polygons = images[n].getElementsByTagName("polygon");
			// Array to hold the arrays of points for each polygon
			const polygonPointsArray: number[][] = [];
			// Iterate through each <polygon> element
			for (let i = 0; i < polygons.length; i++) {
				const polygon = polygons[i];

				// Get the points attribute
				const pointsString = polygon.getAttribute("points");
				const curPoints: number[] = [];

				if (pointsString) {
					// Split the points string into individual points
					pointsString.split(";").map((point) => {
						const [x, y] = point.split(",");
						curPoints.push(parseFloat(x), parseFloat(y));
					});

					// Add the points to the array
					polygonPointsArray.push(curPoints);
				}
			}
			allPolygonsPoints.push(polygonPointsArray);
		}
		return { allPolygonsPoints, allImagePaths };
	} catch (error) {
		console.error("Error parsing XML:", error);
		return { allPolygonsPoints: [], allImagePaths: [] };
	}
};
