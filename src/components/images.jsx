import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  ceil,
  clone,
  concat,
  difference,
  forEach,
  includes,
  keys,
  map
} from 'lodash-es';

import {
  defaultPageNumber,
  manageKeyboardAccessibility,
  maxImagesPerPage,
  numOfPages,
  preventModalTabEscape,
  serverErrorsInvisibleBackground
} from '../utils';

import {
  addImage,
  fetchImageCategories,
  fetchImages,
  fetchCategoryTitles,
  updateImage,
  deleteImage,
  clearNavigationAlert,
  visitedImages
} from '../actions';

import Animation from './animation';
import Header from './header';
import Image from './image';
import Loader from './loader';
import PaginationNav from './pagination_nav';
import ServerErrorsPopup from './server_errors_popup';
import styles from '../style/images.css';

class Images extends Component {
  static elementMaxHeight(initialMaxHeight, surroundingRefs) {
    let maxHeight = initialMaxHeight;

    // For all the element's surrounding element refs...
    forEach(surroundingRefs, (ref) => {
      // If the ref exists, subtract its height from the maxHeight calculated to this point
      if (ref) {
        maxHeight -= ref.getBoundingClientRect().height;
      }

      // Else prepare to return null (meaning there will be no max height) and end the loop
      else {
        maxHeight = null;
        return false;
      }

      return null;
    });

    // Return the element's max height
    return maxHeight;
  }

