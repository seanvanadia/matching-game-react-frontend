import axios from 'axios';

export const ADD_CATEGORY = 'add-category';
export const ADD_IMAGE = 'add-image';
export const AUTH_ERROR = 'auth-error';
export const AUTH_USER = 'auth-user';
export const CLEAR_NAVIGATION_ALERT = 'clear-navigation-alert';
export const DELETE_CATEGORY = 'delete-category';
export const DELETE_IMAGE = 'delete-image';
export const DELETE_USER = 'delete-user';
export const DISABLE_WARNINGS = 'disable-warnings';
export const FETCH_CATEGORY = 'fetch-category';
export const FETCH_CATEGORY_TITLES = 'fetch-category-titles';
export const FETCH_CATEGORY_IMAGE = 'fetch-category-image';
export const FETCH_NON_CAT_IMAGES = 'fetch-non-cat-images';
export const FETCH_IMAGE = 'fetch-image';
export const FETCH_IMAGE_CATEGORIES = 'fetch-image-categories';
export const FETCH_IMAGES = 'fetch-images';
export const FETCH_WIN_TOTAL = 'fetch-win-total';
export const NOT_ENOUGH_IMAGES = 'not-enough-images';
export const REMOVE_SERVER_ERRORS = 'remove-server-errors';
export const SERVER_ERRORS = 'server-errors';
export const UNAUTH_USER = 'unauth-user';
export const UPDATE_CATEGORY_IMAGES = 'update-category-images';
export const UPDATE_CATEGORY_NAME = 'update-category-name';
export const UPDATE_IMAGE = 'update-image';
export const UPDATE_WIN_TOTAL = 'update-win-total';
export const VISITED_HOME = 'visited-home';
export const VISITED_IMAGES = 'visited-images';

const API_ROOT_URL = process.env.NODE_ENV === 'production'
  ? 'https://matching-game-sv-backend-api.herokuapp.com/api/v1'
  : 'http://34.201.33.193:8080/api/v1';

// COMMON FUNCTIONS //

function authenticatedRequestConfig() {
  // Return the configuration required for any authenticated request
  return { headers: { 'X-User-Token': localStorage.token, 'X-User-Email': localStorage.email } };
}

function handleError(response, request, expectedErrCode, type, redirectToLanding) {
  // If the server responds...
  if (response) {
    const { status, statusText } = response;
    let errorText = '';

    // If the error code the server returned is the error code that is
    // expected to occur (based on the type of request sent), execute the
    // proper error action with the error data returned by the server
    if (status === expectedErrCode) {
      return {
        type,
        payload: response.data.errors
      };
    }

    // If the error code the server returned is NOT the error code that is
    // expected to occur (based on the type of request sent), take specific
    // action based on the error code returned

    // 400 Bad Request
    if (status === 400) {
      errorText = 'The request was not properly formed. Please modify your input and try again.';
    }

    // 401 Unauthorized
    else if (status === 401) {
      // Remove token and email from local storage
      localStorage.removeItem('token');
      localStorage.removeItem('email');

      // If the user is on the signout page, redirect them to the landing page
      if (window.location.pathname === '/signout') {
        redirectToLanding();
      }

      // Execute unauth user action
      return {
        type: UNAUTH_USER,
        payload: response.data.errors
      };
    }

    // 404 Not Found
    else if (status === 404) {
      errorText = 'A request was made to a location that could not be found. Please refresh the page or try again.';
    }

    // 422 Unprocessable Entity
    else if (status === 422) {
      errorText = 'That request is not currently permitted by the server. Please modify your input or try again later.';
    }

    // 500 Internal Server Error
    else if (status === 500) {
      errorText = 'Something went wrong with the server. Please refresh the page or try again.';
    }

    // All Other Error Codes
    else {
      errorText = 'Something went wrong when communicating with the server. Please modify your input, refresh the page, or try again.';
    }

    // Formulate the error message object, which will be used to display
    // the error messge to the user
    const errorCodeText = `Error code: ${status} - ${statusText}`;
    const errorMessage = {
      text: errorText,
      codeText: errorCodeText
    };

    // Execute the server errors action with the formulated error message
    return {
      type: SERVER_ERRORS,
      payload: [errorMessage]
    };
  }

  // If the request was properly formulated, but the server did not
  // respond, execute the server errors action with the appropriate payload
  if (request && !response) {
    return {
      type: SERVER_ERRORS,
      payload: [
        // Error Message
        'Sorry! The server is not responding. Please check your internet connection or try again later.',

        // Boolean indicating whether or not the error occurred during a get request
        !expectedErrCode
      ]
    };
  }

  // If the request was not properly formulated, execute the server errors
  // action with the appropriate error message
  return {
    type: SERVER_ERRORS,
    payload: ['Sorry! Something went wrong with the request. Please refresh the page!']
  };
}

