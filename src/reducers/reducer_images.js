import { forEach } from 'lodash-es';

import {
  ADD_IMAGE,
  FETCH_IMAGE,
  FETCH_IMAGE_CATEGORIES,
  FETCH_IMAGES,
  UPDATE_IMAGE,
  UPDATE_CATEGORY_IMAGES,
  UPDATE_CATEGORY_NAME,
  DELETE_IMAGE,
  DELETE_CATEGORY
} from '../actions';

export default function (state = null, action) {
  switch (action.type) {
    // If an image has been added, return an array of all the images, including the newly added one
    case ADD_IMAGE: {
      return [action.payload.data, ...state];
    }

    // If an image has been updated...
    case UPDATE_IMAGE: {
      const { data, imgIndex } = action.payload;
      const newState = state.slice();
      // Ensure the preservation of the image's blob url
      data.image = newState[imgIndex].image;

      // Update the images state array with the updated image
      newState.splice(imgIndex, 1, data);

      // Return the new images state
      return newState;
    }

    // If an image has been fetched...
    case FETCH_IMAGE: {
      const { blobUrl, imageIndex } = action.payload;
      const newState = state.slice();

      // Change the image's src to the securely created temporary blob url
      newState[imageIndex].image = blobUrl;

      // Return the new state of the user's images
      return newState;
    }

    case FETCH_IMAGE_CATEGORIES: {
      const { image: { categories }, meta: { imgIndex, length, pageNumber } } = action.payload.data;
      const newState = state.slice();
      const imageCatsState = newState[imgIndex].categories;
      const newImageCatsState = imageCatsState || new Array(length);

      // Update the image's categories state with the fetched image categories
      newImageCatsState.splice((pageNumber - 1) * 10, categories.length, ...categories);

      // Update the images state array
      newState[imgIndex].categories = newImageCatsState;

      // Return the images state array
      return newState;
    }

    // If images have been fetched...
    case FETCH_IMAGES: {
      const {
        images,
        meta: {
          imgIndexes,
          length,
          numberOfImagesRequested,
          pageNumber
        }
      } = action.payload.data;
      const newState = state ? state.slice() : new Array(length);

      // If no specific images were requested, return the newState reflecting the images length
      if (numberOfImagesRequested === 0) {
        return newState;
      }

      // If the backend responds with imgIndexes, place the images in those specific indexes
      if (imgIndexes && imgIndexes.length > 0) {
        forEach(images, (image, i) => {
          newState[imgIndexes[i]] = image;
        });
      }

      // If the backend does not respond with imgIndexes, place the images in the
      // correct place in the array based on the page number
      else {
        newState.splice((pageNumber - 1) * numberOfImagesRequested, images.length, ...images);
      }

      // Return the new images state array
      return newState;
    }

    // If a category's images have been updated (on the categories page)...
    case UPDATE_CATEGORY_IMAGES: {
      const { payload: { data, imgStatuses }, manyToManyVar } = action;
      // Remove the images and meta data from the response data
      delete data.images;
      delete data.meta;

      // If the images state has been set...
      if (state) {
        // Loop through all the images that were updated...
        forEach(manyToManyVar, (imageId, imgIdIndex) => {
          // Define the image's categories
          let imageCategories = null;
          forEach(state, (img) => {
            if (img && img.id === imageId) {
              imageCategories = img.categories;
              return false;
            }

            return null;
          });

          // If the image was removed from the category, remove the category from the image
          if (imgStatuses[imgIdIndex] === 'R') {
            forEach(imageCategories, (cat, i) => {
              // If the category is found, remove it
              if (cat === data) {
                imageCategories.splice(i, 1);
                return false;
              }

              // If the category is not found, remove the correct placeholder
              // from the array
              if (cat && data.created_at < cat.created_at) {
                imageCategories.splice(i - 1, 1);
                return false;
              }

              // If the loop has come to an end and the category has not been found,
              // remove the final element from the array
              if (i === imageCategories.length - 1) {
                imageCategories.splice(i, 1);
              }

              return null;
            });
          }

          // If the image was added to the category, and the image's categories
          // array is empty, simply push the category onto the image's categories array
          else if (imageCategories && imageCategories.length === 0) {
            imageCategories.push(data);
          }

          // If the image was added to the category, add the category
          // to the image's categories array in the correct slot
          else {
            forEach(imageCategories, (cat, i) => {
              // Place the category in the correct slot and end the inner loop
              if (cat && data.created_at < cat.created_at) {
                imageCategories.splice(i, 0, data);
                return false;
              }

              // If the loop has ended and the correct slot has not been found,
              // either place the category at the end of the array, or push undefined
              if (i === imageCategories.length - 1) {
                if (cat) {
                  imageCategories.push(data);
                } else {
                  imageCategories.push(undefined);
                }
              }

              return null;
            });
          }
        });
      }

      // Return the updated state of the user's images
      return state;
    }

    case UPDATE_CATEGORY_NAME: {
      const { data } = action.payload;
      const { id, title } = data;

      // Rename the updated category in every image's categories array it exists in
      forEach(state, (img) => {
        if (img && img.categories) {
          forEach(img.categories, (cat) => {
            if (cat.id === id) {
              cat.title = title;
              return false;
            }

            return null;
          });
        }

        return null;
      });

      // Return the updated images state
      return state;
    }

    // If an image has been deleted...
    case DELETE_IMAGE: {
      const { data, imgIndex, replacementImgIndex } = action.payload;
      const newState = state.slice();

      // Delete the image from the state array
      newState.splice(imgIndex, 1);

      // If an image has been fetched to replace the deleted image,
      // replace the deleted image
      if (replacementImgIndex) {
        newState.splice(replacementImgIndex - 1, 1, data);
      }

      // Return the new state
      return newState;
    }

    // If a category has been deleted (on the categories page)...
    case DELETE_CATEGORY: {
      // If the images state has been set...
      if (state) {
        const {
          manyToManyVar,
          payload: {
            data: {
              meta: { deletedCatId, deletedCatCreatedAt }
            }
          }
        } = action;

        // For each of the images that belonged to the deleted category...
        forEach(manyToManyVar, (imageId) => {
          // Define the image's categories
          let imageCategories = [];
          forEach(state, (image) => {
            if (image && image.id === imageId) {
              imageCategories = image.categories;

              return false;
            }

            return null;
          });

          // Try to find the deleted category in the image's previous state of categories,
          // and remove it
          forEach(imageCategories, (category, i) => {
            // If the deleted category is found, remove it and end the inner loop
            if (category && category.id === deletedCatId) {
              imageCategories.splice(i, 1);
              return false;
            }

            // If the deleted category is not found, remove the proper placeholder in the array
            // and end the inner loop
            if (category && deletedCatCreatedAt < category.created_at) {
              imageCategories.splice(i - 1, 1);
              return false;
            }

            // If the deleted category is not found and the proper placeholder
            // has not been removed before the inner loop ends, the last placeholder
            // in the array must be removed
            if (i === imageCategories.length - 1) {
              imageCategories.splice(i, 1);
            }

            // The inner loop returns null
            return null;
          });
        });
      }

      // Return the updated state of the user's images
      return state;
    }

    // By default, return the current state of the user's images
    default:
      return state;
  }
}
