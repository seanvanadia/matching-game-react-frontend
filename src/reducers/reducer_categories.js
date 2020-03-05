import { forEach, includes } from 'lodash-es';

import {
  ADD_CATEGORY,
  ADD_IMAGE,
  FETCH_CATEGORY,
  FETCH_CATEGORY_TITLES,
  FETCH_CATEGORY_IMAGE,
  FETCH_NON_CAT_IMAGES,
  UPDATE_CATEGORY_IMAGES,
  UPDATE_CATEGORY_NAME,
  UPDATE_IMAGE,
  DELETE_CATEGORY,
  DELETE_IMAGE
} from '../actions';

export default function (state = null, action) {
  switch (action.type) {
    // If a category has been added, return an object of all the categories,
    // including the newly added one. If a category's name has been updated,
    // return an object of all the categories, including the updated one
    case ADD_CATEGORY: {
      const { category, meta: { length, nonCatImages } } = action.payload.data;
      const newState = state.slice();

      // Initiate category's nonCatImages array
      category.nonCatImages = new Array(length);

      // Add the nonCatImages to the added category and push the category onto
      // the new state
      category.nonCatImages.splice(0, nonCatImages.length, ...nonCatImages);
      newState.push(category);

      // Return the new state
      return newState;
    }

    case UPDATE_CATEGORY_NAME: {
      const { data } = action.payload;
      const newState = state.slice();

      // Update the updated category's title in the newState
      forEach(newState, (cat) => {
        if (cat.id === data.id) {
          cat.title = data.title;
          return false;
        }

        return null;
      });

      // Return the new state
      return newState;
    }

    // If a new image has been added...
    case ADD_IMAGE: {
      const { payload: { data }, manyToManyVar } = action;
      // Remove the categories from the data object
      delete data.categories;

      // For each category, add the new image to the correct category array
      forEach(state, (cat) => {
        if (cat) {
          const imgWasAddedToCat = includes(manyToManyVar, cat.id);

          if (cat.images && imgWasAddedToCat) {
            cat.images.unshift(data);
          }

          else if (cat.nonCatImages && !imgWasAddedToCat) {
            cat.nonCatImages.unshift(data);
          }
        }

        return null;
      });

      // Return the updated state of the user's categories
      return state;
    }

    // If a category has been fetched...
    case FETCH_CATEGORY: {
      // If the user requested a non-existing category, (e.g. their first
      // category when they have none), return the pre-existing state
      if (!action.payload.data) {
        return state;
      }

      const {
        category,
        meta: {
          catIndex,
          imgIndexes,
          length,
          numberOfImagesRequested,
          pageNumber
        }
      } = action.payload.data;
      const { images } = category;
      const newState = state.slice();
      const cat = newState[catIndex];

      // Define the initial value of the newCategoryImages array
      const newCategoryImages = cat && cat.images
        ? cat.images.slice()
        : new Array(length);

      // If the backend responds with imgIndexes, place the images in those
      // specific indexes in the newCategoryImages array
      if (imgIndexes) {
        forEach(imgIndexes, (imgIndex, i) => {
          if (!newCategoryImages[imgIndex]) {
            newCategoryImages[imgIndex] = images[i];
          }
        });
      }

      // If the backend does not respond with imgIndexes, place the images in the
      // correct place in the newCategoryImages array based on the page number
      else {
        let count = 0;
        for (let i = (pageNumber - 1) * numberOfImagesRequested; count < images.length; i += 1) {
          if (!newCategoryImages[i]) {
            newCategoryImages[i] = images[count];
          }

          count += 1;
        }
      }

      // Change the category's images array to the new category images array
      category.images = newCategoryImages;

      // Ensure the preservation of the category's nonCatImages
      if (newState[catIndex] && newState[catIndex].nonCatImages) {
        category.nonCatImages = newState[catIndex].nonCatImages;
      }

      // Alter the newState
      newState[catIndex] = category;

      // Return the new state
      return newState;
    }

    // If category titles have been fetched...
    case FETCH_CATEGORY_TITLES: {
      const {
        categories,
        meta: { length, numberOfCategoriesRequested, pageNumber }
      } = action.payload.data;
      const newState = state ? state.slice() : new Array(length);

      // Place the fetched category objects (containing only titles and ids)
      // in the correct place in the array of categories
      newState.splice(
        (pageNumber - 1) * numberOfCategoriesRequested,
        categories.length,
        ...categories
      );

      // Return the new state of categories
      return newState;
    }

    // If an image belonging to a category has been fetched...
    case FETCH_CATEGORY_IMAGE: {
      const {
        blobUrl,
        categoryIndex,
        isNonCatImage,
        oldImageSrc
      } = action.payload;
      const imgsArr = isNonCatImage
        ? state[categoryIndex].nonCatImages
        : state[categoryIndex].images;

      // Change the category's old image src to the securely created temporary blob url
      forEach(imgsArr, (image) => {
        if (image && image.image === oldImageSrc) {
          image.image = blobUrl;

          // End loop upon change
          return false;
        }

        // Loop returns null
        return null;
      });

      // Return the new state of the user's categories
      return state;
    }

    case FETCH_NON_CAT_IMAGES: {
      const {
        images,
        meta: {
          catIndex,
          length,
          numberOfImagesRequested, // maxImagesPerPage
          offset,
          pageNumber
        }
      } = action.payload.data;
      const newState = state.slice();

      // Declare initial value of newNonCatImages
      let newNonCatImages = newState[catIndex].nonCatImages;
      if (!newNonCatImages) {
        newNonCatImages = new Array(length);
      }

      // If no non-cat images were found, return the pre-existing state,
      // with the category's nonCatImages defined as its initial value
      if (images.length === 0) {
        newState[catIndex].nonCatImages = newNonCatImages;

        return newState;
      }

      // If non-cat images were found...

      // Define the startIndex for the nonCatImages
      let startIndex = offset === 0
        ? (pageNumber - 1) * numberOfImagesRequested
        : offset + (pageNumber - 2) * numberOfImagesRequested;

      // Change the startIndex value if the pageNumber is 1
      if (pageNumber === 1) {
        startIndex = 0;
      }

      // Change the newNonCatImages to their new value
      let count = 0;
      for (let i = startIndex; count < images.length; i += 1) {
        if (!newNonCatImages[i]) {
          newNonCatImages[i] = images[count];
        }

        count += 1;
      }

      // Change the new state to return
      newState[catIndex].nonCatImages = newNonCatImages;

      // Return the new categories state array
      return newState;
    }

    // If a category's images have been updated...
    case UPDATE_CATEGORY_IMAGES: {
      const { id, meta: { imageIds } } = action.payload.data;
      const newState = state.slice();
      let image = null;

      // Define the category
      let category = null;
      forEach(newState, (cat) => {
        if (cat && cat.id === id) {
          category = cat;
          return false;
        }

        return null;
      });

      // Update each of the updated images everywhere it exists
      forEach(imageIds, (imgId) => {
        const { images, nonCatImages } = category;
        let countArr = images;
        let otherArr = nonCatImages;
        let oldImagesArr = null;
        let newImagesArr = null;
        let oldSpliced = false;

        // Change countArr and otherArr values based on what is the shortest images array
        if (nonCatImages.length <= images.length) {
          countArr = nonCatImages;
          otherArr = images;
        }

        // Define the initial values for the old images array and the new images array
        if (countArr.length === 0) {
          oldImagesArr = otherArr;
          newImagesArr = countArr;
        }

        // If the image is found in the 'countArr', remove it
        forEach(countArr, (img, i) => {
          if (img && img.id === imgId) {
            oldImagesArr = countArr;
            newImagesArr = otherArr;
            image = img;
            oldImagesArr.splice(i, 1);
            oldSpliced = true;
            return false;
          }

          // If the image is not found in the countArr, change the values of
          // the oldImagesArr and newImagesArr
          if (i === countArr.length - 1) {
            oldImagesArr = otherArr;
            newImagesArr = countArr;
          }

          return null;
        });

        // If it has not already been done, find the image in the oldImagesArr,
        // and remove it
        if (!oldSpliced) {
          forEach(oldImagesArr, (img, i) => {
            if (img && img.id === imgId) {
              image = img;
              oldImagesArr.splice(i, 1);
              return false;
            }

            return null;
          });
        }

        // Store the image's created_at value
        const imageCreatedAt = image.created_at;

        // Place the image in the new images array
        forEach(newImagesArr, (img, i) => {
          // Place the image in the correct slot
          if (img && imageCreatedAt > img.created_at) {
            if (newImagesArr[i - 1] || i === 0) {
              newImagesArr.splice(i, 0, image);
            } else {
              newImagesArr.splice(i, 0, undefined);
            }

            return false;
          }

          // If the image has not been placed in a slot when the loop comes
          // to an end, either place it at the end of the array, or push undefined
          if (i === newImagesArr.length - 1) {
            if (img) {
              newImagesArr.push(image);
            } else {
              newImagesArr.push(undefined);
            }
          }

          return null;
        });

        // If the new images array is empty, simply push the image onto the array
        if (newImagesArr.length === 0) {
          newImagesArr.push(image);
        }

        return null;
      });

      // Return the updated state
      return newState;
    }

    // If an image's categories have been updated (on the images page)...
    case UPDATE_IMAGE: {
      const { payload: { catStatuses, data }, manyToManyVar } = action;
      // Remove the categories from the data
      delete data.categories;

      // Loop through each of the image's categories that have been updated
      forEach(manyToManyVar, (categoryId, catIdIndex) => {
        let categoryImages = [];

        // Update each category's images arrays that need to be updated
        forEach(state, (category) => {
          if (category && category.id === categoryId && category.images) {
            categoryImages = category.images;
            const { nonCatImages } = category;
            let oldImagesArr = nonCatImages;
            let newImagesArr = categoryImages;

            // Determine which array is the oldImagesArr and which is the newImagesArr
            if (catStatuses[catIdIndex] === 'R') {
              oldImagesArr = categoryImages;
              newImagesArr = nonCatImages;
            }

            // Remove the image from the old images array
            forEach(oldImagesArr, (img, i) => {
              // If the image is found, remove it
              if (img === data) {
                oldImagesArr.splice(i, 1);
                return false;
              }

              // If the image is not found, remove a placeholder from the correct slot
              if (img && data.created_at > img.created_at) {
                oldImagesArr.splice(i - 1, 1);
                return false;
              }

              // If the loop is ending and the image has not been found,
              // remove the final element of the old images array
              if (i === oldImagesArr.length - 1) {
                oldImagesArr.splice(i, 1);
              }

              return null;
            });

            // Add the image to the new images array
            forEach(newImagesArr, (img, nonCatImgIndex) => {
              // Find the correct slot to place the image
              if (img && data.created_at > img.created_at) {
                newImagesArr.splice(nonCatImgIndex, 0, data);
                return false;
              }

              // If the loop is ending and the correct slot for the image has not been found,
              // either push the image or undefined onto the array
              if (nonCatImgIndex === newImagesArr.length - 1) {
                if (img) {
                  newImagesArr.push(data);
                } else {
                  newImagesArr.push(undefined);
                }
              }

              return null;
            });

            // If the newImagesArr is empty, simply push the image onto the array
            if (newImagesArr && newImagesArr.length === 0) {
              newImagesArr.push(data);
            }

            return false;
          }

          return null;
        });

        return null;
      });

      // Return the updated state of the user's categories
      return state;
    }

    // If a category has been deleted...
    case DELETE_CATEGORY: {
      const { data } = action.payload;
      const {
        deletedCatId,
        numImgsRequested,
        replacementCatTitle,
        replacementIndex
      } = data.meta;
      const newState = state.slice();

      // If a replacement category has been fetched, place its title in the newState
      if (replacementIndex !== null) {
        newState[replacementIndex] = replacementCatTitle;
      }

      // Delete the deleted category from the newState
      forEach(newState, (cat, i) => {
        if (cat && cat.id === deletedCatId) {
          newState.splice(i, 1);

          return false;
        }

        return null;
      });

      // If no new images were requested, return the new state
      if (numImgsRequested === 0) {
        return newState;
      }

      // If new images were requested...
      const {
        category,
        meta: {
          catImagesLength,
          nonCatImages,
          nonCatImagesLength
        }
      } = data;

      // If the first category in state has images, add to its images array
      // any required images it was missing
      if (newState[0].images) {
        forEach(newState[0].images.slice(0, numImgsRequested), (img, i) => {
          if (img === undefined) {
            newState[0].images.splice(i, 1, category.images[i]);
          }
        });
      }

      // If the first category in state does not have images, create its images array,
      // containing the fetched category images
      else {
        newState[0].images = new Array(catImagesLength);
        newState[0].images.splice(0, numImgsRequested, ...category.images);
      }

      // If the first category in state has nonCatImages, add to its nonCatImages array
      // any required images it was missing
      if (newState[0].nonCatImages) {
        forEach(
          newState[0].nonCatImages.slice(0, numImgsRequested - category.images.length),
          (img, i) => {
            if (img === undefined) {
              newState[0].nonCatImages.splice(i, 1, nonCatImages[i]);
            }
          }
        );
      }

      // If the first category in state does not have nonCatImages, create its nonCatImages array,
      // containing the fetched non-category images
      else {
        newState[0].nonCatImages = new Array(nonCatImagesLength);
        newState[0].nonCatImages.splice(
          0,
          numImgsRequested - category.images.length,
          ...nonCatImages
        );
      }

      // Return the new state
      return newState;
    }

    // If an image has been deleted (on the images page)...
    case DELETE_IMAGE: {
      const { payload: { img }, manyToManyVar } = action;

      // Remove the deleted image from each category
      forEach(state, (cat) => {
        if (cat) {
          const imgIsCatImg = includes(manyToManyVar, cat.id);
          const { images, nonCatImages } = cat;
          let imagesArr = null;

          // Determine which array the image belongs to
          if (imgIsCatImg && images) {
            imagesArr = images;
          } else if (!imgIsCatImg && nonCatImages) {
            imagesArr = nonCatImages;
          }

          // Remove the image from the category's array it exists in
          forEach(imagesArr, (arrImg, i) => {
            // If the image is found, remove it
            if (arrImg === img) {
              imagesArr.splice(i, 1);
              return false;
            }

            // If the image is not found, remove the proper placeholder
            if (arrImg && img.created_at > arrImg.created_at) {
              imagesArr.splice(i - 1, 1);
              return false;
            }

            // If the loop is ending and the image is not found, remove the final element
            if (i === imagesArr.length - 1) {
              imagesArr.splice(i, 1);
            }

            return null;
          });
        }

        return null;
      });

      // Return the updated state of the user's categories
      return state;
    }

    // By default, return the current state of the user's categories
    default:
      return state;
  }
}