function handleFetchAPIError(error, dispatch) {
  // Initial variables' values are for when the request was not properly formulated
  let request = false;
  let response = false;

  // Change the variables' values if the server responded
  if (error.name === 'Error') {
    const errorStr = error.message;
    const colonIndex = errorStr.indexOf(':');
    response = {
      status: parseInt(errorStr.slice(0, colonIndex), 10),
      statusText: errorStr.slice(colonIndex + 2, errorStr.length),
      data: {}
    };
    request = true;
  }

  // Change the variables' values if the request was properly formulated,
  // but the server did not respond
  else if (error.message === 'Failed to fetch') {
    request = true;
    response = false;
  }

  // Handle the error with the adjusted values for the error request and response
  dispatch(handleError(response, request, null, SERVER_ERRORS));
}

function handleResponse(payload, dispatch, type, callback, manyToManyVar) {
  // If a value has been passed in for the manyToManyVar (additional
  // information required to execute an action that affects both
  // categories and images), include that value in the dispatch object
  const dispatchObj = manyToManyVar ? { type, payload, manyToManyVar } : { type, payload };

  // Dispatch the action
  dispatch(dispatchObj);

  // Execute the callback
  if (callback) {
    callback();
  }
}

// AUTHENTICATION ACTIONS //

export function signinUser({ email, password }, errorCallback, successCallback) {
  return (dispatch) => {
    // Remove whitespace from the beginning and end of the email address,
    // and convert it to lowercase
    const trimmedEmail = email.trim().toLowerCase();

    axios.post(`${API_ROOT_URL}/sessions`, { email: trimmedEmail, password })
      .then((response) => handleResponse(null, dispatch, AUTH_USER, () => {
        // Store the token an email in local storage
        localStorage.setItem('token', response.data.authentication_token);
        localStorage.setItem('email', response.data.email);

        successCallback();
      }))

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 401, AUTH_ERROR));
      });
  };
}

export function signupUser({ email, password }, errorCallback, successCallback) {
  return (dispatch) => {
    // Remove whitespace from the beginning and end of the email address,
    // and convert it to lowercase
    const trimmedEmail = email.trim().toLowerCase();

    axios.post(`${API_ROOT_URL}/users`, { email: trimmedEmail, password })
      .then((response) => handleResponse(null, dispatch, AUTH_USER, () => {
        // Store the token and email in local storage
        localStorage.setItem('token', response.data.authentication_token);
        localStorage.setItem('email', response.data.email);

        successCallback();
      }))

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 422, AUTH_ERROR));
      });
  };
}

export function signoutUser(successCallback, errorRedirect, sessionTimedOut) {
  return (dispatch) => {
    axios.delete(`${API_ROOT_URL}/sessions`, authenticatedRequestConfig())
      .then(() => {
        // Initial variables' values are for a typical signout
        let payload = null;
        let type = UNAUTH_USER;

        // If the user was signed out due to a session timeout, prepare to display
        // an appropriate error message
        if (sessionTimedOut) {
          payload = ['Your session expired. Please sign in again to continue.'];
          type = AUTH_ERROR;
        }

        // Handle the response
        handleResponse(payload, dispatch, type, () => {
          // Remove the token and email from local storage
          localStorage.removeItem('token');
          localStorage.removeItem('email');

          successCallback();

          // Function returns null
          return null;
        });
      })

      // Handle any error that occurred during the signout request
      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, AUTH_ERROR, errorRedirect));
      });
  };
}