  static getImgOrientation(fileReaderResult) {
    // Returned value meanings:
    //   -2: img is not jpeg
    //   -1: orientation is undefined
    //   All else: exif orientation integer

    const view = new DataView(fileReaderResult);
    if (view.getUint16(0, false) !== 0xFFD8) {
      return -2;
    }

    const length = view.byteLength;
    let offset = 2;
    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) return -1;
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xFFE1) {
        if (view.getUint32(offset += 2, false) !== 0x45786966) {
          return -1;
        }

        const little = view.getUint16(offset += 6, false) === 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i += 1) {
          if (view.getUint16(offset + (i * 12), little) === 0x0112) {
            return view.getUint16(offset + (i * 12) + 8, little);
          }
        }
      }

      else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      }

      else {
        offset += view.getUint16(offset, false);
      }
    }

    return -1;
  }

  static alteredImgCanvas(img, imgOrientation) {
    const canvas = document.createElement('canvas');
    const maxWidth = 700;
    const maxHeight = 700;
    let { width, height } = img;

    // Redefine the image/canvas dimensions based on max dimensions
    if (width > height && width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    } else if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }

    // If image is to be rotated, switch values of image/canvas height and width
    if (imgOrientation >= 3 && imgOrientation <= 8) {
      const oldWidth = width;
      width = height;
      height = oldWidth;
    }

    // Set the canvas dimensions to the proper dimensions, and define the context
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // If the image needs to be rotated, resize and rotate it
    if (imgOrientation >= 3 && imgOrientation <= 8) {
      // Define the number of degrees to rotate the image
      let deg = 90; // Orientation is 5 or 6
      if (imgOrientation === 3 || imgOrientation === 4) {
        deg = 180;
      } else if (imgOrientation === 7 || imgOrientation === 8) {
        deg = -90;
      }

      // Define and save the initial canvas context
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Translate and rotate the context
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(deg * (Math.PI / 180));

      // Draw the image
      ctx.drawImage(img, -height / 2, -width / 2, height, width);

      // Restore the context
      ctx.restore();
    }

    // If the image does not need to be rotated, simply draw it
    else {
      ctx.drawImage(img, 0, 0, width, height);
    }

    // Return the altered image canvas
    return canvas;
  }

  static base64ImgToBlob(base64DataUrl, fileType) {
    const byteCharacters = atob(base64DataUrl.split(',')[1]);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i += 1) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: fileType });
  }

  static renderNotEnoughImagesAlert(isAriaHidden) {
    return (
      <div
        className={`
          alert
          alert-danger
          text-center
          ${styles['not-enough-images-alert']}
        `}
        role="alert"
        aria-hidden={isAriaHidden}
      >
        You must have at least two images in one category to play the game!
      </div>
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      windowHeight: window.innerHeight,
      categoryPageNum: 1,
      componentIsLoading: true,
      notEnoughAlert: false,
      reloadRefs: false,
      updateImageIndex: null,
      imageMaxHeight: null,
      deleteImageIndex: null,
      addImageModalRendered: false,
      isCheckboxChecked: [],
      initialImageCategoryIds: [],
      imageFile: null,
      savedAnimation: false,
      deletedAnimation: false,
      requestPending: false,
      imageHeight: null,
      noImagesEmojiMaxHeight: null,
      updateModalCheckboxesMaxHeight: null,
      addImageModalCheckboxesMaxHeight: null,
      rerender: false,
      pageNumber: null,
      maxImagesPerPage: null
    };

    // Bind this to all necessary functions
    this.updateDimensions = this.updateDimensions.bind(this);

    // Add event listeners
    window.addEventListener('resize', this.updateDimensions);
    window.addEventListener(
      'keydown',
      (e) => {
        const { deletedAnimation, requestPending, savedAnimation } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          requestPending || savedAnimation || deletedAnimation
        );
      }
    );
  }

  componentDidMount() {
    const { props } = this;
    const { fetchImages } = props;
    const maxImgsPerPage = maxImagesPerPage();
    let { match: { params: { pageId } } } = props;

    // Ensure page id of number 1 or greater
    if (!(pageId > 0)) {
      pageId = 1;
    }

    // If categories have been fetched and the user has none, redirect to categories page
    if (props.categories && props.categories.length === 0) {
      this.redirectToCatPage();
    }

    // If no images or categories have been fetched...
    else if (!props.images && !props.categories) {
      const { fetchCategoryTitles } = this.props;

      // Fetch the first eleven category titles, then...
      fetchCategoryTitles(11, 1, () => {
        const { categories } = this.props;

        // If the user has no categories, redirect to the categories page
        if (categories.length === 0) {
          this.redirectToCatPage();
        }

        // Otherwise fetch the page's images,
        // then determine whether to redirect or set the mounted state
        else {
          fetchImages(maxImgsPerPage, pageId, () => this.redirectOrSetMountedState());
        }
      });
    }

    // If the user has at least one category...
    else {
      // Determine whether any categories need to be fetched
      let catsNeedToBeFetched = false;
      for (let i = 0; i < 10 && i < props.categories.length; i += 1) {
        if (props.categories[i] === undefined) {
          catsNeedToBeFetched = true;
          i = 10;
        }
      }

      // If there is no data for images but some data for categories
      if (!props.images && props.categories) {
        // If some categories need to be fetched...
        if (catsNeedToBeFetched) {
          const { fetchCategoryTitles } = this.props;

          // Fetch the needed category titles, then...
          fetchCategoryTitles(11, 1, () => {
            // Fetch the page's images,
            // then determine whether to redirect or set the mounted state
            fetchImages(maxImgsPerPage, pageId, () => this.redirectOrSetMountedState());
          });
        }

        // If all needed categories have been fetched, fetch the page's images,
        // then determine whether to redirect or set the mounted state
        else {
          fetchImages(maxImgsPerPage, pageId, () => this.redirectOrSetMountedState());
        }
      }

      // If there is some data for images and categories, but not all the
      // needed categories have been fetched, fetch the needed category titles,
      // then determine whether to redirect or set the mounted state
      else if (catsNeedToBeFetched) {
        const { fetchCategoryTitles } = this.props;

        fetchCategoryTitles(11, 1, () => this.redirectOrSetMountedState());
      }

      // If there is some data for images and categories, and all the
      // needed categories have been fetched, determine whether to redirect
      // or set the mounted state
      else {
        this.redirectOrSetMountedState();
      }
    }
  }

  componentWillUnmount() {
    const { navigationAlert, clearNavigationAlert } = this.props;

    // Clear any navigation alert that has not been set on this page
    if (navigationAlert && navigationAlert !== 'visited-images') {
      clearNavigationAlert();
    }

    // Remove event listeners
    window.removeEventListener('resize', this.updateDimensions);
    window.removeEventListener(
      'keydown',
      (e) => {
        const { deletedAnimation, requestPending, savedAnimation } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          requestPending || savedAnimation || deletedAnimation
        );
      }
    );
  }

  onAddImage() {
    // Request is pending
    this.setState({ requestPending: true });

    const { addImage } = this.props;
    const { imageFile } = this.state;
    let { isCheckboxChecked } = this.state;

    // Define the new image's category ids
    const categoryIds = isCheckboxChecked;

    // Authenticated file-containing form config
    const config = {
      headers: {
        'content-type': 'multipart/form-data',
        'X-User-Token': localStorage.token,
        'X-User-Email': localStorage.email
      }
    };

    // Define the orientation reader
    const orientationReader = new FileReader();

    // When the orientation reader loads, store the img orientation as a const
    // and define the image reader onload function...
    orientationReader.onload = (e) => {
      const orientation = Images.getImgOrientation(e.target.result);
      const imgReader = new FileReader();

      // When the image reader loads, resize, rotate if required, and send addImage request
      imgReader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;

        // Once the newly created image element loads, resize, rotate if required,
        // and send addImage request
        img.onload = () => {
          const canvas = Images.alteredImgCanvas(img, orientation);
          const { type } = imageFile;
          const blob = Images.base64ImgToBlob(canvas.toDataURL(type), type);

          // Create the form data to be sent with the request
          const formData = new FormData();
          formData.append('image', blob);
          formData.append('file_name', imageFile.name);
          formData.append('category_ids', categoryIds);

          // Prepare to reset checked checkboxes state to reflect that no boxes are checked
          isCheckboxChecked = [];

          // Initial set state object for after form submission
          const setStateObj = {
            isCheckboxChecked,
            imageFile: null,
            addImageModalRendered: false,
            categoryPageNum: 1,
            notEnoughAlert: false
          };

          // Add image request
          addImage(
            formData,
            config,

            // Pass category ids to the action to update the app state easily
            categoryIds,

            // Error callback - request is no longer pending
            () => this.setState({ requestPending: false }),

            // Success callback
            () => {
              // Ensure the user is redirected to page 1 after adding a new image
              if (window.location.pathname !== '/images/pg-1') {
                const { fetchImages, history, images } = this.props;

                // If any of the first page's images have not yet been fetched, fetch them
                if (includes(images.slice(0, maxImagesPerPage()), undefined)) {
                  fetchImages(
                    maxImagesPerPage(),
                    1,

                    // After the first page's images have been fetched, redirect to page 1
                    () => {
                      this.setState({ pageNumber: 1, categoryPageNum: 1 });
                      history.push('/images/pg-1');
                    }
                  );
                }

                // If the first page's images have already been fetched, redirect to page 1
                else {
                  this.setState({ pageNumber: 1, categoryPageNum: 1 });
                  history.push('/images/pg-1');
                }
              }

              // Set the state to render the saved animation,
              // passing in this function's setState object
              this.setAnimationState(setStateObj, 'saved');
            }
          );
        };
      };

      // Read the image file as a data url
      imgReader.readAsDataURL(imageFile);
    };

    // Read the image file as an array buffer to get the exif orientation
    orientationReader.readAsArrayBuffer(imageFile);
  }

  onUpdateImage() {
    const { initialImageCategoryIds, isCheckboxChecked, updateImageIndex } = this.state;
    const { images, updateImage } = this.props;

    // Image's category ids that need to be updated
    const categoryIds = concat(
      difference(isCheckboxChecked, initialImageCategoryIds),
      difference(initialImageCategoryIds, isCheckboxChecked)
    );

    // Define the ids of the image's categories to be updated
    const updateImageCatIds = [];
    forEach(images[updateImageIndex].categories, (cat) => {
      if (cat) {
        updateImageCatIds.push(cat.id);
      }

      return null;
    });

    // Define the catStatuses array, with 'R' if the category is to be removed
    // from the image, and 'A' if it is to be added (structured with the
    // same sequence as categoryIds)
    const catStatuses = [];
    forEach(categoryIds, (catId) => {
      if (includes(updateImageCatIds, catId)) {
        catStatuses.push('R');
      } else {
        catStatuses.push('A');
      }

      return null;
    });

    // Initial set state object for after form submission
    const setStateObj = {
      updateImageIndex: null,
      isCheckboxChecked: [],
      categoryPageNum: 1,
      notEnoughAlert: false
    };

    // If the user tries to submit the same image categories as they started with, set the state to
    // render the saved animation immediately, passing in this function's setState object
    if (categoryIds.length === 0) {
      this.setAnimationState(setStateObj, 'saved');
    }

    // Else...
    else {
      // Request is pending
      this.setState({ requestPending: true });

      const { images } = this.props;

      // Send update image request
      updateImage(
        images[updateImageIndex].id,
        updateImageIndex,
        categoryIds,
        catStatuses,

        // Error callback - request is no longer pending
        () => this.setState({ requestPending: false }),

        // Success callback - set the state to render the saved animation,
        // passing in this function's setState object
        () => this.setAnimationState(setStateObj, 'saved')
      );
    }
  }

  onDeleteImage() {
    // Request is pending
    this.setState({ requestPending: true });

    const { deleteImage, images } = this.props;
    const { deleteImageIndex, pageNumber } = this.state;
    const imageToBeDeleted = clone(images[deleteImageIndex]);

    // Define the image's category ids
    const categoryIds = [];
    forEach(imageToBeDeleted.categories, (cat) => {
      if (cat) {
        categoryIds.push(cat.id);
      }

      return null;
    });

    // Store the index of the image that will potentially replace the last page's image
    // after the image to be deleted gets deleted
    let replacementImgIndex = pageNumber * maxImagesPerPage();

    // If the potential replacement image has already been fetched, or the replacement
    // image index is outside the scope of the images array (i.e. the user is on the last page),
    // do not fetch a replacement image
    if (images[replacementImgIndex] || replacementImgIndex > images.length - 1) {
      replacementImgIndex = null;
    }

    // Remove the categories from the image to be deleted
    delete imageToBeDeleted.categories;

    // Delete image request
    deleteImage(
      imageToBeDeleted,
      deleteImageIndex,

      // Pass category ids to the action to update the app state easily
      categoryIds,

      replacementImgIndex,

      // Error callback - request is no longer pending
      () => this.setState({ requestPending: false }),

      // Success callback
      () => {
        // Initial set state object for after image deletion
        const setStateObj = { deleteImageIndex: null };

        // If deleted image results in no images on page, redirect to the final page.
        // Either way, execute the callback below after the determination of
        // whether to redirect or not has been made.
        this.redirectIfPageHasNoImages(
          // Callback (to be executed regardless of whether or not redirect occurs)
          (newPageNumber) => {
            // If there is a new page number, prepare to set the page number state
            if (newPageNumber) {
              setStateObj.pageNumber = newPageNumber;
            }

            // Set the state to render the deleted animation,
            // passing in this function's setState object
            this.setAnimationState(setStateObj, 'deleted');
          }
        );
      }
    );
  }

  onClickCategoryPaginationButton(newCategoryPageNum) {
    const { categories, images } = this.props;
    const { updateImageIndex } = this.state;
    let needToFetchCats = false;
    let needToFetchImageCats = false;

    // Prepare to display the requested ten categories
    let lastIndex = (newCategoryPageNum * 10) - 1;
    let firstIndex = lastIndex - 9;

    // Adjust the firstIndex and lastIndex values if the user is on the last page
    if (newCategoryPageNum === ceil(categories.length / 10)) {
      lastIndex = categories.length - 1;
      const addend = categories.length % 10 === 0 ? 10 : categories.length % 10;
      firstIndex = lastIndex - (addend - 1);
    }

    // Determine whether category titles need to be fetched or not
    for (let i = firstIndex; i <= lastIndex; i += 1) {
      if (!categories[i]) {
        needToFetchCats = true;
        i = lastIndex + 1;
      }
    }

    // Determine whether or not an image's categories need to be fetched
    if (updateImageIndex !== null) {
      const imageCats = images[updateImageIndex].categories;
      const numImageCats = imageCats.length;

      if (newCategoryPageNum <= ceil(numImageCats / 10)) {
        lastIndex = (newCategoryPageNum * 10) - 1;
        firstIndex = lastIndex - 9;

        // Change values of firstIndex and lastIndex if user is on last page
        if (newCategoryPageNum === ceil(numImageCats / 10)) {
          lastIndex = numImageCats - 1;
          const addend = numImageCats % 10 === 0 ? 10 : numImageCats % 10;
          firstIndex = lastIndex - (addend - 1);
        }

        // Determine whether or not any of the image's categories need to be fetched
        for (let i = firstIndex; i <= lastIndex; i += 1) {
          if (!imageCats[i]) {
            needToFetchImageCats = true;
            i = lastIndex + 1;
          }
        }
      }
    }

    // If category titles and image categories need to be fetched...
    if (needToFetchCats && needToFetchImageCats) {
      // Request is pending
      this.setState({ requestPending: true });

      const { fetchCategoryTitles, fetchImageCategories } = this.props;

      // Fetch the needed category titles, then the image categories, and set the state
      fetchCategoryTitles(10, newCategoryPageNum, () => {
        const { images } = this.props;

        fetchImageCategories(
          images[updateImageIndex].id,
          updateImageIndex,
          newCategoryPageNum,
          () => {
            this.setState({ categoryPageNum: newCategoryPageNum, requestPending: false });
          }
        );
      });
    }

    // If only category titles need to be fetched, fetch them and set the state
    else if (needToFetchCats) {
      this.setState({ requestPending: true });

      const { fetchCategoryTitles } = this.props;

      fetchCategoryTitles(10, newCategoryPageNum, () => {
        this.setState({ categoryPageNum: newCategoryPageNum, requestPending: false });
      });
    }

    // If only image categories need to be fetched, fetch them and set the state
    else if (needToFetchImageCats) {
      this.setState({ requestPending: true });

      const { fetchImageCategories, images } = this.props;

      fetchImageCategories(
        images[updateImageIndex].id,
        updateImageIndex,
        newCategoryPageNum,
        () => {
          this.setState({ categoryPageNum: newCategoryPageNum, requestPending: false });
        }
      );
    }

    // If no categories need to be fetched, simply set the state
    else {
      this.setState({ categoryPageNum: newCategoryPageNum, requestPending: false });
    }
  }

  onChangePageNumber(newPageNumber) {
    const { fetchImages, images } = this.props;
    const { maxImagesPerPage } = this.state;

    // If any of the new page's images have not been fetched, fetch them,
    // then set the state to reflect the new page number
    if (
      includes(
        images.slice(
          (newPageNumber - 1) * maxImagesPerPage,
          newPageNumber * maxImagesPerPage
        ),
        undefined
      )
    ) {
      fetchImages(maxImagesPerPage, newPageNumber, () => {
        this.setState({ pageNumber: newPageNumber });
      });
    }

    // If all of the new page's images have already been fetched, set the page number state
    else {
      this.setState({ pageNumber: newPageNumber });
    }
  }

  setNewlyRenderedElementsDimensionalState(initialSetStateObj, animationType) {
    const setStateObj = clone(initialSetStateObj);
    const windowHeight = window.innerHeight;
    const {
      imageContainer,
      noImagesText,
      updateModalHeading,
      updateModalButtons,
      fileInputBtn,
      addImageModalHeading,
      addImageModalButtons
    } = this;

    // State keys of properties that may have to be updated
    const stateKeys = [
      'imageMaxHeight',
      'noImagesEmojiMaxHeight',
      'updateModalCheckboxesMaxHeight',
      'addImageModalCheckboxesMaxHeight'
    ];

    // Combined margins, padding, and borders of elements that need to be subtracted
    // from window dimensions to obtain the potentially new dimensional state value
    const noImagesMarginsAndPadding = 30;
    const modalMaxHeight = 0.9 * windowHeight;
    const addModalContentHeight = modalMaxHeight - 130; // 130 is total modal margins and padding
    const updateModalContentHeight = modalMaxHeight - 125; // 125 is total modal margins and padding

    // Potentially new values of state properties
    const newStatePropValues = [
      // Image max height (equal to the width of its square container, minus margins)
      imageContainer
        ? imageContainer.getBoundingClientRect().width - 30
        : null,

      // No images emoji max height
      noImagesText
        ? windowHeight - noImagesText.getBoundingClientRect().bottom
          - window.scrollY - noImagesMarginsAndPadding
        : null,

      // Update modal checkboxes max height
      Images.elementMaxHeight(
        updateModalContentHeight,
        [updateModalHeading, updateModalButtons]
      ),

      // Add image modal checkboxes max height
      Images.elementMaxHeight(
        addModalContentHeight,
        [fileInputBtn, addImageModalHeading, addImageModalButtons]
      )
    ];

    // For each potentially new value...
    forEach(newStatePropValues, (newStatePropValue, i) => {
      // If the rendered element in question exists, and its dimensions have changed,
      // Prepare to set the state with the new value
      if (newStatePropValue) {
        const { state } = this;
        const stateKey = stateKeys[i];

        if (state[stateKey] !== newStatePropValue) {
          setStateObj[stateKey] = newStatePropValue;
        }
      }
    });

    // If an animation is on screen, set the state, then set the state to
    // fade out and end the animation
    if (animationType) {
      this.setState(setStateObj, () => this.setEndAnimationState(animationType));
    }

    // Else simply set the state
    else {
      this.setState(setStateObj);
    }
  }

  setEndAnimationState(animationType) {
    const setStateObj = {};
    setStateObj[animationType] = false;

    // Remove the animation completely 1375 ms after it is rendered
    setTimeout(() => {
      this.setState(setStateObj);
    }, 1375);
  }

  setAnimationState(initialSetStateObj, type) {
    const { images } = this.props;
    const { addImageModalRendered } = this.state;
    const animationType = `${type}Animation`;
    const setStateObj = { ...initialSetStateObj, requestPending: false };
    setStateObj[animationType] = true;

    // If the user just added an image or deleted the last image,
    // set the state to render the animation, as well as the state of properties
    // dependent on the newly rendered elements' dimensions
    if (addImageModalRendered || images.length === 0) {
      this.setNewlyRenderedElementsDimensionalState(setStateObj, animationType);
    }

    // Else just set the state to render the animation
    else {
      this.setState(setStateObj, () => this.setEndAnimationState(animationType));
    }
  }

  setAddImageState() {
    // Set the state to display the add image modal
    this.setState({ addImageModalRendered: true },

      // After render...
      () => {
        // Focus on the file input button if device is not a touchscreen
        if (!document.body.classList.contains('touchscreen')) {
          this.fileInputBtn.focus();
        }

        // Set the state of properties dependent on the newly rendered elements' dimensions
        this.setNewlyRenderedElementsDimensionalState({});
      });
  }

  setUpdateImageState(imgIndex) {
    const { images } = this.props;
    const image = images[imgIndex];
    const initialImageCategoryIds = [];

    // Define all image category ids
    forEach(image.categories, (cat) => {
      if (cat) {
        initialImageCategoryIds.push(cat.id);
      }
    });

    // Define the inital value for the isCheckboxChecked array as the
    // initialImageCategoryIds array
    const isCheckboxChecked = initialImageCategoryIds.slice();

    // Set the state
    this.setState({
      initialImageCategoryIds,
      isCheckboxChecked,
      updateImageIndex: imgIndex
    },

    // After render, set the state of properties dependent on the
    // newly rendered elements' dimensions
    () => this.setNewlyRenderedElementsDimensionalState({}));
  }

  fetchImgCatsOrSetUpdateImgState(image) {
    const { images } = this.props;
    const { categoryPageNum } = this.state;
    const imageCats = image.categories;
    const lastIndex = categoryPageNum * 10;
    const startIndex = lastIndex - 10;
    const imgIndex = images.indexOf(image);

    // If the image's categories have not been fetched on this page, fetch them,
    // then set the update image state
    if (
      !imageCats
      || (
        imageCats
        && includes(imageCats.slice(startIndex, lastIndex), undefined)
      )
    ) {
      const { fetchImageCategories } = this.props;

      fetchImageCategories(image.id, imgIndex, categoryPageNum, () => {
        this.setUpdateImageState(imgIndex);
      });
    }

    // If all required image categories have been fetched, set the update image state
    else {
      this.setUpdateImageState(imgIndex);
    }
  }

  dimensionallyTriggeredRedirectIfPageHasNoImages(propsAlwaysUpdated) {
    // If a dimensional update caused the current page number to become obsolete,
    // (e.g. pg-4 may exist on phone size, but not on desktop size),
    // redirect the user to an existing page.
    // Either way, execute the callback below after the determination of
    // whether to redirect or not has been made.
    this.redirectIfPageHasNoImages(
      // Callback (to be executed regardless of whether or not redirect occurs)
      (newPageNumber) => {
        // If a new page number exists...
        if (newPageNumber) {
          // Set the page number state...
          this.setState({ pageNumber: newPageNumber },

            // Then set the state of properties dependent on the
            // page's newly rendered elements' dimensions,
            // as well as the state of the properties always to be updated
            () => this.setNewlyRenderedElementsDimensionalState(propsAlwaysUpdated));
        }

        // If a new page number does not exist, set the state of properties
        // dependent on newly rendered elements' dimensions,
        // as well as the state of the properties always to be updated
        else {
          this.setNewlyRenderedElementsDimensionalState(propsAlwaysUpdated);
        }
      }
    );
  }

  updateDimensions() {
    const { images } = this.props;
    const imageLength = images.length;
    const newMaxImagesPerPage = maxImagesPerPage();
    let { pageNumber } = this.state;

    // If updating dimensions results in a new page number,
    // store the new page number in the pageNumber variable
    if (newMaxImagesPerPage * pageNumber > imageLength) {
      pageNumber = numOfPages(imageLength);
    }

    // State properties that will always be updated when dimensions are updated
    const propsAlwaysUpdated = {
      windowHeight: window.innerHeight,
      maxImagesPerPage: newMaxImagesPerPage
    };

    // If any of the page's images have not been fetched...
    if (
      includes(
        images.slice(
          (pageNumber - 1) * newMaxImagesPerPage,
          pageNumber * newMaxImagesPerPage
        ),
        undefined
      )
    ) {
      const { fetchImages } = this.props;

      // Fetch the page's images
      fetchImages(
        newMaxImagesPerPage,
        pageNumber,

        // After setState, determine if a redirect is required,
        // and update the state with the props to always be updated
        () => this.dimensionallyTriggeredRedirectIfPageHasNoImages(propsAlwaysUpdated)
      );
    }

    // If all of the page's images have been fetched,
    // determine if a redirect is required, and update the state with the props to always be updated
    else {
      this.dimensionallyTriggeredRedirectIfPageHasNoImages(propsAlwaysUpdated);
    }
  }

  redirectOrSetMountedState() {
    const {
      navigationAlert,
      history,
      images,
      match: { params: { pageId } }
    } = this.props;
    const urlPageId = parseInt(pageId, 10);
    const defaultPageNum = defaultPageNumber(urlPageId, images.length);
    const isCheckboxChecked = [];

    // If there is no page number equal to the url page id, redirect to pg-1
    if (defaultPageNum !== urlPageId) {
      history.push('/images/pg-1');
    }

    // If the user tried to visit the game page, but did not have enough images to play,
    // Set a variable for an alert to be rendered on the images page
    const notEnoughAlert = navigationAlert === 'not-enough-images';

    // Set the state
    this.setState({
      notEnoughAlert,
      isCheckboxChecked,
      componentIsLoading: false,
      pageNumber: defaultPageNum,
      maxImagesPerPage: maxImagesPerPage()
    },
    // After render, set the state of properties dependent on the
    // newly rendered elements' dimensions
    () => this.setNewlyRenderedElementsDimensionalState({}));
  }

  redirectToCatPage() {
    const { history, visitedImages } = this.props;

    // Tell the app that the images page has been visited, and redirect to the categories page
    visitedImages();
    history.push('/categories');
  }

  redirectIfPageHasNoImages(callback) {
    const { history, images } = this.props;
    const { pageNumber } = this.state;
    const numberOfPages = numOfPages(images.length);
    const maxImgsPerPage = maxImagesPerPage();

    // If there are no images on the current page, and the current page is not page 1...
    if (pageNumber > numberOfPages && pageNumber !== 1) {
      // If any of the images on the page that the user will be
      // redirected to have not yet been fetched...
      if (
        includes(
          images.slice(
            (numberOfPages - 1) * maxImgsPerPage,
            numberOfPages * maxImgsPerPage
          ),
          undefined
        )
      ) {
        const { fetchImages } = this.props;

        // Fetch the images of the page the user will be redirected to,
        // then redirect to that page and execute the callback with argument numberOfPages
        fetchImages(maxImgsPerPage, numberOfPages, () => {
          history.push(`/images/pg-${numberOfPages}`);
          callback(numberOfPages);
        });
      }

      // If all of the images on the page that the user will be redirected to
      // have been fetched, redirect to that page and execute the callback
      // with argument numberOfPages
      else {
        history.push(`/images/pg-${numberOfPages}`);
        callback(numberOfPages);
      }
    }

    // If there are images on the current page, or the current page is page 1,
    // execute the callback with argument false
    callback(false);
  }

  renderModalCheckboxes(modalType) {
    const { props } = this;
    const { categoryPageNum, isCheckboxChecked, imageFile } = this.state;
    const categories = [];
    const categoryIndexes = [];
    let checkboxDivClassName = '';

    // Form the categories and categoryIndexes arrays from the categories redux state
    if (props.categories) {
      let lastIndex = (categoryPageNum * 10) - 1;
      let firstIndex = lastIndex - 9;

      // Change the values of firstIndex and lastIndex if the user is on the last page
      if (categoryPageNum === ceil(props.categories.length / 10)) {
        lastIndex = props.categories.length - 1;
        const addend = props.categories.length % 10 === 0 ? 10 : props.categories.length % 10;
        firstIndex = lastIndex - (addend - 1);
      }

      // Define categories and categoryIndexes arrays
      for (let i = firstIndex; i <= lastIndex; i += 1) {
        categories.push(props.categories[i]);
        categoryIndexes.push(i);
      }
    }

    // Define the checkboxes markup
    const checkboxes = map(categories, (category, i) => {
      if (category) {
        // Reset checkboxDivClassName to '' if the first checkbox has already been returned
        if (checkboxDivClassName === styles['first-checkbox']) {
          checkboxDivClassName = '';
        }

        // Style the first checkbox uniquely for spacing purposes
        else if (i === 0) {
          checkboxDivClassName = styles['first-checkbox'];
        }

        // Return the checkbox markup
        return (
          // Checkbox Div
          <div
            key={category.id}
            className={`checkbox ${checkboxDivClassName}`}
          >

            {/* Checkbox Label */}
            <label
              htmlFor={`category_ids${category.id}`}
              className={styles['category-label']}
            >

              {/* Checkbox Input */}
              <input
                type="checkbox"
                name={`category_ids${category.id}`}
                id={`category_ids${category.id}`}
                className={styles['category-checkbox']}
                checked={includes(isCheckboxChecked, category.id)}

                // Autofocus on first checkbox if rendering update modal
                // and device is not a touchscreen
                autoFocus={
                  modalType === 'update'
                  && !document.body.classList.contains('touchscreen')
                  && checkboxDivClassName === styles['first-checkbox']
                }

                // Set the checkbox state when the checkbox gets checked or unchecked
                onChange={() => {
                  this.setState(() => {
                    if (includes(isCheckboxChecked, category.id)) {
                      isCheckboxChecked.splice(isCheckboxChecked.indexOf(category.id), 1);
                    } else {
                      isCheckboxChecked.push(category.id);
                    }

                    return { isCheckboxChecked };
                  });
                }}

                // Submit the form upon pressing enter when focused on a checkbox
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    // If the update modal is rendered, submit update image form
                    if (modalType === 'update') {
                      this.onUpdateImage();
                    }

                    // If the add image modal is rendered and an image file has been selected,
                    // submit add image form
                    else if (imageFile) {
                      this.onAddImage();
                    }
                  }
                }}

                // Create a ref for the first checkbox
                ref={
                  checkboxDivClassName === styles['first-checkbox']
                    ? (firstCategoryOption) => {
                      this.firstCategoryOption = firstCategoryOption;
                    }
                    : null
                }
              />

              {/* Render the category title associated with this checkbox */}
              <span className={`text-with-max-width ${styles['category-checkbox-title']}`}>
                {category.title}
              </span>
            </label>
          </div>
        );
      }

      return null;
    });

    // Render the modal checkboxes markup
    return (
      <div>
        {/* Modal Checkboxes */}
        { checkboxes }

        {/* Render the category pagination navigation if the user has more
        than ten categories */}
        { props.categories.length > 10 ? this.renderCategoryPaginationNav() : null }
      </div>
    );
  }

  renderAddImageModal(isModalAriaHidden) {
    const { addImageModalCheckboxesMaxHeight, imageFile, requestPending } = this.state;
    const windowWidth = document.body.classList.contains('safari')
      ? document.getElementsByTagName('html')[0].clientWidth
      : window.innerWidth;
    let { isCheckboxChecked } = this.state;
    let btnSizeClassName = 'btn-lg';
    let animationWidth = '46px';

    if (windowWidth < 355) {
      btnSizeClassName = 'btn-md';
      animationWidth = '34px';
    }

    // The text display next to the file input button will be the file name
    // if a file has been chosen, otherwise it will read 'No file chosen'
    const imageFileText = imageFile ? imageFile.name : 'No file chosen';

    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Modal */}
        <div
          className={`alert alert-success pop-up ${styles['add-image-modal']}`}
          style={requestPending ? { overflow: 'hidden' } : {}}
        >

          {/* Modal Content */}
          <div className={`text-center ${styles['add-image-modal-body']}`}>

            {/* File Input Button Label (acts as real button for appearance purposes) */}
            <label
              htmlFor="image-file-input"
              className={`btn btn-primary ${styles['file-input-button']}`}
              role="button"

              // Make button focusable
              tabIndex="0"

              // Make input below clickable via keyboard enter or space on this button
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  this.fileInput.click();
                }
              }}

              ref={(fileInputBtn) => {
                this.fileInputBtn = fileInputBtn;
              }}
            >
              Choose File...

              {/* File Input (makes the button above functional) */}
              <input
                name="image"
                id="image-file-input"
                type="file"
                className={styles['file-input']}

                // Hide the button that wants to render by default
                hidden

                // Accept all image file types
                accept="image/*"

                // Set the state with the selected image to be uploaded
                onChange={(e) => this.setState({ imageFile: e.target.files[0] })}

                ref={(fileInput) => {
                  this.fileInput = fileInput;
                }}
              />
            </label>

            {/* Image File Text (file name or 'No file chosen') */}
            <div className={styles['image-file-text']}>
              {imageFileText}
            </div>

            {/* Horizontal Rule */}
            <hr className={styles['add-image-hr']} />

            {/* Heading For Checkboxes Section */}
            <h3
              className={styles['modal-heading']}
              ref={(addImageModalHeading) => {
                this.addImageModalHeading = addImageModalHeading;
              }}
            >
              Categories:
            </h3>

            {/* Category Checkboxes */}
            <div
              className={styles['category-checkboxes']}
              style={{ maxHeight: addImageModalCheckboxesMaxHeight }}
            >
              {this.renderModalCheckboxes('add')}
            </div>

            {/* Button Group */}
            <div
              className={styles['button-group']}
              ref={(addImageModalButtons) => {
                this.addImageModalButtons = addImageModalButtons;
              }}
            >

              {/* If the add image request has been submitted,
              render the loader component. Else render the upload image and cancel buttons. */}
              {
                requestPending
                  ? (
                    // Loader component
                    <div style={{ position: 'relative' }}>
                      <Loader
                        renderNoLoadingText
                        relativePosition
                        animationWidth={animationWidth}
                      />
                    </div>
                  )
                  : (
                    <div>
                      {/* Upload Image Button */}
                      <button
                        type="button"
                        className={`
                          btn
                          btn-primary
                          ${btnSizeClassName}
                          left-side-button
                          ${styles['upload-image-button']}
                        `}

                        // Disable button if there is no image file selected
                        disabled={!imageFile}

                        onClick={this.onAddImage.bind(this)}
                      >
                        Upload Image
                      </button>

                      {/* Cancel Button */}
                      <button
                        type="button"
                        className={`
                          btn
                          btn-danger
                          ${btnSizeClassName}
                          ${styles['cancel-image-button']}
                        `}
                        onKeyDown={(e) => preventModalTabEscape(
                          e.key,
                          () => e.preventDefault(),
                          () => this.fileInputBtn.focus()
                        )}
                        onClick={() => {
                          // Prepare to reset checked checkboxes state
                          // to reflect that no boxes are checked
                          isCheckboxChecked = [];

                          // Set the state
                          this.setState({
                            isCheckboxChecked,
                            imageFile: null,
                            addImageModalRendered: false,
                            categoryPageNum: 1
                          });
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )
              }

            </div>
          </div>
        </div>
      </div>
    );
  }

  renderCategoryPaginationNav() {
    const { categories } = this.props;
    const { categoryPageNum } = this.state;
    const lastPage = categories ? ceil(categories.length / 10) : null;
    const pageNums = {};

    // Define the pageNums object to reflect the pagination nav buttons to be
    // rendered, and the corresponding page number that each button should navigate to
    if (categoryPageNum > 2) {
      pageNums['<<'] = 1;
    }
    if (categoryPageNum > 1) {
      pageNums['<'] = categoryPageNum - 1;
    }
    if (categoryPageNum < lastPage) {
      pageNums['>'] = categoryPageNum + 1;
    }
    if (categoryPageNum < lastPage - 1) {
      pageNums['>>'] = lastPage;
    }

    // Store the pagination buttons markup as a constant
    const paginationBtns = map(pageNums, (pageNum, key) => (
      <a
        key={key}

        // Clicking the button does not change the route
        to="/"

        role="button"
        tabIndex="0"
        className={key !== keys(pageNums)[keys(pageNums).length - 1] ? styles['pagination-btn'] : styles['last-pagination-btn']}
        onClick={() => this.onClickCategoryPaginationButton(pageNums[key])}
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            this.onClickCategoryPaginationButton(pageNums[key]);
          }
        }}
      >

        {/* Render the appropriate pagination button symbol */}
        {key}

      </a>
    ));

    // Render the pagination navigation
    return (
      <div
        className={styles['pagination-nav']}
        ref={(paginationNav) => {
          this.paginationNav = paginationNav;
        }}
      >
        {paginationBtns}
      </div>
    );
  }

  renderUpdateModal(isModalAriaHidden) {
    const { updateModalCheckboxesMaxHeight } = this.state;
    let { isCheckboxChecked } = this.state;

    // Render update image modal markup
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Modal */}
        <div className={`alert alert-info pop-up ${styles['update-image-modal']}`}>

          {/* Modal Content */}
          <div className="text-center">

            {/* Heading */}
            <h3
              className={styles['modal-heading']}
              ref={(updateModalHeading) => {
                this.updateModalHeading = updateModalHeading;
              }}
            >
              Categories:
            </h3>

            {/* Horizontal Rule */}
            <hr className={styles['update-image-hr']} />

            {/* Form */}
            <form>

              {/* Category Checkboxes */}
              <div
                className={styles['category-checkboxes']}
                style={{ maxHeight: updateModalCheckboxesMaxHeight }}
              >
                {this.renderModalCheckboxes('update')}
              </div>

              {/* Buttons */}
              <div
                className={styles['button-group']}
                ref={(updateModalButtons) => {
                  this.updateModalButtons = updateModalButtons;
                }}
              >

                {/* Submit Button */}
                <button
                  className="
                    btn
                    btn-lg
                    btn-success
                    left-side-button
                  "
                  type="button"
                  onClick={this.onUpdateImage.bind(this)}
                >
                  Submit
                </button>

                {/* Cancel Button */}
                <button
                  className="btn btn-lg btn-danger"
                  type="button"
                  onKeyDown={(e) => preventModalTabEscape(
                    e.key,
                    () => e.preventDefault(),
                    () => this.firstCategoryOption.focus()
                  )}
                  onClick={() => {
                    // Prepare to reset checked checkboxes state
                    // to reflect that no boxes are checked
                    isCheckboxChecked = [];

                    // Set the state
                    this.setState(
                      { updateImageIndex: null, isCheckboxChecked, categoryPageNum: 1 }
                    );
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  renderDeleteImageModal(isModalAriaHidden) {
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Modal */}
        <div className="alert alert-danger pop-up">

          {/* Warning Text */}
          <h3 className="text-center warning-text">
            Are you sure you want to delete this image?
          </h3>

          {/* Button Group */}
          <div className="text-center">

            {/* Delete Button */}
            <button
              className="btn btn-lg btn-danger left-side-button"
              type="button"

              // Autofocus if device is not a touchscreen
              autoFocus={!document.body.classList.contains('touchscreen')}

              onClick={this.onDeleteImage.bind(this)}
              ref={(deleteImgYesBtn) => {
                this.deleteImgYesBtn = deleteImgYesBtn;
              }}
            >
              Yes
            </button>

            {/* Cancel Button */}
            <button
              className="btn btn-lg btn-primary"
              type="button"
              onKeyDown={(e) => preventModalTabEscape(
                e.key,
                () => e.preventDefault(),
                () => this.deleteImgYesBtn.focus()
              )}
              onClick={() => this.setState({ deleteImageIndex: null })}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderNoImages(isAriaHidden) {
    const { noImagesEmojiMaxHeight } = this.state;

    // No images markup
    return (
      <div className="text-center" aria-hidden={isAriaHidden}>

        {/* No Images Text */}
        <div
          className={`
            ${styles['text-container']}
            ${styles['no-images-notice']}
          `}
          ref={(noImagesText) => {
            this.noImagesText = noImagesText;
          }}
        >
           You have no images yet!
        </div>

        {/* No Images Emoji */}
        <img

          // Render next-gen image version if browser support exists
          src={
            document.body.classList.contains('webp')
              ? '../../images/next-gen/no-images-emoji.webp'
              : '../../images/standard/no-images-emoji.png'
          }

          alt="Shocked emoji"
          className={styles['no-images-emoji']}
          style={{ maxHeight: noImagesEmojiMaxHeight }}
        />
      </div>
    );
  }

  renderImages(pageImageObjects, isAriaHidden) {
    const { images } = this.props;
    const { imageMaxHeight } = this.state;

    // For each image to be rendered on the page, return ...
    return map(pageImageObjects, (image, i) => (

      // Image container
      <div
        className="col-md-3 col-sm-4 col-xs-12 text-center image-container"
        key={image ? image.id : i}
        aria-hidden={isAriaHidden}
        ref={(imageContainer) => {
          this.imageContainer = imageContainer;
        }}
      >

        {/* Render the image */}
        {
          image
            ? (
              <Image
                imgIndex={images.indexOf(image)}
                imageId={image.id}
                imagePathname={image.image}
                imageMaxHeight={imageMaxHeight}
              />
            )
            : null
        }

        {/* Button Group */}
        <div className="text-center">

          {/* Delete Image Button */}
          <button
            type="button"
            className={`
              btn
              btn-lg
              btn-danger
              ${styles['button-below-image']}
              ${styles['delete-image-button']}
            `}
            onClick={() => this.setState({ deleteImageIndex: images.indexOf(image) })}
          >
            Delete
          </button>

          {/* Update Image Button */}
          <button
            type="button"
            className={`
              btn
              btn-lg
              btn-primary
              ${styles['button-below-image']}
              ${styles['update-image-button']}
            `}
            onClick={() => this.fetchImgCatsOrSetUpdateImgState(image)}
          >
            Update Categories
          </button>
        </div>
      </div>
    ));
  }

  renderPageBody(isAriaHidden) {
    const { images } = this.props;
    const { maxImagesPerPage, pageNumber } = this.state;
    const numberOfImages = images.length;

    // If the user has no images, render no images markup
    if (numberOfImages === 0) {
      return this.renderNoImages(isAriaHidden);
    }

    // Else...
    const multiplePages = numberOfImages > maxImagesPerPage;
    let pageImageObjects = [];

    // If there are multiple pages of images, determine which images should be displayed
    if (multiplePages) {
      const startIndex = maxImagesPerPage * (pageNumber - 1);

      // All the image objects of the images to be displayed on the page
      pageImageObjects = images.slice(startIndex, startIndex + maxImagesPerPage);
    }

    // Else (if there is only one page of images), display
    // all of the user's images on this page
    else {
      pageImageObjects = images;
    }

    // Store the page images markup as a constant
    const pageImages = this.renderImages(pageImageObjects, isAriaHidden);

    // If there are multiple pages of images, render the pagination navigation at the top
    // and bottom of the page, with the images in the middle
    if (multiplePages) {
      return (
        <div aria-hidden={isAriaHidden}>

          {/* Top Pagination Nav */}
          <PaginationNav
            parentComp="Images"
            navLocation="top"
            images={images}
            currentPageNumber={pageNumber}
            onChangePageNumber={(newPageNumber) => this.onChangePageNumber(newPageNumber)}
          />

          {/* Page's images */}
          <div className="clearfix">
            { pageImages }
          </div>

          {/* Bottom Pagination Nav */}
          <PaginationNav
            parentComp="Images"
            navLocation="bottom"
            images={images}
            currentPageNumber={pageNumber}
            onChangePageNumber={(newPageNumber) => this.onChangePageNumber(newPageNumber)}
          />
        </div>
      );
    }

    // Else only render the page's images
    return pageImages;
  }

  render() {
    const { serverErrors } = this.props;
    const {
      updateImageIndex,
      deleteImageIndex,
      addImageModalRendered,
      notEnoughAlert,
      savedAnimation,
      deletedAnimation,
      componentIsLoading,
      requestPending
    } = this.state;
    const isAriaHidden = updateImageIndex !== null
      || deleteImageIndex !== null
      || addImageModalRendered
      || savedAnimation
      || deletedAnimation;
    const isModalAriaHidden = serverErrors.length !== 0;
    const serverErrorInvisibleBackground = serverErrorsInvisibleBackground(serverErrors);

    // Render Loader component if component is loading
    if (componentIsLoading) {
      return <Loader />;
    }

    // Else render typical markup
    return (
      <div>

        {/* Render the server errors popup if server errors exist */}
        {
          serverErrors.length !== 0
            ? (
              <ServerErrorsPopup
                prevFocus={document.activeElement}
                invisibleBackground={serverErrorInvisibleBackground}
              />
            )
            : null
        }

        {/* If server errors require an invisible background, hide the
        remaining markup, else show it */}
        <div className={serverErrorInvisibleBackground ? 'hidden' : null}>

          {/* If a request is pending, make the page not clickable */}
          { requestPending ? <div className="page-not-clickable" /> : null }

          {/* Navbar Header */}
          <Header aria-hidden={isAriaHidden} />

          {/* Render an alert if the user attempted to play the game
            without enough uploaded images */}
          { notEnoughAlert ? Images.renderNotEnoughImagesAlert(isAriaHidden) : null }

          {/* Render an animation if the component is in an animation state */}
          {
            savedAnimation || deletedAnimation
              ? <Animation somethingWasDeleted={deletedAnimation} />
              : null
          }

          {/* If component is in update image state, render update image modal */}
          {
            updateImageIndex !== null
              ? this.renderUpdateModal(isModalAriaHidden)
              : null
          }

          {/* If component is in delete image state, render delete image modal */}
          {
            deleteImageIndex !== null
              ? this.renderDeleteImageModal(isModalAriaHidden)
              : null
          }

          {/* If component is in add image modal state, render add image modal */}
          { addImageModalRendered ? this.renderAddImageModal(isModalAriaHidden) : null }

          {/* Page heading */}
          <h1
            className={`
              text-center
              ${styles['images-heading']}
              ${styles['text-container']}
            `}
            aria-hidden={isAriaHidden}
          >
            Image Library
          </h1>

          {/* Add Image Button */}
          <div className="text-center" aria-hidden={isAriaHidden}>
            <button
              className={`btn btn-lg btn-success ${styles['add-image-btn']}`}
              type="button"
              onClick={this.setAddImageState.bind(this)}
            >
              Add A New Image
            </button>
          </div>

          {/* Horizontal rule */}
          <hr className={styles['images-hr']} aria-hidden={isAriaHidden} />

          {/* Render the page's body (i.e. images markup, pagination navigation, etc. */}
          {this.renderPageBody(isAriaHidden)}

        </div>

      </div>
    );
  }
}

function mapStateToProps(state) {
  const {
    auth: { authenticated },
    images,
    categories,
    navigationAlert,
    serverErrors
  } = state;

  return {
    authenticated,
    images,
    categories,
    navigationAlert,
    serverErrors
  };
}

export default connect(
  mapStateToProps,
  {
    addImage,
    fetchImageCategories,
    fetchImages,
    fetchCategoryTitles,
    updateImage,
    deleteImage,
    visitedImages,
    clearNavigationAlert
  }
)(Images);
