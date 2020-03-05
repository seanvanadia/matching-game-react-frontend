import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import {
  ceil,
  clone,
  forEach,
  includes,
  keys,
  map,
  pull
} from 'lodash-es';

import {
  manageKeyboardAccessibility,
  maxImagesPerPage,
  numOfPages,
  preventModalTabEscape,
  preventSpaceFirst,
  serverErrorsInvisibleBackground
} from '../utils';

import {
  addCategory,
  fetchCategory,
  fetchCategoryTitles,
  fetchNonCatImages,
  updateCategoryName,
  updateCategoryImages,
  deleteCategory,
  clearNavigationAlert
} from '../actions';

import Animation from './animation';
import Header from './header';
import Image from './image';
import Loader from './loader';
import PaginationNav from './pagination_nav';
import ServerErrorsPopup from './server_errors_popup';
import styles from '../style/categories.css';

class Categories extends Component {
  constructor(props) {
    super(props);

    const { match: { params: { categoryId } } } = this.props;

    this.state = {
      addCategoryModalRendered: false,
      categoryId: parseInt(categoryId, 10),
      categoryImages: [],
      categoryPageNum: 1,
      categoryTitle: '',
      componentIsLoading: true,
      deletedAnimation: false,
      deleteCategoryModalRendered: false,
      desktopCatListMaxHeight: null,
      discardChangesValidationRendered: false,
      imageIdsToBeUpdated: [],
      imageMaxHeight: null,
      manageCategoryDropdownOpen: false,
      maxImagesPerPage: null,
      newCategoryTitle: '',
      noCategoriesEmojiMaxHeight: null,
      noImagesEmojiMaxHeight: null,
      nonDesktopCatListMaxHeight: null,
      pageNumber: null,
      renderedImages: [],
      requestPending: false,
      savedAnimation: false,
      selectCategoryDropdownOpen: false,
      unsavedChangesAlertRendered: false,
      updateCategoryName: null,
      windowHeight: window.innerHeight,
      windowWidth: document.body.classList.contains('safari')
        ? document.getElementsByTagName('html')[0].clientWidth
        : window.innerWidth
    };

    const functionsToBeBound = [
      'setOpenDropdownsMaxHeightState',
      'updateDimensions'
    ];

    // Bind this to all necessary functions
    map(functionsToBeBound, (functionToBeBound) => {
      this[functionToBeBound] = this[functionToBeBound].bind(this);
    });

    // Add event listeners
    window.addEventListener('resize', this.updateDimensions);
    window.addEventListener('scroll', this.setOpenDropdownsMaxHeightState);
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
    const {
      clearNavigationAlert,
      history,
      navigationAlert,
      match: { params }
    } = props;
    const urlCategoryId = parseInt(params.categoryId, 10);
    const urlPageId = parseInt(params.pageId, 10);
    let catId = urlCategoryId > -1 ? urlCategoryId : null;
    const pageId = urlPageId > 0 ? urlPageId : 1;

    // Re-enable navigation warnings after component mounts
    if (navigationAlert === 'warnings-disabled') {
      clearNavigationAlert();
    }

    // If no categories have been fetched...
    if (!props.categories) {
      const { fetchCategoryTitles } = this.props;

      // Fetch the first eleven category titles...
      fetchCategoryTitles(11, 1, () => {
        const { categories } = this.props;

        // Set the default category id if possible
        if (catId === null && categories[0]) {
          catId = categories[0].id;
        }

        // Redirect if user has no categories
        if (categories.length === 0) {
          if (window.location.pathname !== '/categories') {
            history.push('/categories');
          }

          this.setCategoryState(null, pageId, null);
        }

        // If the user has at least one category, fetch the necessary images
        else {
          this.fetchNecessaryImages(catId, pageId);
        }
      });
    }

    // If user's cats have been fetched and user has no categories...
    else if (props.categories.length === 0) {
      // Redirect to '/categories'
      if (window.location.pathname !== '/categories') {
        history.push('/categories');
      }

      this.setCategoryState(null, pageId, null);
    }

    // If categories have been fetched...
    else {
      const { categories } = this.props;

      // Set the default category id if possible
      if (catId === null && categories[0]) {
        catId = categories[0].id;
      }

      // Fetch the necessary images
      this.fetchNecessaryImages(catId, pageId);
    }
  }