export function resetServerInactivityTimer() {
  // Force the server to reset its user inactivity timer (will be called periodically)
  axios.put(`${API_ROOT_URL}/sessions`, null, authenticatedRequestConfig());

  // Response does not require action on the client side
  return { type: null };
}

export function deleteUser(errorCallback, successCallback) {
  return (dispatch) => {
    axios.delete(`${API_ROOT_URL}/users`, authenticatedRequestConfig())
      .then(() => handleResponse(null, dispatch, UNAUTH_USER, () => {
        // Remove the token and email from local storage
        localStorage.removeItem('token');
        localStorage.removeItem('email');

        successCallback();
      }))

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 400, SERVER_ERRORS));
      });
  };
}

// If there was an error with an authentication process, execute the auth error action
export function authError(error) {
  return {
    type: AUTH_ERROR,
    payload: error
  };
}

// IMAGE ACTIONS //

export function fetchImage(imageId, imageIndex, callback) {
  return (dispatch) => {
    // Fetch the image
    fetch(`${API_ROOT_URL}/images/${imageId}`, authenticatedRequestConfig())
      // If there is an error, throw an error
      .then((res) => {
        if (!res.ok) {
          throw Error(`${res.status}: ${res.statusText}`);
        }
        return res;
      })
      // If there is no error, then turn the response into a blob
      .then((res) => res.blob())
      // Then...
      .then((blob) => {
        // Dispatch the action using a temporary blob url
        dispatch(
          {
            type: FETCH_IMAGE,
            payload: { blobUrl: URL.createObjectURL(blob), imageIndex }
          }
        );

        // Execute the callback
        callback();
      })

      // Handle any errors during the fetch request
      .catch((error) => handleFetchAPIError(error, dispatch));
  };
}

export function addImage(values, config, categoryIds, errorCallback, successCallback) {
  return (dispatch) => {
    axios.post(`${API_ROOT_URL}/images`, values, config)
      .then((response) => {
        handleResponse(response, dispatch, ADD_IMAGE, successCallback, categoryIds);
      })

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 422, SERVER_ERRORS));
      });
  };
}

export function fetchImageCategories(id, imgIndex, pageNumber, callback) {
  return (dispatch) => {
    axios.get(`${API_ROOT_URL}/images/${id}?pg_num=${pageNumber}`, authenticatedRequestConfig())
      .then((response) => {
        // Attach the index of the fetched image to the response data meta object
        if (response.data) {
          response.data.meta.imgIndex = imgIndex;
        }

        // Handle the response
        handleResponse(response, dispatch, FETCH_IMAGE_CATEGORIES, callback);
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, SERVER_ERRORS));
      });
  };
}

export function fetchImages(numberOfImages, pageNumber, callback) {
  return (dispatch) => {
    axios.get(`${API_ROOT_URL}/images?num_imgs=${numberOfImages}&pg_num=${pageNumber}`, authenticatedRequestConfig())
      .then((response) => {
        // Attach the number of images requested to the response data object
        response.data.meta.numberOfImagesRequested = numberOfImages;

        // Handle the response
        handleResponse(response, dispatch, FETCH_IMAGES);

        // Execute the callback
        callback(response.data);
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, SERVER_ERRORS));
      });
  };
}

export function updateImage(
  id, imgIndex, categoryIds, catStatuses, errorCallback, successCallback
) {
  return (dispatch) => {
    axios.put(`${API_ROOT_URL}/images/${id}`, { category_ids: categoryIds }, authenticatedRequestConfig())
      .then((response) => {
        // Attach the index of the updated image and its category statuses to the response object
        response.imgIndex = imgIndex;
        response.catStatuses = catStatuses;

        // Handle the response
        handleResponse(response, dispatch, UPDATE_IMAGE, successCallback, categoryIds);
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 400, SERVER_ERRORS));
      });
  };
}

