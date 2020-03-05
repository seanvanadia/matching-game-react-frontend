export default function pageImageIds(allImageIds, maxImagesPerPage, pageNumber) {
  const firstImgIndex = maxImagesPerPage * (pageNumber - 1);
  const lastImgIndex = pageNumber * maxImagesPerPage - 1;
  const pageImgIds = [];

  // For each of the indexes of the page's images
  for (let i = firstImgIndex; i <= lastImgIndex; i += 1) {
    const imageId = allImageIds[i];

    // If the image id exists, add it to the array of ids of the page's images
    if (imageId) {
      pageImgIds.push(parseInt(imageId, 10));
    }

    // Else the ids of all of the user's images have already been added to
    // the array, so end the loop
    else {
      i = lastImgIndex + 1;
    }
  }

  // Return the page's image ids
  return pageImgIds;
}