  componentWillUnmount() {
    const { clearNavigationAlert, navigationAlert } = this.props;

    // Clear any navigation alert that exists before leaving the component
    if (navigationAlert) {
      clearNavigationAlert();
    }

    // Remove event listeners
    window.removeEventListener('resize', this.updateDimensions);
    window.removeEventListener('scroll', this.setOpenDropdownsMaxHeightState);
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

  onClickCategoryPaginationButton(newCategoryPageNum) {
    const { categories } = this.props;
    const { categoryId } = this.state;
    let needToFetchCats = false;

    // Do not include the currently selected category as an option
    const initCats = categories.slice();
    forEach(initCats, (cat, i) => {
      if (cat && cat.id === categoryId) {
        initCats.splice(i, 1);
        return false;
      }

      return null;
    });

    // Prepare to display the next ten categories
    let lastIndex = (newCategoryPageNum * 10) - 1;
    let firstIndex = lastIndex - 9;

    // If the user is on the last page, change the values of the firstIndex and lastIndex...
    if (newCategoryPageNum === ceil(initCats.length / 10)) {
      lastIndex = initCats.length - 1;
      const addend = initCats.length % 10 === 0 ? 10 : initCats.length % 10;
      firstIndex = lastIndex - (addend - 1);
    }

    // Determine whether category titles need to be fetched
    for (let i = firstIndex; i <= lastIndex; i += 1) {
      if (!initCats[i]) {
        needToFetchCats = true;
        i = lastIndex + 1;
      }
    }

    // If category titles need to be fetched, fetch them and set the state
    if (needToFetchCats) {
      // Request is pending
      this.setState({ requestPending: true });

      const { fetchCategoryTitles } = this.props;

      fetchCategoryTitles(10, newCategoryPageNum, () => {
        this.setState({ categoryPageNum: newCategoryPageNum, requestPending: false });
      }, true);
    }

    // If category titles do not need to be fetched, simply set the state
    else {
      this.setState({ categoryPageNum: newCategoryPageNum });
    }
  }

  onAddCategory() {
    // Request is pending
    this.setState({ requestPending: true });

    const { addCategory } = this.props;
    const { maxImagesPerPage, newCategoryTitle } = this.state;

    // Send add category request
    addCategory(
      newCategoryTitle,
      maxImagesPerPage,

      // If the request fails, the request is no longer pending
      () => this.setState({ requestPending: false }),

      // If the request is successfully submitted, set the new category
      // as the category state
      () => {
        const { categories } = this.props;

        this.setCategoryState(categories[categories.length - 1].id, 1, 'saved');
      }
    );
  }

  onUpdateCategoryName() {
    // Request is pending
    this.setState({ requestPending: true });

    const { props } = this;
    const updateCategoryNameAction = props.updateCategoryName;
    const { categoryId, updateCategoryName } = this.state;

    // Send update category name request
    updateCategoryNameAction(
      updateCategoryName,
      categoryId,

      // If the request fails, the request is no longer pending
      () => this.setState({ requestPending: false }),

      // If the request is successfully submitted, set the state to render the
      // saved animation, passing in additional setState properties to update
      () => this.setAnimationState(
        { categoryTitle: updateCategoryName, updateCategoryName: null },
        'saved'
      )
    );
  }

  onUpdateCategoryImages() {
    // Request is pending
    this.setState({ requestPending: true });

    const { categories, updateCategoryImages } = this.props;
    const { categoryId, imageIdsToBeUpdated, pageNumber } = this.state;
    const imgStatuses = [];
    let category = null;

    // Define the category
    forEach(categories, (cat) => {
      if (cat && cat.id === categoryId) {
        category = cat;
        return false;
      }

      return null;
    });

    // Define the ids of the category's images to be updated
    const updateCatImgIds = [];
    forEach(category.images, (img) => {
      if (img) {
        updateCatImgIds.push(img.id);
      }

      return null;
    });

    // Define the imgStatuses array, with 'R' if the image is to be removed
    // from the category, and 'A' if it is to be added (structured with the
    // same sequence as imageIdsToBeUpdated)
    forEach(imageIdsToBeUpdated, (imgId) => {
      if (includes(updateCatImgIds, imgId)) {
        imgStatuses.push('R');
      } else {
        imgStatuses.push('A');
      }

      return null;
    });

    // Send update category images request
    updateCategoryImages(
      imageIdsToBeUpdated,
      categoryId,
      imgStatuses,

      // If the request fails, the request is no longer pending
      () => this.setState({ requestPending: false }),

      // If the request is successfully submitted, fetch any necessary images
      // to be rendered on the page
      () => this.fetchNecessaryImages(categoryId, pageNumber, 'saved')
    );
  }

  onDeleteCategory() {
    // Request is pending
    this.setState({ requestPending: true });

    const { categories, deleteCategory } = this.props;
    const { categoryId, maxImagesPerPage, pageNumber } = this.state;

    // Define category
    let category = null;
    forEach(categories, (cat) => {
      if (cat && cat.id === categoryId) {
        category = cat;
        return false;
      }

      return null;
    });

    // Define the category's image ids
    const imageIds = [];
    forEach(category.images, (image) => {
      if (image) {
        imageIds.push(image.id);
      }

      return null;
    });

    // Define the initial number of images to request upon deletion of the category
    const newCatToBeShown = category === categories[0] ? categories[1] : categories[0];
    let numImgsToRequest = categories.length === 1 ? 0 : maxImagesPerPage;

    // Redefine the number of images to request upon deletion of the category if necessary
    if (newCatToBeShown && newCatToBeShown.images) {
      const newCatToBeShownImages = newCatToBeShown.images;
      const catImagesOnPage = newCatToBeShownImages.slice(0, maxImagesPerPage);
      const numOfCatImagesOnPage = catImagesOnPage.length;

      // If the page will consist of only category images, and there are no
      // undefined images to rendered, no images need to be requested
      if (numOfCatImagesOnPage === maxImagesPerPage && !includes(catImagesOnPage, undefined)) {
        numImgsToRequest = 0;
      }

      // If the page will contain non-category images...
      else if (newCatToBeShown.nonCatImages) {
        const newCatToBeShownNonCatImages = newCatToBeShown.nonCatImages;
        const nonCatImagesOnPage = newCatToBeShownNonCatImages
          .slice(0, maxImagesPerPage - numOfCatImagesOnPage);
        const pageImages = catImagesOnPage.concat(nonCatImagesOnPage);
        const numPageImages = pageImages.length;

        // If enough defined page images have been fetched to fill the page,
        // or all of the user's images have been fetched, no images need to be requested
        if (
          (
            numPageImages === maxImagesPerPage
            || numPageImages === newCatToBeShownImages.length + newCatToBeShownNonCatImages.length
          )
          && !includes(pageImages, undefined)
        ) {
          numImgsToRequest = 0;
        }
      }
    }

    // Define the index of the category title to be fetched
    let catTitleIndexToFetch = null;
    forEach(categories, (cat, i) => {
      if (cat === undefined) {
        catTitleIndexToFetch = i;
        return false;
      }

      return null;
    });

    // Send delete category request
    deleteCategory(
      categoryId,
      imageIds,
      numImgsToRequest,
      catTitleIndexToFetch,
      category.created_at,

      // If the request fails, the request is no longer pending
      () => this.setState({ requestPending: false }),

      // If the request is successfully submitted...
      () => {
        const { categories } = this.props;

        // If there are no categories left, set the category state with null categories
        if (categories.length === 0) {
          this.setCategoryState(null, pageNumber, 'deleted');
        }

        // Else, select the user's first category as the category state
        else {
          this.setCategoryState(categories[0].id, 1, 'deleted');
        }
      }
    );
  }

  setNewlyRenderedElementsDimensionalState(initialSetStateObj) {
    const setStateObj = clone(initialSetStateObj);
    const windowHeight = window.innerHeight;
    const {
      addCatButton,
      categoryWarningText,
      desktopCategoryList,
      imageContainer,
      noImagesText,
      selectAnotherCatHeader
    } = this;

    // State keys of properties that may have to be updated
    const stateKeys = [
      'desktopCatListMaxHeight',
      'noImagesEmojiMaxHeight',
      'noCategoriesEmojiMaxHeight',
      'imageMaxHeight',
      'nonDesktopCatListMaxHeight'
    ];

    // Combined margins, padding, and borders of elements that need to be subtracted
    // from window dimensions to obtain the potentially new dimensional state value
    const marginsAndPadding = 30; // Margins and padding for both emojis and the image
    const desktopCatListMarginsAndPadding = 10;
    const nonDesktopCatListMarginsAndPadding = 33;

    // Potentially new values of state properties
    const newStatePropValues = [

      // Category Dropdown Max Height
      desktopCategoryList
        ? windowHeight
          - desktopCategoryList.getBoundingClientRect().top
          - desktopCatListMarginsAndPadding
        : null,

      // No Images Emoji Max Height
      noImagesText
        ? windowHeight - noImagesText.getBoundingClientRect().bottom
          - window.scrollY - marginsAndPadding
        : null,

      // No Categories Emoji Max Height
      categoryWarningText
        ? windowHeight - categoryWarningText.getBoundingClientRect().bottom
          - window.scrollY - marginsAndPadding
        : null,

      // Image max height (equal to the width of its square container, minus margins)
      imageContainer
        ? imageContainer.getBoundingClientRect().width - marginsAndPadding
        : null,

      // Non Desktop Category List Max Height
      addCatButton && selectAnotherCatHeader
        ? windowHeight
        - selectAnotherCatHeader.getBoundingClientRect().bottom
        - addCatButton.getBoundingClientRect().height
        - nonDesktopCatListMarginsAndPadding
        : null
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

    // Set the state
    this.setState(setStateObj);
  }

  setOpenDropdownsMaxHeightState() {
    const { manageCategoryDropdownOpen, selectCategoryDropdownOpen } = this.state;

    // If either the manage category or select category dropdown is open,
    // change its max height if it's not what it should be
    if (manageCategoryDropdownOpen || selectCategoryDropdownOpen) {
      this.setNewlyRenderedElementsDimensionalState({});
    }
  }

  setEndAnimationState(animationType, categoryWasAddedOrDeleted) {
    const { history } = this.props;
    const { categoryId } = this.state;
    const setStateObj = {};
    setStateObj[animationType] = false;

    // Remove the animation completely 1375 ms after it is rendered
    setTimeout(() => {
      this.setState(setStateObj);

      // If a category was added or deleted, update the url with the categoryId state
      if (categoryWasAddedOrDeleted) {
        // If a category still exists, update the url with the category to be shown
        if (categoryId !== null) {
          history.push(`/categories/${categoryId}/1`);
        }

        // Else redirect to the main categories page
        else {
          history.push('/categories');
        }
      }
    }, 1375);
  }

  setAnimationState(initialSetStateObj, type, catImagesWereUpdated) {
    const { categories } = this.props;
    const numOfCategories = categories.length;
    const setStateObj = { ...initialSetStateObj, requestPending: false };
    const animationType = `${type}Animation`;
    setStateObj[animationType] = true;
    const categoryWasAddedOrDeleted = !catImagesWereUpdated && !includes(keys(initialSetStateObj), 'updateCategoryName');

    // Set the state to render the animation...
    this.setState(
      setStateObj,
      () => {
        // Then, if the user deleted the last category, or added the first category,
        // set the state of properties dependent on newly rendered elements' dimensions
        if (!numOfCategories || numOfCategories === 1) {
          this.setNewlyRenderedElementsDimensionalState({});
        }

        // Set the state to fade out and end the animation
        this.setEndAnimationState(animationType, categoryWasAddedOrDeleted);
      }
    );
  }

  setImagesToBeUpdatedState(imageId) {
    const { imageIdsToBeUpdated } = this.state;

    // If the image selected was initially set to be updated, it will now not need
    // to be updated, so pull it from the updateImageIds array
    if (includes(imageIdsToBeUpdated, imageId)) {
      pull(imageIdsToBeUpdated, imageId);
    }

    // If the image selected was not initially set to be updated, add it to the
    // array of images to be updated
    else {
      imageIdsToBeUpdated.push(imageId);
    }

    // Set the state of the imageIds to be updated
    this.setState({ imageIdsToBeUpdated });
  }

  setCategoryState(categoryId, pageNumber, animationType, propsToBeUpdated, newPageNumClicked) {
    const { categories } = this.props;
    const { state } = this;
    const { imageIdsToBeUpdated } = state;
    const categoryIdState = state.categoryId;
    const categoryIdChanged = categoryId !== categoryIdState;
    const maxImgsPerPage = maxImagesPerPage();
    let categoryTitle = '';
    let categoryImages = [];
    let renderedImages = [];

    // If the user has at least one category, define the renderedImages array
    if (categoryId) {
      let category = null;

      // Define the category
      forEach(categories, (cat) => {
        if (cat && cat.id === categoryId) {
          category = cat;
          return false;
        }

        return null;
      });

      categoryTitle = category.title;
      categoryImages = category.images || [];

      // Define page's category images
      renderedImages = categoryImages.slice(
        (pageNumber - 1) * maxImgsPerPage, maxImgsPerPage * pageNumber
      );

      // Define the number of non-cat images to render
      const numberOfNonCatImagesToRender = maxImgsPerPage - renderedImages.length;

      // If page's category images do not fill maxImgsPerPage, fix the renderedImages for the page
      if (numberOfNonCatImagesToRender > 0) {
        let firstNonCatImgsPgNum = ceil(categoryImages.length / maxImgsPerPage);
        if (categoryImages.length % maxImgsPerPage === 0) {
          firstNonCatImgsPgNum += 1;
        }
        const requestedNonCatImgsPgNum = pageNumber - firstNonCatImgsPgNum + 1;
        const offset = maxImgsPerPage - (categoryImages.length % maxImgsPerPage);
        const { nonCatImages } = category;
        let pageNonCatImages = [];

        // Define the page's nonCatImages and concatenate them onto the
        // renderedImages array
        if (nonCatImages) {
          // Define the page's nonCatImages
          if (requestedNonCatImgsPgNum === 1) {
            const numNonCatImgsNeeded = offset === 0 ? maxImgsPerPage : offset;

            pageNonCatImages = nonCatImages.slice(0, numNonCatImgsNeeded);
          } else {
            const startIndex = offset === 0
              ? maxImgsPerPage * (requestedNonCatImgsPgNum - 1)
              : maxImgsPerPage * (requestedNonCatImgsPgNum - 2) + offset;

            pageNonCatImages = nonCatImages.slice(
              startIndex,
              startIndex + numberOfNonCatImagesToRender
            );
          }

          // Adjust the renderedImages value
          renderedImages = renderedImages.concat(pageNonCatImages);
        }
      }
    }

    // Prepare to set the state
    const setStateObject = {
      addCategoryModalRendered: false,
      categoryId,
      categoryImages,
      categoryTitle,
      componentIsLoading: false,
      deleteCategoryModalRendered: false,
      imageIdsToBeUpdated: newPageNumClicked ? imageIdsToBeUpdated : [],
      maxImagesPerPage: maxImgsPerPage,
      newCategoryTitle: '',
      pageNumber,
      renderedImages
    };

    // If an animation is to be rendered, set the animation state, passing
    // in this function's setState object
    if (animationType) {

      // If an animation is to be rendered and the categoryId was not
      // changed, the category's images were updated
      const catImagesWereUpdated = !categoryIdChanged;

      // Set the animation state
      this.setAnimationState(setStateObject, animationType, catImagesWereUpdated);
    }

    // Else set the state using this function's setStateObject, as well as the state
    // of properties dependent on newly rendered elements' dimensions
    else {
      const newPropsToBeUpdated = propsToBeUpdated || {};
      this.setState(
        setStateObject,
        () => this.setNewlyRenderedElementsDimensionalState(newPropsToBeUpdated)
      );
    }
  }

  fetchNecessaryImages(catId, pageId, animationType, propsToBeUpdated, newPageNumClicked) {
    const { props } = this;
    const categories = props.categories ? props.categories : [];
    const maxImgsPerPage = maxImagesPerPage();

    // Define category images
    let categoryImages = null;
    forEach(categories, (cat) => {
      if (cat && cat.id === catId) {
        categoryImages = cat.images;
        return false;
      }

      return null;
    });

    // Define category page images
    const catPageImages = categoryImages
      ? categoryImages.slice(
        (pageId - 1) * maxImgsPerPage,
        maxImgsPerPage * pageId
      )
      : null;

    // If all of the current category's required images have not been fetched...
    if (!categoryImages || includes(catPageImages, undefined)) {
      const { fetchCategory } = this.props;

      // Fetch the category and its images to be displayed
      fetchCategory(
        catId,
        null,
        maxImgsPerPage,
        pageId,

        // After the category is fetched...
        (resData) => {
          const { history, match: { params } } = this.props;
          const { category } = resData;

          // Redirect to the correct url if necessary
          if (
            category.id !== parseInt(params.categoryId, 10)
            || (window.location.pathname === '/categories' && catId !== null)
            || !(parseInt(params.pageId, 10) > 0)
          ) {
            history.push(`/categories/${category.id}/${pageId}`);
          }

          // Fetch non-category images if category images don't fill up the page
          this.fetchNonCatImagesIfNecessary(
            category, pageId, animationType, propsToBeUpdated, newPageNumClicked
          );
        },
        false,
        true
      );
    }

    // If all of the current category's required images have been fetched...
    else {
      const { categories, history, match: { params } } = this.props;
      let category = null;

      // Define the category
      forEach(categories, (cat) => {
        if (cat && cat.id === catId) {
          category = cat;
          return false;
        }

        return null;
      });

      // Redirect to the correct url if necessary
      if (
        category.id !== parseInt(params.categoryId, 10)
        || (window.location.pathname === '/categories' && catId !== null)
      ) {
        history.push(`/categories/${category.id}/${pageId}`);
      }

      // Fetch non-category images if category images don't fill up the page
      this.fetchNonCatImagesIfNecessary(
        category, pageId, animationType, propsToBeUpdated, newPageNumClicked
      );
    }
  }

  fetchNonCatImagesIfNecessary(cat, pageId, animationType, propsToBeUpdated, newPageNumClicked) {
    const maxImgsPerPage = maxImagesPerPage();
    const catImgsLength = cat.images.length;
    const catPageImages = cat.images.slice((pageId - 1) * maxImgsPerPage, maxImgsPerPage * pageId);
    const offset = maxImgsPerPage - (catImgsLength % maxImgsPerPage);
    let numberOfImagesToFetch = maxImgsPerPage - catPageImages.length;
    let firstNonCatImgsPgNum = ceil(catImgsLength / maxImgsPerPage);
    if (catImgsLength % maxImgsPerPage === 0) {
      firstNonCatImgsPgNum += 1;
    }
    const requestedNonCatImgsPgNum = pageId - firstNonCatImgsPgNum + 1;
    const { nonCatImages } = cat;
    let pageNonCatImages = [];

    // Define the page's nonCatImages
    if (nonCatImages) {
      if (requestedNonCatImgsPgNum === 1) {
        const numNonCatImgsNeeded = offset === 0 ? maxImgsPerPage : offset;

        pageNonCatImages = nonCatImages.slice(0, numNonCatImgsNeeded);
      } else {
        const startIndex = offset === 0
          ? maxImgsPerPage * (requestedNonCatImgsPgNum - 1)
          : offset + (requestedNonCatImgsPgNum - 2) * maxImgsPerPage;

        pageNonCatImages = nonCatImages.slice(
          startIndex,
          startIndex + numberOfImagesToFetch
        );
      }
    }

    // If all the page's non cat images have been fetched, no more need to be fetched
    if (pageNonCatImages.length > 0 && !includes(pageNonCatImages, undefined)) {
      numberOfImagesToFetch = 0;
    }

    // If images need to be fetched, fetch them, then set the category state
    if (numberOfImagesToFetch > 0) {
      const { categories, fetchNonCatImages } = this.props;

      fetchNonCatImages(
        categories.indexOf(cat),
        cat.id,
        numberOfImagesToFetch,
        requestedNonCatImgsPgNum,
        offset,

        // After fetching the nonCatImages...
        (resData) => {
          const { history } = this.props;
          const { pageNumber } = resData.meta;
          let newPageId = pageId;

          // Redirect to proper page if necessary
          if (pageNumber !== requestedNonCatImgsPgNum) {
            history.push(`/categories/${cat.id}/1`);
            newPageId = 1;
          }

          // Set the category state
          this.setCategoryState(
            cat.id, newPageId, animationType, propsToBeUpdated, newPageNumClicked
          );
        },
      );
    }

    // If no images need to be fetched...
    else {
      const { categories, fetchNonCatImages } = this.props;

      // If nonCatImages have not been fetched at all, fetch the
      // nonCatImages array length, then set the category state
      if (!nonCatImages) {
        fetchNonCatImages(
          categories.indexOf(cat),
          cat.id,
          0,
          0,
          0,
          () => this.setCategoryState(
            cat.id, pageId, animationType, propsToBeUpdated, newPageNumClicked
          )
        );
      }

      // Else just set the category state
      else {
        this.setCategoryState(cat.id, pageId, animationType, propsToBeUpdated, newPageNumClicked);
      }
    }
  }

  updateDimensions() {
    const { state } = this;
    const { categoryId, pageNumber } = state;
    const maxImgsPerPage = maxImagesPerPage();

    // State properties that will always be updated when dimensions are updated
    const propsAlwaysUpdated = {
      maxImagesPerPage: maxImgsPerPage,
      windowHeight: window.innerHeight,
      windowWidth: document.body.classList.contains('safari')
        ? document.getElementsByTagName('html')[0].clientWidth
        : window.innerWidth
    };

    // If a dimensional update caused the current page number to become obsolete,
    // (e.g. page 4 may exist on phone size, but not on desktop size),
    // redirect the user to an existing page and store the new page number as a constant value
    const newPageNumber = this.redirectIfPageHasNoImages();

    // If a new page number exists...
    if (newPageNumber) {
      // If there is a different number of maxImagesPerPage, fetch any necessary images
      if (maxImgsPerPage !== state.maxImagesPerPage) {
        this.fetchNecessaryImages(
          categoryId,
          newPageNumber,
          null,
          propsAlwaysUpdated
        );
      }

      // If the maxImagesPerPage has remained the same...
      else {
        // Set the page number state...
        this.setState(
          { pageNumber: newPageNumber },

          // Then set the state of properties dependent on
          // the page's newly rendered elements' dimensions,
          // as well as the state of the properties always to be updated
          () => this.setNewlyRenderedElementsDimensionalState(propsAlwaysUpdated)
        );
      }
    }

    // If no new page number exists, but the maxImagesPerPage has changed,
    // fetch any necessary images
    else if (maxImgsPerPage !== state.maxImagesPerPage) {
      // Define numberOfImages
      const { categories } = this.props;
      let numberOfImages = 0;
      forEach(categories, (cat) => {
        if (cat && cat.id === categoryId && cat.images && cat.nonCatImages) {
          numberOfImages = cat.images.length + cat.nonCatImages.length;
          return false;
        }

        return null;
      });

      // If the user has images, fetch the necessary images...
      if (numberOfImages !== 0) {
        this.fetchNecessaryImages(
          categoryId,
          pageNumber,
          null,
          propsAlwaysUpdated
        );
      }

      // If the user has no images, set the state of properties dependent on newly rendered
      // elements' dimensions, as well as the state of the properties always to be updated
      else {
        this.setNewlyRenderedElementsDimensionalState(propsAlwaysUpdated);
      }
    }

    // If no new page number exists, and the maxImagesPerPage has not changed,
    // set the state of properties dependent on newly rendered
    // elements' dimensions, as well as the state of the properties always to be updated
    else {
      this.setNewlyRenderedElementsDimensionalState(propsAlwaysUpdated);
    }
  }

  redirectIfPageHasNoImages() {
    const { categories, history } = this.props;
    const { categoryId, pageNumber } = this.state;

    // Define totalImgLength
    let totalImgLength = null;
    forEach(categories, (cat) => {
      if (cat && cat.id === categoryId) {
        totalImgLength = cat.images.length + cat.nonCatImages.length;
      }
    });

    // Define numberOfPages
    const numberOfPages = numOfPages(totalImgLength);

    // If there are no images on the current page, and the current page is not page 1,
    // redirect to the final page and return the new page number
    if (pageNumber > numberOfPages && pageNumber !== 1) {
      history.push(`/categories/${categoryId}/${numberOfPages}`);
      return numberOfPages;
    }

    // Else return false
    return false;
  }

  renderUnsavedChangesAlert(isModalAriaHidden, buttonAutoFocus) {
    // Render the alert
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Alert */}
        <div
          className="
            alert
            alert-danger
            pop-up
            screen-level-1
          "
        >

          {/* Alert Text */}
          <h3 className="text-center warning-text">
            You have unsaved changes!&nbsp;You must click either the
            &quot;Save Changes&quot; or &quot;Discard Changes&quot; button before continuing.
          </h3>

          {/* Container for Ok Button */}
          <div className="text-center">

            {/* Ok Button */}
            <button
              className="btn btn-lg btn-primary"
              type="button"
              autoFocus={buttonAutoFocus}
              onClick={() => this.setState({ unsavedChangesAlertRendered: false })}

              // Prevent Alert Tab Escape
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                }
              }}
            >

              {/* Static Ok Button Text */}
              Ok

            </button>

          </div>
        </div>
      </div>
    );
  }

  renderDiscardChangesValidation(isModalAriaHidden, buttonAutoFocus) {
    const btnTexts = ['Yes', 'Cancel'];

    // Initial variables' values are for yes button
    let btnAutoFocus = buttonAutoFocus;
    let btnColorClassNamePortion = 'primary';
    let specialClassNamePortion = 'left-side-button'
    let onClickFunc = () => this.setState({
      discardChangesValidationRendered: false, imageIdsToBeUpdated: []
    });

    // Render the validation
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Validation */}
        <div
          className="
            alert
            alert-danger
            pop-up
            screen-level-1
          "
        >

          {/* Validation Text */}
          <h3 className="text-center warning-text">
            Are you sure you want to discard the changes you&apos;ve
            made to this category&apos;s images?
          </h3>

          {/* Container for Buttons */}
          <div className="text-center">

            {/* Buttons Markup */}
            {
              map(btnTexts, (btnText, i) => {
                // Change button variables' values when rendering the cancel button
                if (i === 1) {
                  btnAutoFocus = false;
                  btnColorClassNamePortion = 'danger';
                  specialClassNamePortion = '';
                  onClickFunc = () => this.setState({ discardChangesValidationRendered: false });
                }

                // Button Markup
                return (
                  <button
                    key={i}
                    className={`
                      btn
                      btn-lg
                      btn-${btnColorClassNamePortion}
                      ${specialClassNamePortion}
                    `}
                    type="button"
                    autoFocus={btnAutoFocus}
                    onClick={onClickFunc.bind(this)}

                    // Prevent Validation Tab Escape
                    onKeyDown={(e) => {
                      if (i === 1) {
                        preventModalTabEscape(
                          e.key,
                          () => e.preventDefault(),
                          () => this.discardChangesYesBtn.focus()
                        );
                      }
                    }}

                    // Assign a ref to the yes button
                    ref={(btnRef) => {
                      if (i === 0) {
                        this.discardChangesYesBtn = btnRef;
                      }
                    }}
                  >

                    {/* Button Text */}
                    {btnText}

                  </button>
                );
              })
            }

          </div>
        </div>
      </div>
    );
  }

  renderAddOrUpdateModal(modalType, isModalAriaHidden) {
    const { categoryTitle, newCategoryTitle, updateCategoryName } = this.state;

    // Initial variables' values are for add category modal
    let alertType = 'success';
    let btnType = 'primary';
    let labelTextCommand = 'Enter';
    let inputRefName = 'addCategoryInput';
    let inputStateKey = 'newCategoryTitle';
    let inputValue = newCategoryTitle;
    let onCancelSetStateObj = { addCategoryModalRendered: false, newCategoryTitle: '' };
    let submitFunction = this.onAddCategory.bind(this);
    let submissionPermitted = newCategoryTitle !== '';

    // Change variables' values for update category modal
    if (modalType === 'update') {
      alertType = 'info';
      btnType = 'success';
      labelTextCommand = 'Change';
      inputRefName = 'updateCategoryInput';
      inputStateKey = 'updateCategoryName';
      inputValue = updateCategoryName;
      onCancelSetStateObj = { updateCategoryName: null };
      submitFunction = this.onUpdateCategoryName.bind(this);

      // Submission is only permitted in the update category modal if
      // a new category name exists and is different than the original
      submissionPermitted = updateCategoryName !== '' && updateCategoryName !== categoryTitle;
    }

    // Render modal markup
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Modal */}
        <div className={`alert alert-${alertType} text-center pop-up ${styles.modal}`}>

          {/* Input Label */}
          <label
            htmlFor={`${modalType}-category-input`}
            className={styles['modal-input-label']}
            onClick={(e) => e.preventDefault()}
          >

            {/* Label Text */}
            <div className={styles['modal-input-label-text']}>
              {`${labelTextCommand} Category Name:`}
            </div>

            {/* Category Input */}
            <input
              id={`${modalType}-category-input`}
              className={`form-control ${styles['modal-input']}`}
              autoFocus
              type="text"
              maxLength="60"
              value={inputValue}
              onChange={(e) => {
                const setStateObj = {};
                setStateObj[inputStateKey] = e.target.value;

                this.setState(setStateObj);
              }}
              onFocus={(e) => {
                if (modalType === 'update') {
                  e.target.select();
                }
              }}
              onKeyPress={(e) => {
                preventSpaceFirst(e.target.value, e.key, () => e.preventDefault());

                if (e.key === 'Enter' && submissionPermitted) {
                  submitFunction();
                }
              }}
              ref={(inputRef) => {
                this[inputRefName] = inputRef;
              }}
            />
          </label>

          {/* Submit Button */}
          <button
            className={`btn btn-lg btn-${btnType} left-side-button`}
            type="button"
            disabled={!submissionPermitted}
            onClick={submitFunction}
          >
            Submit
          </button>

          {/* Cancel Button */}
          <button
            className="btn btn-lg btn-danger"
            type="button"
            onClick={() => this.setState(onCancelSetStateObj)}
            onKeyDown={(e) => preventModalTabEscape(
              e.key,
              () => e.preventDefault(),
              () => this[inputRefName].focus()
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  renderDeleteModal(isModalAriaHidden, buttonAutoFocus) {
    const { categoryTitle } = this.state;

    // Return Delete Modal Markup
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Modal */}
        <div className={`alert alert-danger pop-up ${styles.modal}`}>

          {/* Warning Text */}
          <h3 className="text-center warning-text">
            {`Are you sure you want to delete the "${categoryTitle}" category?`}
          </h3>

          {/* Button Group */}
          <div className="text-center">

            {/* Delete Button */}
            <button
              className="btn btn-lg btn-danger left-side-button"
              type="button"
              autoFocus={buttonAutoFocus}
              onClick={this.onDeleteCategory.bind(this)}
              ref={(deleteCatYesBtn) => {
                this.deleteCatYesBtn = deleteCatYesBtn;
              }}
            >
              Yes
            </button>

            {/* Cancel Button */}
            <button
              className="btn btn-lg btn-primary"
              type="button"
              onClick={() => this.setState({ deleteCategoryModalRendered: false })}
              onKeyDown={(e) => preventModalTabEscape(
                e.key,
                () => e.preventDefault(),
                () => this.deleteCatYesBtn.focus()
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderCategoryWarning() {
    const { navigationAlert } = this.props;

    // Initial variable's value is for the standard no categories warning
    let categoryWarningTxt = 'You have no categories yet!';

    // If the user just tried to visit either the home page or an images
    // page, change the variable's value to a more specific warning
    if (navigationAlert === 'visited-home') {
      categoryWarningTxt = 'You must add a category before you can play the game!';
    } else if (navigationAlert === 'visited-images') {
      categoryWarningTxt = 'You must add a category before managing images!';
    }

    // Warning Markup
    return (
      <div
        className={`
          ${styles['warning-text']}
          ${styles['category-warning-text']}
        `}
        ref={(categoryWarningText) => {
          this.categoryWarningText = categoryWarningText;
        }}
      >
        {categoryWarningTxt}
      </div>
    );
  }

  renderNoCategories(isAriaHidden) {
    const { noCategoriesEmojiMaxHeight } = this.state;

    // Return no categories markup
    return (
      <div className="text-center" aria-hidden={isAriaHidden}>

        {/* Add Category Button */}
        <button
          className="btn btn-lg btn-success"
          type="button"
          onClick={() => this.setState({ addCategoryModalRendered: true })}
        >
          Add A New Category
        </button>

        {/* Horizontal Rule */}
        <hr className={styles['no-categories-hr']} />

        {/* Warning Text and No Categories Emoji */}
        <div>

          {/* Warning text */}
          {this.renderCategoryWarning()}

          {/* No Categories Emoji */}
          <img

            // Render next-gen image version if browser support exists
            src={
              document.body.classList.contains('webp')
                ? '../../images/next-gen/no-categories-emoji.webp'
                : '../../images/standard/no-categories-emoji.png'
            }

            alt="Shocked emoji"
            className={styles['no-categories-emoji']}
            style={{ maxHeight: noCategoriesEmojiMaxHeight }}
          />
        </div>
      </div>
    );
  }

  renderCategoryOptionsPaginationNav() {
    const { categories } = this.props;
    const { categoryPageNum, windowWidth } = this.state;
    const lastPage = categories ? ceil((categories.length - 1) / 10) : null;
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
        className={key !== keys(pageNums)[keys(pageNums).length - 1] ? styles['title-pagination-btn'] : styles['last-title-pagination-btn']}
        onClick={() => this.onClickCategoryPaginationButton(pageNums[key])}

        // Prevent dropdown tab escape
        onKeyDown={(e) => {
          if (windowWidth > 991.5 && key === keys(pageNums)[keys(pageNums).length - 1]) {
            preventModalTabEscape(
              e.key,
              () => e.preventDefault(),
              () => this.selectDifCatDropdownButton.focus()
            );
          }
        }}

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

    // Render the category pagination navigation
    return (
      <div
        className={styles['title-pagination-nav']}
        ref={(paginationNav) => {
          this.titlePaginationNav = paginationNav;
        }}
      >
        {paginationBtns}
      </div>
    );
  }

  renderOtherCategoryOptions() {
    const { props } = this;
    const {
      categoryId,
      categoryPageNum,
      imageIdsToBeUpdated,
      windowWidth
    } = this.state;
    const windowWidthExcludingScrollbar = document.getElementsByTagName('html')[0].clientWidth;
    const categories = [];
    const categoryIndexes = [];
    const onClickCategoryOption = (catId, keyboardClickEvent) => {
      // If a keyboard click occurred, prevent the default and set the state to close
      // the manage category dropdown
      if (keyboardClickEvent) {
        keyboardClickEvent.preventDefault();
        this.setState({ manageCategoryDropdownOpen: false });
      }

      // If unsaved changes exist, render the unsaved changes alert.
      // Otherwise, fetch any necessary images.
      if (imageIdsToBeUpdated.length !== 0) {
        this.setState({ unsavedChangesAlertRendered: true });
      } else {
        this.fetchNecessaryImages(catId, 1);
      }
    };

    // Do not include the currently selected category as an option
    const initCats = props.categories.slice();
    forEach(initCats, (cat, i) => {
      if (cat && cat.id === categoryId) {
        initCats.splice(i, 1);
        return false;
      }

      return null;
    });

    // Form the categories and categoryIndexes arrays from the categories redux state
    if (initCats) {
      let lastIndex = (categoryPageNum * 10) - 1;
      let firstIndex = lastIndex - 9;

      // Change values of firstIndex and lastIndex if the user is on the last page
      if (categoryPageNum === ceil(initCats.length / 10)) {
        lastIndex = initCats.length - 1;
        const addend = initCats.length % 10 === 0 ? 10 : initCats.length % 10;
        firstIndex = lastIndex - (addend - 1);
      }

      // Form the arrays
      for (let i = firstIndex; i <= lastIndex; i += 1) {
        categories.push(initCats[i]);
        categoryIndexes.push(i);
      }
    }

    // Render the category options markup
    return map(categories, (category, i) => {
      // Render all categories as options, except for the currently selected category
      if (category) {
        const catLinkMaxWidth = windowWidthExcludingScrollbar * 0.85;
        const catLinkWidthStyle = { maxWidth: catLinkMaxWidth };
        if (windowWidth < 991.5) {
          catLinkWidthStyle.width = catLinkMaxWidth;
        }

        // Render the category option markup
        return (
          // Wrap link in li for styling purposes
          <li
            key={category.id}
            className="text-center"
          >

            {/* Link to category's page */}
            <Link
              to={`/categories/${category.id}/1`}
              role="button"
              tabIndex="0"
              className={`text-with-max-width ${styles['category-dropdown-option']}`}
              style={catLinkWidthStyle}
              onClick={() => onClickCategoryOption(category.id)}
              onKeyDown={(e) => {
                // If the device is a desktop, and the user tabs while focused
                // on the last option, prevent escape from dropdown
                if (
                  windowWidth > 991.5
                  && i === categories.length - 1
                  && !(props.categories.length > 11)
                ) {
                  preventModalTabEscape(
                    e.key,
                    () => e.preventDefault(),
                    () => this.selectDifCatDropdownButton.focus()
                  );
                }
              }}

              // Make option clickable via keyboard
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onClickCategoryOption(category.id, e);
                }
              }}
            >

              {/* Category Title Text */}
              {category.title}

            </Link>
          </li>
        );
      }

      return null;
    });
  }

  renderDesktopHeaderButtons() {
    const { categories } = this.props;
    const {
      categoryTitle,
      desktopCatListMaxHeight,
      imageIdsToBeUpdated,
      manageCategoryDropdownOpen,
      selectCategoryDropdownOpen
    } = this.state;
    const isManageDropdownOpenClassName = manageCategoryDropdownOpen ? 'open' : '';
    const isSelectDropdownOpenClassName = selectCategoryDropdownOpen ? 'open' : '';

    // Desktop Dropdowns Markup
    return (
      // Button Row Container
      <div className={styles['desktop-header-button-row-container']}>

        {/* Button Row */}
        <div className={styles['header-button-row']}>

          {/* Manage Category Dropdown Button Wrapper */}
          <div className={`inline-block ${styles['desktop-header-button-wrapper']}`}>

            {/* Manage Category Dropdown */}
            <div className={`dropdown ${isManageDropdownOpenClassName} inline-block`}>

              {/* Dropdown Button */}
              <button
                className={`
                  btn
                  btn-lg
                  btn-primary
                  dropdown-toggle
                  ${styles['desktop-header-dropdown-button']}
                  ${styles['manage-category-dropdown-button']}
                `}
                type="button"
                onClick={() => {
                  this.setState({
                    manageCategoryDropdownOpen: !manageCategoryDropdownOpen
                  });
                }}
                ref={(manageCategoryDropdownButton) => {
                  this.manageCategoryDropdownButton = manageCategoryDropdownButton;
                }}
              >

                {/* Dropdown Button Text */}

                {/* Static Text */}
                Manage&nbsp;

                {/* Category Title */}
                <span
                  className={`
                    text-with-max-width
                    ${styles['category-title']}
                    ${styles['manage-category-title']}
                  `}
                >

                  {/* Static Text */}
                  &quot;

                  {/* Category Title Text */}
                  {categoryTitle}

                </span>

                {/* Static Text */}
                &quot;&nbsp;&nbsp;

                {/* Caret */}
                <div className="inline-block pull-right">
                  <span className="caret" />
                </div>

              </button>

              {/* Dropdown Menu */}
              <ul className={`dropdown-menu ${styles['desktop-header-dropdown-menu']}`}>

                {/* Change Category Name Button */}
                <li>
                  <div
                    className={`text-center ${styles['manage-category-dropdown-option']}`}
                    role="button"
                    tabIndex="0"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        this.setState({
                          updateCategoryName: categoryTitle,
                          manageCategoryDropdownOpen: false
                        });
                      }
                    }}
                    onClick={() => this.setState({ updateCategoryName: categoryTitle })}
                  >
                    Change Category Name
                  </div>
                </li>

                {/* Delete Category Button */}
                <li>
                  <div
                    className={`text-center ${styles['manage-category-dropdown-option']}`}
                    role="button"
                    tabIndex="0"
                    onClick={() => this.setState({ deleteCategoryModalRendered: true })}
                    onKeyDown={(e) => preventModalTabEscape(
                      e.key,
                      () => e.preventDefault(),
                      () => this.manageCategoryDropdownButton.focus()
                    )}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        this.setState({
                          deleteCategoryModalRendered: true, manageCategoryDropdownOpen: false
                        });
                      }
                    }}
                  >

                    {/* Button Text */}

                    {/* Static Text */}
                    Delete&nbsp;

                    {/* Category Title */}
                    <span
                      className={`
                        text-with-max-width
                        ${styles['category-title']}
                        ${styles['delete-category-title']}
                      `}
                    >

                      {/* Static Text */}
                      &quot;

                      {/* Category Title Text */}
                      {categoryTitle}

                    </span>

                    {/* Static Text */}
                    &quot;&nbsp;Category

                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Add Category Button Wrapper */}
          <div className={`text-center inline-block ${styles['desktop-header-button-wrapper']}`}>

            {/* Add Category Button */}
            <button
              className="btn btn-lg btn-success"
              type="button"
              onClick={() => {
                // If there are unsaved changes, render the unsaved changes alert.
                // Else render the add category modal.
                if (imageIdsToBeUpdated.length !== 0) {
                  this.setState({ unsavedChangesAlertRendered: true });
                } else {
                  this.setState({ addCategoryModalRendered: true });
                }
              }}
            >
              Add A New Category
            </button>
          </div>

          {/* Select Different Category Dropdown Button Wrapper */}
          <div className={`text-right inline-block ${styles['desktop-header-button-wrapper']}`}>

            {/* Select Different Category Dropdown */}
            <div className={`dropdown ${isSelectDropdownOpenClassName} inline-block`}>

              {/* Dropdown Button */}
              <button
                className={`
                  btn
                  btn-lg
                  btn-primary
                  dropdown-toggle
                  ${styles['desktop-header-dropdown-button']}
                `}
                type="button"

                // Disable button if there are no other categories to choose from
                disabled={categories.length < 2}

                onClick={() => {
                  this.setState(
                    { selectCategoryDropdownOpen: !selectCategoryDropdownOpen },
                    () => this.setNewlyRenderedElementsDimensionalState({})
                  );
                }}
                ref={(selectDifCatDropdownButton) => {
                  this.selectDifCatDropdownButton = selectDifCatDropdownButton;
                }}
              >

                {/* Button Text */}
                Select A Different Category&nbsp;&nbsp;

                {/* Caret */}
                <span className="caret" />
              </button>

              {/* Dropdown Menu */}
              <ul
                className={`dropdown-menu ${styles['desktop-header-dropdown-menu']}`}
                style={{ maxHeight: desktopCatListMaxHeight }}
                ref={(desktopCategoryList) => {
                  this.desktopCategoryList = desktopCategoryList;
                }}
              >

                {/* Render Other Category Options */}
                {this.renderOtherCategoryOptions()}

                {/* If the user has more than 11 categories, render the
                category pagination navigation */}
                {
                  categories.length > 11
                    ? this.renderCategoryOptionsPaginationNav()
                    : null
                }

              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderNonDesktopHeaderDropdown() {
    const { categories } = this.props;
    const {
      categoryTitle,
      imageIdsToBeUpdated,
      manageCategoryDropdownOpen,
      nonDesktopCatListMaxHeight
    } = this.state;
    const windowWidthExcludingScrollbar = document.getElementsByTagName('html')[0].clientWidth;
    const isDropdownOpenClassName = manageCategoryDropdownOpen ? 'open' : '';
    const dropdownMenuMinWidth = windowWidthExcludingScrollbar / 2 > 275
      ? windowWidthExcludingScrollbar / 2
      : 275;
    const onClickAddNewCat = () => {
      // If there are unsaved changes, render the unsaved changes alert.
      // Else, render the add category modal. Close the manage category dropdown either way.
      if (imageIdsToBeUpdated.length !== 0) {
        this.setState({ manageCategoryDropdownOpen: false, unsavedChangesAlertRendered: true });
      } else {
        this.setState({
          addCategoryModalRendered: true,
          manageCategoryDropdownOpen: false
        });
      }
    };

    // Non-desktop Dropdown Markup
    return (
      // Dropdown Button Row
      <div className={`text-center dropdown ${isDropdownOpenClassName} ${styles['header-button-row']}`}>

        {/* Dropdown Button */}
        <button
          className="btn btn-lg btn-primary dropdown-toggle"
          type="button"
          ref={(manageCategoryDropdownBtn) => {
            this.manageCategoryDropdownBtn = manageCategoryDropdownBtn;
          }}
          onClick={() => {
            this.setState(
              { manageCategoryDropdownOpen: !manageCategoryDropdownOpen },
              () => this.setNewlyRenderedElementsDimensionalState({})
            );
          }}
        >

          {/* Button Text */}
          Manage Categories&nbsp;&nbsp;

          {/* Caret */}
          <span className="caret" />

        </button>

        {/* Dropdown Menu */}
        <ul
          className={`dropdown-menu ${styles['non-desktop-header-dropdown-menu']}`}
          style={{ minWidth: dropdownMenuMinWidth }}
        >

          {/* Current Category Options Header */}
          <li className={`text-center dropdown-header ${styles['non-desktop-main-dropdown-header']}`}>

            {/* Header Text */}

            {/* Category Title Text */}
            <span
              className={`text-with-max-width ${styles['dropdown-header-category-title']}`}

              // Max width is 75% of the window width, minus the combined
              // widths of the surrounding static elements
              style={{ maxWidth: windowWidthExcludingScrollbar * 0.75 - 92 }}
            >

              {/* Static Text */}
              &quot;

              {/* Category Title */}
              {categoryTitle}

            </span>

            {/* Static Text */}
            &quot;&nbsp;Category:

          </li>

          {/* Change Category Name Button */}
          <li>
            <div
              className={`text-center ${styles['manage-category-dropdown-option']}`}
              tabIndex="0"
              role="button"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  this.setState({
                    updateCategoryName: categoryTitle,
                    manageCategoryDropdownOpen: false
                  });
                }
              }}
              onClick={() => {
                this.setState({ updateCategoryName: categoryTitle });
              }}
            >
              Change Category Name
            </div>
          </li>

          {/* Delete Category Button */}
          <li>
            <div
              className={`text-center ${styles['manage-category-dropdown-option']}`}
              tabIndex="0"
              role="button"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  this.setState({
                    deleteCategoryModalRendered: true,
                    manageCategoryDropdownOpen: false
                  });
                }
              }}
              onClick={() => this.setState({ deleteCategoryModalRendered: true })}
            >
              Delete Category
            </div>
          </li>

          {/* Horizontal Divider */}
          <li className="divider" role="separator" />

          {/* If there are other categories to choose from, render the
          "Select Another Category" section */}
          {
            categories.length > 1
              ? (

                // Select Another Category Section
                <div>

                  {/* Select Another Category Header */}
                  <li
                    className={`text-center dropdown-header ${styles['non-desktop-main-dropdown-header']}`}
                    ref={(selectAnotherCatHeader) => {
                      this.selectAnotherCatHeader = selectAnotherCatHeader;
                    }}
                  >
                    Select Another Category:
                  </li>

                  {/* Other Categories To Select From */}
                  <div
                    className={styles['non-desktop-category-list']}
                    style={{ maxHeight: nonDesktopCatListMaxHeight }}
                  >

                    {/* Render Other Category Options */}
                    {this.renderOtherCategoryOptions()}

                    {/* If the user has more than 11 categories, render the
                    category pagination navigation */}
                    {
                      categories.length > 11
                        ? this.renderCategoryOptionsPaginationNav()
                        : null
                    }
                  </div>

                  {/* Horizontal Divider */}
                  <li className="divider" role="separator" />

                </div>
              )

              // If there are no other categories to select from, render nothing
              : null
          }

          {/* Add Category Button */}
          <li>
            <div
              className={`text-center ${styles['manage-category-dropdown-option']}`}
              tabIndex="0"
              role="button"
              onClick={() => onClickAddNewCat()}

              // Prevent dropdown tab escape
              onKeyDown={(e) => preventModalTabEscape(
                e.key,
                () => e.preventDefault(),
                () => this.manageCategoryDropdownBtn.focus()
              )}

              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  onClickAddNewCat();
                }
              }}
              ref={(addCatButton) => {
                this.addCatButton = addCatButton;
              }}
            >
              Add A New Category
            </div>
          </li>
        </ul>
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
            ${styles['warning-text']}
            ${styles['images-warning-text']}
          `}
          ref={(noImagesText) => {
            this.noImagesText = noImagesText;
          }}
        >
          You have no images in your library yet!
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

  renderImageButton(imageId, imageOrderPlacementOnPage) {
    const { categoryImages, imageIdsToBeUpdated, pageNumber } = this.state;
    const numOfCategoryImages = categoryImages.length;
    const imageIndex = (maxImagesPerPage() * (pageNumber - 1)) + imageOrderPlacementOnPage;
    const imageBelongsToCategory = imageIndex < numOfCategoryImages;
    const imageIsSetToBeUpdated = includes(imageIdsToBeUpdated, imageId);

    // Initial variables' values are for Add To Category button
    let btnType = 'success';
    let btnText = 'Add To Category';

    // If the condition below is met, render the Delete From Category button
    if (
      (imageBelongsToCategory && !imageIsSetToBeUpdated)
      || (!imageBelongsToCategory && imageIsSetToBeUpdated)
    ) {
      btnType = 'danger';
      btnText = 'Delete From Category';
    }

    // Return the button
    return (
      <button
        className={`btn btn-lg btn-${btnType} ${styles['image-button']}`}
        type="button"
        onClick={() => this.setImagesToBeUpdatedState(imageId)}
      >
        {btnText}
      </button>
    );
  }

  renderImages(pageImageObjects, isAriaHidden) {
    const { categories } = this.props;
    const { categoryId, imageMaxHeight } = this.state;

    // Define category and categoryIndex
    let category = null;
    let categoryIndex = null;
    forEach(categories, (cat, i) => {
      if (cat && cat.id === categoryId) {
        category = cat;
        categoryIndex = i;
        return false;
      }

      return null;
    });

    // For each of the images to be rendered...
    return map(pageImageObjects, (image, i) => {
      const { nonCatImages } = category;

      // Initial values are for non-cat image
      const imageProps = {
        category,
        categoryIndex,
        imageId: image.id,
        imgIndex: nonCatImages ? nonCatImages.indexOf(image) : null,
        imageMaxHeight,
        imagePathname: image.image,
        isCatPageImage: true,
        isNonCatImage: true
      };

      // Change values for cat image
      if (includes(category.images, image)) {
        imageProps.imgIndex = category.images.indexOf(image);
        delete imageProps.isNonCatImage;
      }

      // Return the image inside a container
      return (
        // Image container
        <div
          className="col-md-3 col-sm-4 col-xs-12 text-center image-container"
          key={`C${category.id}-I${image.id}`}
          aria-hidden={isAriaHidden}
          ref={(imageContainer) => {
            this.imageContainer = imageContainer;
          }}
        >

          {/* Render the image */}
          <Image {...imageProps} />

          {/* Render the image button */}
          <div className="text-center">
            {this.renderImageButton(image.id, i)}
          </div>
        </div>
      );
    });
  }

  renderPageBody(numberOfImages, isAriaHidden) {
    const {
      categoryId,
      maxImagesPerPage,
      pageNumber,
      renderedImages
    } = this.state;

    // If the user has no images, render no images markup
    if (numberOfImages === 0) {
      return this.renderNoImages(isAriaHidden);
    }

    // If the user has images...
    const images = new Array(numberOfImages);
    const multiplePages = numberOfImages > maxImagesPerPage;

    // Store the page images markup as a constant
    const pageImages = this.renderImages(renderedImages, isAriaHidden);

    // If there are multiple pages of images, render the pagination navigation at the top
    // and bottom of the page, with the images in the middle
    if (multiplePages) {
      return (
        <div aria-hidden={isAriaHidden}>

          {/* Top Pagination Nav */}
          <PaginationNav
            categoryId={categoryId}
            images={images}
            parentComp="Categories"
            navLocation="top"
            currentPageNumber={pageNumber}
            onChangePageNumber={(newPageNumber) => {
              this.fetchNecessaryImages(categoryId, newPageNumber, null, null, true);
            }}
          />

          {/* Page's images */}
          <div className="clearfix">
            { pageImages }
          </div>

          {/* Bottom Pagination Nav */}
          <PaginationNav
            categoryId={categoryId}
            images={images}
            parentComp="Categories"
            navLocation="bottom"
            currentPageNumber={pageNumber}
            onChangePageNumber={(newPageNumber) => {
              this.fetchNecessaryImages(categoryId, newPageNumber, null, null, true);
            }}
          />
        </div>
      );
    }

    // Else only render the page's images
    return pageImages;
  }

  renderMainContent(isAriaHidden) {
    const { categories } = this.props;
    const {
      categoryId,
      categoryTitle,
      imageIdsToBeUpdated,
      windowWidth
    } = this.state;
    const windowWidthExcludingScrollbar = document.getElementsByTagName('html')[0].clientWidth;

    // Define numberOfImages
    let numberOfImages = 0;
    forEach(categories, (cat) => {
      if (cat && cat.id === categoryId && cat.images && cat.nonCatImages) {
        numberOfImages = cat.images.length + cat.nonCatImages.length;
        return false;
      }

      return null;
    });

    // If user has no images, render image library link as the "main buttons"
    let mainButtons = (
      <Link to="/images/pg-1">
        <button
          className={`btn btn-lg btn-success ${styles['img-library-button']}`}
          type="button"
        >
          Go To Image Library
        </button>
      </Link>
    );

    // If user has images, render the save changes and discard changes buttons as the main buttons
    if (numberOfImages !== 0) {
      const btnCommandTexts = ['Save', 'Discard'];

      // Initial variables' values are for the "Save Changes" button)
      let btnColorClassNamePortion = 'success';
      let specialClassNamePortion = styles['save-changes-button'];
      let onClickFunc = this.onUpdateCategoryImages;

      // Set the mainButtons variable value
      mainButtons = (
        <div>
          {
            map(btnCommandTexts, (commandText, i) => {
              // Change variables' values if the "Discard Changes" button is to be rendered
              if (i === 1) {
                btnColorClassNamePortion = 'danger';
                specialClassNamePortion = '';
                onClickFunc = () => this.setState({ discardChangesValidationRendered: true });
              }

              // Main Buttons Markup
              return (
                <button
                  key={i}
                  className={`
                    btn
                    btn-${btnColorClassNamePortion}
                    ${windowWidth < 767.5 ? 'btn-md' : 'btn-lg'}
                    ${styles['changes-button']}
                    ${specialClassNamePortion}
                  `}
                  type="button"

                  // Disable button if no images have been selected to be updated
                  disabled={imageIdsToBeUpdated.length === 0}

                  onClick={onClickFunc.bind(this)}
                >

                  {/* Button Text */}
                  {commandText}
                  &nbsp;Changes

                </button>
              );
            })
          }

        </div>
      );
    }

    // Main content markup
    return (
      <div aria-hidden={isAriaHidden}>

        {/* For non-desktops, render the non-desktop dropdown.
        For desktops, render header buttons. */}
        {
          windowWidth < 991.5
            ? this.renderNonDesktopHeaderDropdown()
            : this.renderDesktopHeaderButtons()
        }

        {/* Horizontal Rule */}
        <hr className={styles['main-hr']} />

        {/* Page Heading */}
        <h1 className={`text-center ${styles['page-heading']}`}>
          <div>

            {/* Category Title */}
            <span
              className={`text-with-max-width ${styles['category-title']}`}

              // Max width is the window width, minus the combined
              // widths of the surrounding static elements and desired padding
              style={
                windowWidth > 767.5
                  ? { maxWidth: windowWidthExcludingScrollbar - 220 }
                  : { maxWidth: windowWidthExcludingScrollbar - 60 }
              }
            >
              &quot;
              {categoryTitle}
            </span>
            &quot;
          </div>

          {/* Static Text */}
          Images

        </h1>

        {/* Main Buttons Wrapper */}
        <div className={`text-center ${styles['main-buttons-wrapper']}`}>

          {/* Main Buttons */}
          { mainButtons }

        </div>

        {/* Render the page's body (i.e. images markup, pagination navigation, etc. */}
        {this.renderPageBody(numberOfImages, isAriaHidden)}

      </div>
    );
  }

  render() {
    const { categories, serverErrors } = this.props;
    const {
      addCategoryModalRendered,
      componentIsLoading,
      deleteCategoryModalRendered,
      deletedAnimation,
      discardChangesValidationRendered,
      imageIdsToBeUpdated,
      manageCategoryDropdownOpen,
      requestPending,
      savedAnimation,
      selectCategoryDropdownOpen,
      unsavedChangesAlertRendered,
      updateCategoryName
    } = this.state;
    const buttonAutoFocus = !document.body.classList.contains('touchscreen');
    const isAriaHidden = updateCategoryName !== null
      || addCategoryModalRendered
      || deleteCategoryModalRendered
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
      <div
        // Close the manageCategoryDropdown and selectCategoryDropdown on click outside
        onClick={(e) => {
          // If the category pagination navigation exists, do not close the dropdowns
          // if the click occurred inside the pagination navigation
          if (this.titlePaginationNav) {
            if (!this.titlePaginationNav.contains(e.target)) {
              if (manageCategoryDropdownOpen) {
                this.setState({ manageCategoryDropdownOpen: false });
              } else if (selectCategoryDropdownOpen) {
                this.setState({ selectCategoryDropdownOpen: false });
              }
            }
          }

          // If the category pagination navigation does not exist, close the dropdowns
          // on click outside
          else {
            if (manageCategoryDropdownOpen) {
              this.setState({ manageCategoryDropdownOpen: false });
            } else if (selectCategoryDropdownOpen) {
              this.setState({ selectCategoryDropdownOpen: false });
            }
          }
        }}
      >

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
          <Header
            aria-hidden={isAriaHidden}
            renderUnsavedCatChangesAlert={() => {
              this.setState({ unsavedChangesAlertRendered: true });
            }}
            unsavedCatChanges={imageIdsToBeUpdated.length !== 0}
          />

          {/* Render an animation if the component is in an animation state */}
          {
            savedAnimation || deletedAnimation
              ? <Animation somethingWasDeleted={deletedAnimation} />
              : null
          }

          {/* If the unsaved changes alert is to be rendered, render it */}
          {
            unsavedChangesAlertRendered
              ? this.renderUnsavedChangesAlert(isModalAriaHidden, buttonAutoFocus)
              : null
          }

          {/* If the discard changes validation is to be rendered, render it */}
          {
            discardChangesValidationRendered
              ? this.renderDiscardChangesValidation(isModalAriaHidden, buttonAutoFocus)
              : null
          }

          {/* If component is in add category modal state, render add category modal */}
          { addCategoryModalRendered ? this.renderAddOrUpdateModal('add', isModalAriaHidden) : null }

          {/* If component is in update category name state, render update category name modal */}
          {
            updateCategoryName !== null
              ? this.renderAddOrUpdateModal('update', isModalAriaHidden)
              : null
          }

          {/* If component is in delete category modal state, render delete category modal */}
          {
            deleteCategoryModalRendered
              ? this.renderDeleteModal(isModalAriaHidden, buttonAutoFocus)
              : null
          }

          {/* If the user has no categories, render the no categories markup,
          otherwise render the component's typical main content markup */}
          {
            categories.length === 0
              ? this.renderNoCategories(isAriaHidden)
              : this.renderMainContent(isAriaHidden)
          }
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const {
    auth: { authenticated },
    categories,
    images,
    navigationAlert,
    serverErrors
  } = state;

  return {
    authenticated,
    categories,
    images,
    navigationAlert,
    serverErrors
  };
}

export default connect(
  mapStateToProps,
  {
    addCategory,
    fetchCategory,
    fetchCategoryTitles,
    fetchNonCatImages,
    updateCategoryName,
    updateCategoryImages,
    deleteCategory,
    clearNavigationAlert
  }
)(Categories);