export function deleteImage(
  img, imgIndex, categoryIds, replacementImgIndex, errorCallback, successCallback
) {
  return (dispatch) => {
    axios.delete(`${API_ROOT_URL}/images/${img.id}?replacement_img_index=${replacementImgIndex}`, authenticatedRequestConfig())
      .then((response) => {
        // Attach the deleted image object and its index to the response object
        response.img = img;
        response.imgIndex = imgIndex;

        // If a replacement image was fetched, attach the replacement image index
        // to the response object
        if (replacementImgIndex) {
          response.replacementImgIndex = replacementImgIndex;
        }

        // Handle the response
        handleResponse(response, dispatch, DELETE_IMAGE, successCallback, categoryIds);
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 400, SERVER_ERRORS));
      });
  };
}

// CATEGORY ACTIONS //

export function addCategory(title, maxImgsPerPage, errorCallback, successCallback) {
  return (dispatch) => {
    axios.post(`${API_ROOT_URL}/categories`, { title, num_imgs: maxImgsPerPage }, authenticatedRequestConfig())
      .then((response) => handleResponse(response, dispatch, ADD_CATEGORY, successCallback))

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 422, SERVER_ERRORS));
      });
  };
}

export function fetchCategory(
  id, imgIndexes, numberOfImages, pageNumber, callback, firstGameRequest, firstCatsRequest
) {
  return (dispatch) => {
    axios.get(`${API_ROOT_URL}/categories/${id}?img_indexes=${imgIndexes}&num_imgs=${numberOfImages}&pg_num=${pageNumber}&first_game_request=${firstGameRequest}&first_cats_request=${firstCatsRequest}`, authenticatedRequestConfig())
      .then((response) => {
        if (response.data) {
          // Attach the number of images requested to the response data meta object
          response.data.meta.numberOfImagesRequested = numberOfImages;
        }

        // Handle the response
        handleResponse(response, dispatch, FETCH_CATEGORY);

        // Execute the callback
        callback(response.data);
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, SERVER_ERRORS));
      });
  };
}

export function fetchCategoryTitles(numberOfCategories, pageNumber, callback, extraCat) {
  return (dispatch) => {
    axios.get(`${API_ROOT_URL}/categories?titles_only=true&num_cats=${numberOfCategories}&pg_num=${pageNumber}&add_one_cat=${extraCat}`, authenticatedRequestConfig())
      .then((response) => {
        // Attach the number of categories requested to the response data meta object
        response.data.meta.numberOfCategoriesRequested = numberOfCategories;

        // Handle the response
        handleResponse(response, dispatch, FETCH_CATEGORY_TITLES, callback);
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, SERVER_ERRORS));
      });
  };
}

export function fetchCategoryImage(imageId, imagePathname, categoryIndex, callback, isNonCatImage) {
  return (dispatch) => {
    // Fetch the image
    fetch(`${API_ROOT_URL}/images/${imageId}`, authenticatedRequestConfig())
      // If there is an error, throw an error
      .then((res) => {
        if (!res.ok) {
          throw Error(`${res.status}: ${res.statusText}`);
        }
        return res;
      })
      // If there is no error, then turn the response into a blob
      .then((res) => res.blob())
      // Then...
      .then((blob) => {
        // Create a temporary blob url from the blob
        const blobUrl = URL.createObjectURL(blob);

        // Dispatch the action
        dispatch(
          {
            type: FETCH_CATEGORY_IMAGE,
            payload: {
              blobUrl,
              categoryIndex,
              isNonCatImage,
              oldImageSrc: imagePathname
            }
          }
        );

        // Execute the callback
        callback(blobUrl);
      })

      // Handle any errors during the fetch request
      .catch((error) => handleFetchAPIError(error, dispatch));
  };
}

export function fetchNonCatImages(catIndex, catId, numImgs, pageNumber, offset, callback) {
  return (dispatch) => {
    axios.get(`${API_ROOT_URL}/images?cat_id=${catId}&num_imgs=${numImgs}&pg_num=${pageNumber}&offset=${offset}`, authenticatedRequestConfig())
      .then((response) => {
        // Redefine the response.data.meta object
        response.data.meta = {
          ...response.data.meta, catIndex, numberOfImagesRequested: numImgs, offset
        };

        // Handle the response
        handleResponse(response, dispatch, FETCH_NON_CAT_IMAGES);

        // Execute the callback
        callback(response.data);
      })

      // Handle any errors during the fetch request
      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, SERVER_ERRORS));
      });
  };
}

export function updateCategoryName(title, id, errorCallback, successCallback) {
  return (dispatch) => {
    axios.put(`${API_ROOT_URL}/categories/${id}`, { title }, authenticatedRequestConfig())
      .then((response) => handleResponse(response, dispatch, UPDATE_CATEGORY_NAME, successCallback))

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 400, SERVER_ERRORS));
      });
  };
}

export function updateCategoryImages(imageIds, id, imgStatuses, errorCallback, successCallback) {
  return (dispatch) => {
    axios.put(`${API_ROOT_URL}/categories/${id}`, { image_ids: imageIds }, authenticatedRequestConfig())
      .then((response) => {
        // Attach imageIds to the response data meta object
        if (!response.data.meta) {
          response.data.meta = { imageIds };
        }

        // Attach imgStatuses to the response object
        response.imgStatuses = imgStatuses;

        // Handle the response
        handleResponse(
          response, dispatch, UPDATE_CATEGORY_IMAGES, successCallback, imageIds
        );
      })

      // Handle any error that occurred during the request
      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 400, SERVER_ERRORS));
      });
  };
}

export function deleteCategory(
  id,
  imageIds,
  numImgsToRequest,
  catTitleIndexToFetch,
  deletedCatCreatedAt,
  errorCallback,
  successCallback
) {
  return (dispatch) => {
    axios.delete(`${API_ROOT_URL}/categories/${id}?num_imgs=${numImgsToRequest}&cat_title_index=${catTitleIndexToFetch}`, authenticatedRequestConfig())
      .then((response) => {
        // If the response does not contain meta data, add a meta object to the response data
        if (!response.data.meta) {
          response.data = {
            meta: { deletedCatId: id, deletedCatCreatedAt, numImgsRequested: numImgsToRequest }
          };
        }

        // If the response contains meta data, alter the meta data object properties
        else {
          response.data.meta.deletedCatId = id;
          response.data.meta.numImgsRequested = numImgsToRequest;
          response.data.meta.replacementIndex = catTitleIndexToFetch;
        }

        // Handle the response
        handleResponse(response, dispatch, DELETE_CATEGORY, successCallback, imageIds);
      })

      // Handle any error that occurred
      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 422, SERVER_ERRORS));
      });
  };
}

// WIN TOTAL ACTIONS //

export function fetchWinTotal(callback) {
  return (dispatch) => {
    axios.get(`${API_ROOT_URL}/win-total`, authenticatedRequestConfig())
      .then((response) => handleResponse(response, dispatch, FETCH_WIN_TOTAL, callback))

      .catch((error) => {
        dispatch(handleError(error.response, error.request, null, SERVER_ERRORS));
      });
  };
}

export function updateWinTotal(total, errorCallback, successCallback) {
  return (dispatch) => {
    axios.put(`${API_ROOT_URL}/win-total/1`, { total }, authenticatedRequestConfig())
      .then((response) => handleResponse(response, dispatch, UPDATE_WIN_TOTAL, successCallback))

      .catch((error) => {
        errorCallback();
        dispatch(handleError(error.response, error.request, 400, SERVER_ERRORS));
      });
  };
}

// NAVIGATION ALERT ACTIONS //
// (actions executed to trigger alerts and prevent navigation under certian conditions) //

// When a user visits the home page without having any categories...
export function visitedHome() {
  return {
    type: VISITED_HOME
  };
}

// When a user visits the home page without having enough images to play the game...
export function notEnoughImages() {
  return {
    type: NOT_ENOUGH_IMAGES
  };
}

// When a user visits the images page without having any categories...
export function visitedImages() {
  return {
    type: VISITED_IMAGES
  };
}

// When a navigation alert is to be cleared...
export function clearNavigationAlert() {
  return {
    type: CLEAR_NAVIGATION_ALERT
  };
}

// When navigation warnings are to be disabled...
export function disableWarnings() {
  return {
    type: DISABLE_WARNINGS
  };
}

// REMOVE SERVER ERRORS ACTION //
// (clears server errors from the application state) //

export function removeServerErrors() {
  return {
    type: REMOVE_SERVER_ERRORS
  };
}
