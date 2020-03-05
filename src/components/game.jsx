import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  assign,
  ceil,
  floor,
  forEach,
  includes,
  keys,
  map,
  shuffle
} from 'lodash-es';

import {
  fetchCategory,
  fetchCategoryTitles,
  fetchCategoryImage,
  fetchWinTotal,
  updateWinTotal,
  notEnoughImages,
  visitedHome
} from '../actions';

import {
  manageKeyboardAccessibility,
  preventModalTabEscape,
  serverErrorsInvisibleBackground
} from '../utils';

import Header from './header';
import Loader from './loader';
import ServerErrorsPopup from './server_errors_popup';
import styles from '../style/game.css';

class Game extends Component {
  static falseArray(boxNumber) {
    const falseArray = [];

    // Create an array of only values equal to false,
    // whose length is equal to the game's number of boxes
    for (let i = 0; i < boxNumber; i += 1) {
      falseArray.push(false);
    }

    // Return this array
    return falseArray;
  }

  static gridContainerWidths(windowWidth) {
    const windowWidthExcludingScrollbar = document.getElementsByTagName('html')[0].clientWidth;

    // Initial variable's value is for phone-size devices
    // (all values are based on bootstrap classes or custom widths)
    let gridContainerWidth = windowWidthExcludingScrollbar - 30; // 30 is grid padding

    // Value below = (1170 * 0.8333333333) - 90. 90 is extended grid padding.
    // Variable only applies to small and large desktop devices.
    // Initial variable's value is for large desktop devices.
    // (all values are based on bootstrap classes or custom widths).
    let extendedGridContainerWidth = 884.999999961;

    // For tablet-size devices, change the gridContainerWidth value
    if (windowWidth > 767.5 && windowWidth < 991.5) {
      gridContainerWidth = 720;
    }

    // For small desktop sized devices, change the variables' values
    else if (windowWidth > 991.5 && windowWidth < 1199.5) {
      gridContainerWidth = (0.95 * windowWidthExcludingScrollbar * 0.6666666667) - 90;
      extendedGridContainerWidth = (0.95 * windowWidthExcludingScrollbar * 0.8333333333) - 90;
    }

    // For large desktop sized devices, change the gridContainerWidth's value
    else if (windowWidth > 1199.5) {
      gridContainerWidth = 690;
    }

    // Return the grid container width and extended grid container width
    return { gridContainerWidth, extendedGridContainerWidth };
  }

  constructor(props) {
    super(props);

    this.state = {
      bonusBlinking: false,
      boxNumberInput: '',
      boxNumBtnFocused: false,
      boxWidth: null,
      categoryIndex: null,
      categoryPageNum: 1,
      categoryTitle: '',
      categoryValidationRendered: false,
      checkmarkRendered: false,
      clickedImgIndex: null,
      componentIsLoading: true,
      enoughImages: true,
      extendGrid: false,
      gameImages: [],
      gridIsDirty: false,
      gridSizeValidates: true,
      imgIsLoading: false,
      lastClickedImgIndex: null,
      matchArray: [],
      mouseDownBoxNumBtnAfterBoxNumInputFocus: false,
      newImgShown: false,
      numColumns: null,
      numRows: null,
      panelDropdownMenuMaxHeight: null,
      panelDropdownOpen: false,
      reloadImage: false,
      requestedCatIndexBeforeCatValidation: null,
      requestPending: false,
      resetWinTotalValidationRendered: false,
      secondGuess: false,
      shownImgs: [],
      submittedBoxNumber: null,
      waitPeriod: false,
      wasNewCategorySelected: false,
      win: false,
      windowWidth: document.body.classList.contains('safari')
        ? document.getElementsByTagName('html')[0].clientWidth
        : window.innerWidth,
      winTotalIsLoading: false
    };

    const functionsToBeBound = [
      'closeOpenDropdownsOnClickOutside',
      'updateDimensions'
    ];

    // Bind this to all necessary functions
    forEach(functionsToBeBound, (functionToBeBound) => {
      this[functionToBeBound] = this[functionToBeBound].bind(this);
    });

    // Add event listeners
    document.addEventListener('click', this.closeOpenDropdownsOnClickOutside);
    window.addEventListener('resize', this.updateDimensions);
    window.addEventListener(
      'keydown',
      (e) => {
        const { requestPending, waitPeriod } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          requestPending || waitPeriod
        );
      }
    );

    // Store constant values that may be accessed multiple times in this component
    this.bonusSrc = document.body.classList.contains('webp')
      ? '../../images/next-gen/bonus.webp'
      : '../../images/standard/bonus.jpg';
    this.windowAvailHeightInnerHeightDif = window.screen.availHeight - window.innerHeight;
  }

  componentDidMount() {
    const { categories, fetchCategoryTitles } = this.props;

    // If no data has been fetched for the user's categories...
    if (!categories) {
      // Fetch the user's first eleven category titles...
      fetchCategoryTitles(11, 1, () => {
        const { categories, history } = this.props;

        // If the user has no categories, redirect to the categories page
        if (categories.length === 0) {
          const { navigationAlert, visitedHome } = this.props;

          // If warnings are not disabled, activate the visted home warning
          if (navigationAlert !== 'warnings-disabled') {
            visitedHome();
          }

          // Redirect to categories page
          history.push('/categories');
        }

        // If the user has categories...
        else {
          const { fetchCategory } = this.props;

          // Fetch the user's first category, including its first four images.
          // Then, determine whether the user should be redirected,
          // or the mounted game state should be set
          fetchCategory(0, null, 4, 0, () => {
            const { props } = this;

            // If the categories state is unchanged, the user does not have enough
            // images to play the game, so redirect to the images page
            if (props.categories === categories) {
              const { navigationAlert, notEnoughImages } = this.props;

              // If navigation warnings are not disabled, activate the not enough images warning
              if (navigationAlert !== 'warnings-disabled') {
                notEnoughImages();
              }

              // Redirect to images page
              history.push('/images');
            }

            // Else determine whether to redirect or set the mounted game state
            else {
              this.redirectOrSetMountedGameState();
            }
          },
          true);
        }
      });
    }

    // If some data for the user's categories has been fetched...

    // If the user has no categories, redirect to the categories page
    else if (categories.length === 0) {
      const { history, navigationAlert, visitedHome } = this.props;

      // If navigation warnings are not disabled, activate the visted home warning
      if (navigationAlert !== 'warnings-disabled') {
        visitedHome();
      }

      // Redirect to categories page
      history.push('/categories');
    }

    // If the user has some categories, but does not have at least two images in
    // any of the categories that have already been fetched...
    else if (this.defaultCategoryIndex() === null) {
      const { fetchCategory } = this.props;

      // Attempt to fetch the user's first category with at least two images in it
      fetchCategory(0, null, 4, 0, () => {
        const { props } = this;

        // If the user does not have at least two images in any category,
        // redirect to the images page
        if (props.categories === categories) {
          const { history, navigationAlert, notEnoughImages } = this.props;

          // If navigation alerts are not disabled, activate the not enough images warning
          if (navigationAlert !== 'warnings-disabled') {
            notEnoughImages();
          }

          // Redirect to images page
          history.push('/images');
        }

        // Else determine whether to redirect or set the mounted game state
        else {
          this.redirectOrSetMountedGameState();
        }
      }, true);
    }

    // If the user has at least two images in one category, determine
    // whether to redirect or set the mounted game state
    else {
      this.redirectOrSetMountedGameState();
    }
  }

  componentWillUnmount() {
    // Remove event listeners
    document.removeEventListener('click', this.closeOpenDropdownsOnClickOutside);
    window.removeEventListener('resize', this.updateDimensions);
    window.removeEventListener(
      'keydown',
      (e) => {
        const { requestPending, waitPeriod } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          requestPending || waitPeriod
        );
      }
    );
  }

  onClickCategoryOption(categoryIndex) {
    const { state } = this;
    const { categories } = this.props;
    const { gridIsDirty, win } = state;

    // If the user is in mid-game...
    if (gridIsDirty && !win) {
      // Set the state to render a validation box before changing the category
      this.setState({
        categoryValidationRendered: true,
        requestedCatIndexBeforeCatValidation: categoryIndex
      });
    }

    // Start a new game with the newly selected category and the default box
    // number for that category
    else {
      // If a new category has been selected that has no images,
      // set the new box number to null (to render a validation).
      // Otherwise set it to the new category's default box number
      const newBoxNumber = categoryIndex !== state.categoryIndex
      && !categories[categoryIndex].images
        ? null
        : this.defaultBoxNumber(categoryIndex);

      // Start the new game
      this.newGame(newBoxNumber, categoryIndex);
    }
  }

  onClickCategoryPaginationButton(newCategoryPageNum) {
    const { categories } = this.props;
    const { categoryIndex } = this.state;
    const initCats = categories.slice();
    let needToFetchCats = false;

    // Set index variables to prepare to render ten category titles
    let lastIndex = (newCategoryPageNum * 10) - 1;
    let firstIndex = lastIndex - 9;

    // Remove the currently selected category from the initCats
    forEach(initCats, (cat, i) => {
      if (cat && i === categoryIndex) {
        initCats.splice(i, 1);
        return false;
      }

      return null;
    });

    // If the user is on the last page, change the values of firstIndex and lastIndex
    if (newCategoryPageNum === ceil(initCats.length / 10)) {
      lastIndex = initCats.length - 1;
      const addend = initCats.length % 10 === 0 ? 10 : initCats.length % 10;
      firstIndex = lastIndex - (addend - 1);
    }

    // If any of the categories required to be rendered have not been fetched,
    // set needToFetchCats to true
    for (let i = firstIndex; i <= lastIndex; i += 1) {
      if (!initCats[i]) {
        needToFetchCats = true;
        i = lastIndex + 1;
      }
    }

    // If categories need to be fetched...
    if (needToFetchCats) {
      // Request is pending
      this.setState({ requestPending: true });

      const { fetchCategoryTitles } = this.props;

      // Fetch the required category titles, then set the state accordingly
      fetchCategoryTitles(10, newCategoryPageNum, () => {
        this.setState({ categoryPageNum: newCategoryPageNum, requestPending: false });
      }, true);
    }

    // Else, set the state with the new category page number
    else {
      this.setState({ categoryPageNum: newCategoryPageNum });
    }
  }

  onKeyPressBoxNumberInput(event) {
    const { boxNumberInput, categoryIndex } = this.state;
    const { key } = event;

    // Do not allow the user to type in e, +, -, ., or a number more than 3 digits.
    // Also, do not allow the user to begin the box number input with 0.
    if (
      ['e', '+', '-', '.'].indexOf(key) >= 0
      || boxNumberInput >= 100
      || (boxNumberInput === '' && key === '0')
    ) {
      event.preventDefault();
    }

    // On keyboard click, if the box input validates,
    // start a new game with the currently entered box number and current category...
    if (key === 'Enter' && this.boxInputValidates()) {
      this.newGame(boxNumberInput, categoryIndex);
    }
  }

  onLoadOrOnErrorCheckmark() {
    // The checkmark image (or error markup for this image)
    // should disappear after 0.8s of being rendered
    setTimeout(() => {
      this.setState({ checkmarkRendered: false });
    }, 800);
  }

  setMountedGameState(defaultCategoryIndex) {
    const { categories } = this.props;
    const initialViewportWidth = document.getElementsByTagName('html')[0].clientWidth;
    const defaultBoxNumber = this.defaultBoxNumber(defaultCategoryIndex);
    const falseArray = Game.falseArray(defaultBoxNumber);
    const gridDimensions = this.gridDimensions(defaultBoxNumber);
    const { numRows } = gridDimensions;

    // Prepare to set the mounted game state
    const setStateObj = {
      boxWidth: gridDimensions.boxWidth,
      categoryIndex: defaultCategoryIndex,
      categoryTitle: categories[defaultCategoryIndex].title,
      componentIsLoading: false,
      extendGrid: gridDimensions.extendGrid,
      gameImages: this.gameImages(defaultBoxNumber, defaultCategoryIndex),
      matchArray: falseArray,
      numColumns: gridDimensions.numColumns,
      numRows,
      shownImgs: falseArray,
      submittedBoxNumber: defaultBoxNumber
    };

    // If the game grid has no rows, the grid size did not validate,
    // so prepare to set the state to reflect that
    if (!numRows) {
      setStateObj.gridSizeValidates = false;
    }

    // Set the mounted game state, then...
    this.setState(setStateObj, () => {
      // If the viewport width (excluding scrollbar) is different than what it
      // was before the state was set, (due to the scrollbar not originally
      // being accounted for), update the dimensions to account for the scrollbar
      if (document.getElementsByTagName('html')[0].clientWidth !== initialViewportWidth) {
        this.updateDimensions();
      }
    });
  }

  setNewlyRenderedElementsDimensionalState(initialSetStateObj, callback) {
    const { gridContainer, panelDropdownMenu } = this;
    const setStateObj = initialSetStateObj;

    // If the grid container and panel dropdown menu elements exist,
    // determine if the panel dropdown menu's max height has changed
    if (gridContainer && panelDropdownMenu) {
      const { panelDropdownMenuMaxHeight } = this.state;

      // The dropdown menu plus its margin should not go past the bottom of the grid,
      // unless this would result in forcing the dropdown to be less than 100px
      let newPanelDropdownMenuMaxHeight = gridContainer.getBoundingClientRect().bottom
        - panelDropdownMenu.getBoundingClientRect().top
        - 15; // Panel dropdown menu's margin bottom
      // If the calculated maxheight is less than 100px, set the maxheight
      // to 100px to allow for a readable display area
      if (newPanelDropdownMenuMaxHeight < 100) {
        newPanelDropdownMenuMaxHeight = 100;
      }

      // If the panel dropdown menu's max height has changed,
      // prepare to set the state to reflect this
      if (panelDropdownMenuMaxHeight !== newPanelDropdownMenuMaxHeight) {
        setStateObj.panelDropdownMenuMaxHeight = newPanelDropdownMenuMaxHeight;
      }
    }

    // Set the state, and execute a callback if one has been passed in
    this.setState(setStateObj, () => {
      if (callback) {
        callback();
      }
    });
  }

  redirectOrSetMountedGameState() {
    const {
      categories,
      fetchWinTotal,
      history,
      winTotal
    } = this.props;

    // If the user has no categories, redirect to the categories page
    // with a notice reflecting this
    if (categories.length === 0) {
      const { navigationAlert, visitedHome } = this.props;

      // If navigation alerts are not disabled, activate the visited home warning
      if (navigationAlert !== 'warnings-disabled') {
        visitedHome();
      }

      // Redirect to the categories page
      history.push('/categories');
    }

    // If the user has at least one category...
    else {
      const defaultCategoryIndex = this.defaultCategoryIndex();

      // If the user does not have at least two images in any category,
      // redirect to the images page with a notice reflecting this
      if (defaultCategoryIndex === null) {
        const { navigationAlert, notEnoughImages } = this.props;

        // If navigation alerts are not disabled, activate the not enough images warning
        if (navigationAlert !== 'warnings-disabled') {
          notEnoughImages();
        }

        // Redirect to the images page
        history.push('/images');
      }

      // If the user has at least one category with at least two images in it,
      // but their win total has not yet been fetched, fetch it, then set the mounted game state
      else if (!winTotal) {
        fetchWinTotal(() => this.setMountedGameState(defaultCategoryIndex));
      }

      // If the user has at least one category with at least two images in it,
      // and their win total has been fetched, set the mounted game state
      else {
        this.setMountedGameState(defaultCategoryIndex);
      }
    }
  }

  updateDimensions() {
    const { state } = this;
    const { gridSizeValidates, shownImgs, submittedBoxNumber } = state;
    const initialWindowWidthExcludingScrollbar = document.getElementsByTagName('html')[0].clientWidth;
    const windowWidth = document.body.classList.contains('safari')
      ? initialWindowWidthExcludingScrollbar
      : window.innerWidth;

    // If the device is a touchscreen and the windowWidth has not been changed,
    // a virtual keyboard appearance has triggered a false resize event,
    // so do not execute the remainder of the updateDimensions method
    if (document.body.classList.contains('touchscreen') && state.windowWidth === windowWidth) {
      return null;
    }

    // Define initial const and let values
    const gridDimensions = this.gridDimensions(submittedBoxNumber, windowWidth);
    const { numRows } = gridDimensions;
    const newGridSizeValidates = !!numRows;
    let reloadImage = false;

    // If the new grid size validates and the old one did not, prepare to reload any shown image
    if (
      gridSizeValidates === false && newGridSizeValidates === true && shownImgs.length > 0
    ) {
      reloadImage = true;
    }

    // Prepare to set the state of the properties listed below,
    // as well as the state of properties dependent on newly rendered elements' dimensions
    this.setNewlyRenderedElementsDimensionalState({
      boxWidth: gridDimensions.boxWidth,
      extendGrid: gridDimensions.extendGrid,
      numColumns: gridDimensions.numColumns,
      numRows,
      gridSizeValidates: newGridSizeValidates,
      reloadImage,
      windowWidth
    }, () => {
      const { state } = this;

      // If the new grid size validates, but the old one did not,
      // or the new window width excluding scrollbar is less than the initial,
      // update the dimensions to account for a potentially new scrollbar
      if ((state.gridSizeValidates && !gridSizeValidates)
        || document.getElementsByTagName('html')[0].clientWidth
          < initialWindowWidthExcludingScrollbar
      ) {
        this.updateDimensions();
      }
    });

    // The updateDimensions method returns null
    return null;
  }

  closeOpenDropdownsOnClickOutside(clickEvent) {
    const { panelDropdownOpen } = this.state;
    const { classList } = clickEvent.target;

    // If the panel dropdown is open, and the click occurred outside the
    // panel dropdown's button and pagination navigation, close the panel dropdown
    if (
      panelDropdownOpen
      && !this.panelDropdownButton.contains(clickEvent.target)
      && !(
        classList.contains(styles['pagination-btn'])
        || classList.contains(styles['last-pagination-btn'])
        || classList.contains(styles['pagination-nav'])
      )
    ) {
      this.panelDropdownMenu.scrollTo(0, 0);
      this.setState({ panelDropdownOpen: false });
    }
  }

  gridDimensionsTrial(
    numRowsArg, numColumnsArg, gridContainerWidth, extendedGridContainerWidth, windowWidth
  ) {
    // Account for a virtual keyboard when defining the windowHeight on a touchscreen device
    const windowHeight = document.body.classList.contains('touchscreen')
      ? window.screen.availHeight - this.windowAvailHeightInnerHeightDif
      : window.innerHeight;

    // Define initial const and let values
    const maxGridWidth = windowWidth < 991.5 ? gridContainerWidth : extendedGridContainerWidth;
    let numRows = numRowsArg;
    let numColumns = numColumnsArg;
    let boxWidth = null;
    let extendGrid = false;
    let i = 0;

    // Rotate the grid to a portrait layout if the window height is
    // greater than the max grid width
    if (windowHeight > maxGridWidth) {
      const initialNumRows = numRows;
      numRows = numColumns;
      numColumns = initialNumRows;

      // The box width loop only needs to be executed once, since the grid has already rotated
      i = 1;
    }

    // Determine the box width...
    for (i; i < 2; i += 1) {
      extendGrid = false;

      // Initially set the box width based on the grid container width
      boxWidth = (gridContainerWidth - 2) / numColumns;

      // Do not allow the grid to be taller than the window
      if (boxWidth * numRows > windowHeight) {
        boxWidth = (windowHeight - 2) / numRows;
      }

      // If the box width is smaller than 80px...
      if (boxWidth < 80) {
        // If the device is desktop-sized...
        if (windowWidth > 991.5) {
        // Extend the grid leftward, and set the new box width based on the
        // extended grid container's width
          extendGrid = true;
          boxWidth = (extendedGridContainerWidth - 2) / numColumns;

          // Do not allow the grid to be taller than the window
          if (boxWidth * numRows > windowHeight) {
            boxWidth = (windowHeight - 2) / numRows;
          }

          // If the box width is smaller than 80px when the grid is shorter than the window,
          // set the boxWidth back to the value based on the extended grid container's width
          if (boxWidth < 80) {
            boxWidth = (extendedGridContainerWidth - 2) / numColumns;
          }
        }

        // If the device is non-desktop-sized, and the boxWidth is smaller
        // than 80px when the grid is shorter than the window,
        // set the boxWidth back to the value based on the grid container's width
        else {
          boxWidth = (gridContainerWidth - 2) / numColumns;
        }
      }

      // If the grid is taller than twice the window height,
      // set the boxWidth to the max height that would allow the grid
      // to fit in twice the window height
      if (boxWidth * numRows > 2 * windowHeight) {
        boxWidth = ((2 * windowHeight) - 2) / numRows;
      }

      // If the box width is smaller than 80px when the grid is shorter
      // than twice the window height, and a rotation to portrait hasn't been attempted,
      // try rotating the grid to a portrait layout
      if (i === 0 && boxWidth < 80) {
        const initialNumRows = numRows;
        numRows = numColumns;
        numColumns = initialNumRows;
      }

      // Else end the box width loop
      else {
        i = 2;
      }
    }

    // Return the grid dimensions values of this trial
    return {
      numRows,
      numColumns,
      boxWidth,
      extendGrid
    };
  }

  gridDimensions(boxNumber, windowWidthArg) {
    const { state } = this;
    const windowWidth = windowWidthArg || state.windowWidth;
    const {
      gridContainerWidth,
      extendedGridContainerWidth
    } = Game.gridContainerWidths(windowWidth);
    let numRows = 2;
    let numColumns = 2;
    let initialDifference = null;
    let boxWidth = null;
    let extendGrid = false;

    // Determine the number of columns and rows in the squarest possible
    // grid for the box number
    // (number of columns as close as possible to the number of rows)
    for (let newNumRows = 2; newNumRows < boxNumber / 2; newNumRows += 1) {
      // If the box number is divisible by the new number of rows...
      if (boxNumber % newNumRows === 0) {
        const newNumColumns = boxNumber / newNumRows;
        const newDifference = Math.abs(newNumColumns - newNumRows);

        // If the difference between the numRows and numColumns is
        // less than it was for the last iteration, (squarer grid dimensions were found)
        // or the initial difference has not yet been set, change the numRows and numColumns
        if (newDifference < initialDifference || initialDifference === null) {
          numRows = newNumRows;
          numColumns = newNumColumns;
          initialDifference = newDifference;
        }

        // Else (if the difference between the numRows and numColumns is
        // greater than its previous value), the squarest grid dimensions
        // have been found, so end the loop
        else {
          newNumRows = boxNumber;
        }
      }
    }

    // Determine the box width, trying a different number of rows and columns
    // if the box width becomes too small
    for (let i = 0; i < boxNumber; i += 1) {
      // Define the grid dimensions values of the trial below
      ({
        numRows, numColumns, boxWidth, extendGrid
      } = this.gridDimensionsTrial(
        numRows, numColumns, gridContainerWidth, extendedGridContainerWidth, windowWidth
      ));

      // If the box width is less than 65px, determine if a different number of
      // rows and columns should be attempted, or if the grid should simply be
      // prevented from rendering
      if (boxWidth < 65) {
        const newNumRowsStart = numRows < numColumns ? numRows - 1 : numColumns - 1;
        let rowsAndColsChanged = false;

        // Determine if a different number of rows and columns should be attempted
        for (let newNumRows = newNumRowsStart; newNumRows > 1; newNumRows -= 1) {
          // If the box number is divisible by the new number of rows...
          if (boxNumber % newNumRows === 0) {
            // A different number of rows and columns will be attempted
            rowsAndColsChanged = true;

            // Change the number of rows and columns, letting the
            // number of columns be the greater number to start
            if (newNumRows > boxNumber / newNumRows) {
              numColumns = newNumRows;
              numRows = boxNumber / newNumRows;
            } else {
              numColumns = boxNumber / newNumRows;
              numRows = newNumRows;
            }

            // End the loop to determine if a different number of rows
            // and columns should be attempted
            newNumRows = 1;
          }
        }

        // If a different number of rows and columns is not to be attempted,
        // prevent the grid from rendering
        if (!rowsAndColsChanged) {
          return { numRows: null, numColumns: null, boxWidth: null };
        }
      }

      // If the box width is at least 65px, end the loop to determine the box width
      else {
        i = boxNumber;
      }
    }

    // If the grid width is less than or equal to the normal grid container width,
    // the grid is not extended
    if (boxWidth * numColumns <= gridContainerWidth) {
      extendGrid = false;
    }

    // Return the grid dimensions values
    return {
      numRows,
      numColumns,
      boxWidth,
      extendGrid
    };
  }

  defaultBoxNumber(categoryIndex) {
    const { categories } = this.props;
    const numberOfCategoryImages = categories[categoryIndex].images.length;

    // The default box number is 9 if there are at least 4 images in the category
    if (numberOfCategoryImages >= 4) {
      return 9;
    }

    // The default box number is 6 if there are 3 images in the category
    if (numberOfCategoryImages === 3) {
      return 6;
    }

    // The default box number is 4 if there are two or fewer images in the category
    // (the user will never be allowed to play with fewer than two images in a selected category)
    return 4;
  }

  defaultCategoryIndex() {
    const { categories } = this.props;
    let defaultCategoryIndex = null;

    // Find the user's first category that has at least two images
    forEach(categories, (category, i) => {
      if (category && category.images && category.images.length >= 2) {
        // Store the category's index in the defaultCategoryIndex variable
        defaultCategoryIndex = i;

        // End the loop once the default category's index has been found
        return false;
      }

      return null;
    });

    // Return the default category index
    return defaultCategoryIndex;
  }

  boxInputValidates() {
    const { boxNumberInput, gridIsDirty, submittedBoxNumber } = this.state;
    const primeNumbersBetween4And100 = [
      5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97
    ];

    // The box number input validates if it is between 4 and 100, and...
    const boxInputValidates = (boxNumberInput >= 4 && boxNumberInput <= 100)
      && !includes(primeNumbersBetween4And100, boxNumberInput) // It is not a prime number
      && !/^0/.test(boxNumberInput) // And it does not start with 0
      && !(boxNumberInput === submittedBoxNumber && !gridIsDirty); // And the following is NOT true:
        // The box number input has not been changed and the grid has not been touched
        // (prevents starting a new game when an untouched new game of the type
        // the user has requested is already available)

    // Return whether or not the box input validates
    return boxInputValidates;
  }

  afterMidGameImageLoad(loadedImageSrc) {
    const { bonusSrc } = this;

    // If the loaded image is the bonus image...
    if (loadedImageSrc === bonusSrc) {
      // Set the state to make the bonus image blink gold
      this.setState({ bonusBlinking: true, newImgShown: false });

      // Bonus image stops blinking after 0.6s
      setTimeout(() => {
        this.setState({ bonusBlinking: false, newImgShown: false, waitPeriod: false });
      }, 600);

      // Do not execute the remainder of this function's code
      return;
    }

    // If the loaded image is not the bonus image...
    const {
      clickedImgIndex,
      gameImages,
      lastClickedImgIndex,
      matchArray,
      secondGuess,
      shownImgs,
      submittedBoxNumber
    } = this.state;

    // If it's the user's second guess in a row (excluding bonus)...
    if (secondGuess) {
      // If the loaded image does not match the first guess...
      if (loadedImageSrc !== gameImages[lastClickedImgIndex].image) {
        // Prepare to set the state to hide the last two clicked images (excluding bonus)
        const newShownImgs = shownImgs.slice();
        newShownImgs[clickedImgIndex] = false;
        newShownImgs[lastClickedImgIndex] = false;

        // Hide the last two clicked images (excluding bonus) after 1s,
        // and allow the user to continue the game
        setTimeout(() => {
          this.setState({
            shownImgs: newShownImgs,
            secondGuess: !secondGuess,
            newImgShown: false,
            lastClickedImgIndex: null,
            waitPeriod: false
          });
        }, 1000);
      }

      // If the loaded image matches the first guess...
      else {
        const matchNew = matchArray.slice();
        matchNew[clickedImgIndex] = true;
        matchNew[lastClickedImgIndex] = true;

        // Make the two matching images blink green
        this.setState({ matchArray: matchNew, newImgShown: false });

        // After 0.6s, make the matching images' backgrounds transparent once again,
        // and allow the user to continue the game
        setTimeout(() => {
          this.setState({
            matchArray: Game.falseArray(submittedBoxNumber),
            secondGuess: !secondGuess,
            lastClickedImgIndex: null,
            waitPeriod: false
          });
        }, 600);
      }
    }

    // If it's not the user's second guess in a row, store the clicked image as
    // the last clicked image (excluding bonus), and allow the user to continue the game
    else {
      this.setState({
        lastClickedImgIndex: clickedImgIndex,
        secondGuess: !secondGuess,
        newImgShown: false,
        waitPeriod: false
      });
    }
  }

  showImage(clickedImgIndex, newGameImages) {
    const { updateWinTotal, winTotal } = this.props;
    const {
      boxNumberInput,
      shownImgs,
      submittedBoxNumber,
      windowWidth
    } = this.state;
    const newShownImgs = shownImgs.slice();

    // Prepare to set the state with the shownImgs array reflecting the new image to be shown
    newShownImgs[clickedImgIndex] = true;

    // Prepare to set the state to show the newly clicked image
    let setStateObj = {
      imgIsLoading: false,
      shownImgs: newShownImgs,
      gameImages: newGameImages, // May contain newly created blob urls
      clickedImgIndex,
      boxNumberInput: !boxNumberInput ? submittedBoxNumber : boxNumberInput,
      gridIsDirty: true,
      requestPending: false,
      waitPeriod: true,
      newImgShown: true
    };

    // If the user has won the game, prepare to set the state to reflect that the user has won
    const gameWon = !newShownImgs.includes(false);
    if (gameWon) {
      setStateObj = assign(
        setStateObj,
        {
          win: true,
          requestPending: false,
          waitPeriod: false
        }
      );

      // If the win total is less than the maximum allowable win total
      // for a user, prepare to set the state to reflect that the win total is loading
      if (winTotal < 100000000) {
        setStateObj = assign(setStateObj, { winTotalIsLoading: true });
      }
    }

    // Set the state
    this.setState(
      setStateObj,

      // Then, if the user has won the game...
      () => {
        if (gameWon) {
          const windowScrollY = window.scrollY;
          const trueGameCompTop = this.gameCompContainer.getBoundingClientRect().top
            + windowScrollY - 20;

          // If the navbar is open on a phone, and the user is scrolled below
          // the game container's top, scroll to the game container's top...
          if (windowWidth < 767.5 && trueGameCompTop > 100) {
            if (trueGameCompTop - windowScrollY < 0) {
              window.scrollTo(0, trueGameCompTop);
            }
          }

          // If the user is not on a phone, or the phone navbar is not open,
          // scroll to the top of the page
          else {
            window.scrollTo(0, 0);
          }

          // If the win total is less than the maximum allowable win total
          // for a user, add one to the user's win total
          if (winTotal < 100000000) {
            updateWinTotal(
              winTotal + 1,
              () => this.setState({ winTotalIsLoading: false }),
              () => this.setState({ winTotalIsLoading: false })
            );
          }
        }
      }
    );
  }

  fetchOrShowImage(clickedImgIndex) {
    const { gameImages } = this.state;
    const image = gameImages[clickedImgIndex];
    const imgId = image.id;
    const imgSrc = image.image;
    const newGameImages = gameImages.slice();

    // If the image src begins with https (and not blob),
    // the image has not yet been securely fetched, so...
    if (/^https/.test(imgSrc)) {
      // A request is pending (to fetch the image)
      this.setState({ requestPending: true, imgIsLoading: true, clickedImgIndex });

      const { fetchCategoryImage } = this.props;
      const { categoryIndex } = this.state;

      // Fetch the category's currently selected image
      fetchCategoryImage(imgId, imgSrc, categoryIndex, (blobUrl) => {
        let imgSrcsChanged = 0;

        // Replace the old image src (and its match) with the securely created temporary blob url
        forEach(newGameImages, (newGameImage, i) => {
          if (newGameImage.image === imgSrc) {
            newGameImages[i].image = blobUrl;
            imgSrcsChanged += 1;

            // If the image src and its match have been changed, end the loop
            if (imgSrcsChanged === 2) {
              return false;
            }
          }

          // Loop returns null
          return null;
        });

        // Show the clicked image using the securely created temporary blob url
        this.showImage(clickedImgIndex, newGameImages);
      });
    }

    // If the image src does not begin with https, the game images state already contains
    // the securely created temporary blob url for the clicked image,
    // so show the image using this blob url
    else {
      this.showImage(clickedImgIndex, newGameImages);
    }
  }

  defineGameImages(arr, boxNumber) {
    const allCategoryImagesShuffled = shuffle(arr);
    const gameImagesWithoutDuplicates = allCategoryImagesShuffled.slice(
      0,
      floor(boxNumber / 2)
    );

    // Double the gameImagesWithoutDuplicates array to get an array
    // of all the game's images (unshuffled)
    const unshuffledGameImages = gameImagesWithoutDuplicates
      .concat(gameImagesWithoutDuplicates);

    // If the box number is odd, add the bonus image to the unshuffledGameImages array
    if (boxNumber % 2 !== 0) {
      unshuffledGameImages.push({ image: this.bonusSrc, image_file_name: 'bonus.jpg' });
    }

    // Return a shuffled version of the game's images
    return shuffle(unshuffledGameImages);
  }

  gameImages(boxNumber, categoryIndex, callback) {
    const { state } = this;
    const { categories } = this.props;
    const { gameImages } = state;
    const imgIndexes = [];
    let allGameImages = [];
    let imgIndexesToFetch = null;
    let numberOfImages = 4;

    // If no game images currently exist, define and return all game images
    if (gameImages.length === 0) {
      const catImages = [];

      // Define the selected category's images
      forEach(categories[categoryIndex].images, (image) => {
        if (image) {
          catImages.push(image);
        }
      });

      allGameImages = this.defineGameImages(catImages, boxNumber);

      return allGameImages;
    }

    // If a new category was not selected without having any of the new
    // category's images...
    if (!(categoryIndex !== state.categoryIndex && !categories[categoryIndex].images)) {
      // Define the needed image indexes
      const numbers = [...Array(categories[categoryIndex].images.length).keys()];
      for (let i = 0; i < Math.floor(boxNumber / 2); i += 1) {
        imgIndexes.push(numbers.splice(Math.floor(Math.random() * numbers.length), 1)[0]);
      }

      // Define which image indexes need to be fetched
      imgIndexesToFetch = [];
      forEach(imgIndexes, (imgIndex) => {
        if (!categories[categoryIndex].images[imgIndex]) {
          imgIndexesToFetch.push(imgIndex);
        }
      });

      numberOfImages = imgIndexesToFetch.length;
    }

    // If a new category was selected and the category's images have not been
    // fetched, OR there are any kind of images to fetch...
    if (
      (categoryIndex !== state.categoryIndex && !categories[categoryIndex].images)
      || (imgIndexesToFetch && numberOfImages !== 0)
    ) {
      // Ensure the category validation is not rendered
      this.setState({ categoryValidationRendered: false });

      const { fetchCategory } = this.props;

      // Fetch the category and its required images
      fetchCategory(
        categories[categoryIndex].id,
        imgIndexesToFetch,
        numberOfImages,
        0,

        // Then...
        () => {
          const { categories } = this.props;

          // Define the category's images
          const catImages = [];
          const categoryImages = categories[categoryIndex].images;
          if (imgIndexes && imgIndexes.length > 0) {
            forEach(imgIndexes, (imgIndex) => {
              catImages.push(categoryImages[imgIndex]);
            });
          } else {
            forEach(categoryImages, (img) => {
              if (img) {
                catImages.push(img);
              }
            });
          }

          // Define the box number based on if the category has been changed
          const newBoxNumber = categoryIndex && categoryIndex !== state.categoryIndex
            ? this.defaultBoxNumber(categoryIndex)
            : boxNumber;

          allGameImages = this.defineGameImages(catImages, newBoxNumber);

          // Execute the callback with all the game's images defined
          callback(allGameImages);
        }
      );
    }

    // If a new category was not selected without having any of the new
    // category's images, and there are no images to be fetched
    else {
      const { categories } = this.props;
      const categoryImages = categories[categoryIndex].images;
      const newCatImages = [];

      // Define the new category images
      forEach(imgIndexes, (imgIndex) => {
        newCatImages.push(categoryImages[imgIndex]);
      });

      allGameImages = this.defineGameImages(newCatImages, boxNumber);

      // Execute the callback with all the game's images defined
      callback(allGameImages);
    }

    return null;
  }

  newGameValidates(newBoxNumber, newCategoryIndex) {
    const { categories } = this.props;
    const { categoryIndex } = this.state;

    // If the user does not have enough images in the selected category to
    // form a grid with the requested box number...
    if (categories[newCategoryIndex].images.length < floor(newBoxNumber / 2)) {
      // Set the state to reflect this
      this.setState({
        enoughImages: false,
        wasNewCategorySelected: (categoryIndex || categoryIndex === 0)
          && newCategoryIndex !== categoryIndex,

        // Remove the category validation if it was present on screen
        categoryValidationRendered: false,

        // If the box number button was clicked after box input focus to
        // attempt a new game, this property can now be set to false,
        // since the enough images alert's ok button will now have focus
        mouseDownBoxNumBtnAfterBoxNumInputFocus: false
      });

      // The new game does not validate, so return false
      return false;
    }

    // If the grid size does not validate (there are no rows)...
    if (!this.gridDimensions(newBoxNumber).numRows) {
      // Set the state to reflect that the grid size does not validate
      this.setState({
        gridSizeValidates: false,

        // If the box number button was clicked after box input focus to
        // attempt a new game, this property can now be set to false,
        // since the grid size alert's ok button will now have focus
        mouseDownBoxNumBtnAfterBoxNumInputFocus: false
      });

      // The grid size does not validate, so return false
      return false;
    }

    // If neither of the above cases are true, the new game validates, so return true
    return true;
  }

  newGame(newBoxNumber, newCategoryIndex) {
    // Define the new game's images, then...
    this.gameImages(newBoxNumber, newCategoryIndex, (gameImages) => {
      // If there is no new box number, set it as the default box number
      if (!newBoxNumber) {
        newBoxNumber = this.defaultBoxNumber(newCategoryIndex);
      }
      // If the new game validates (the grid size validates, and the user
      // has enough images in the selected category to fill the requested number of boxes),
      // start a new game with the requested box number and selected category
      if (this.newGameValidates(newBoxNumber, newCategoryIndex)) {
        const { categories } = this.props;
        const { boxNumberInput, categoryIndex, submittedBoxNumber } = this.state;
        const falseArray = Game.falseArray(newBoxNumber);
        const isDifferentBoxNumber = newBoxNumber !== submittedBoxNumber;
        const isDifferentCategory = newCategoryIndex !== categoryIndex;

        // Ensure a placeholder effect in the box number input field if it does not have focus
        const newBoxNumberInput = document.activeElement !== this.boxNumberInput ? '' : boxNumberInput;

        // If the box number has changed, prepare to change the values of
        // the grid dimensions in state
        const {
          boxWidth,
          extendGrid,
          numColumns,
          numRows
        } = isDifferentBoxNumber
          ? this.gridDimensions(newBoxNumber)
          : this.state;

        // Set the new game state
        this.setState(
          {
            boxNumberInput: newBoxNumberInput,
            boxWidth,
            categoryIndex: newCategoryIndex,
            categoryTitle: categories[newCategoryIndex].title,
            categoryValidationRendered: false,
            checkmarkRendered: isDifferentCategory,
            extendGrid,
            gameImages,
            gridIsDirty: false,
            lastClickedImgIndex: null,
            matchArray: falseArray,
            mouseDownBoxNumBtnAfterBoxNumInputFocus: false,
            numColumns,
            numRows,
            resetWinTotalValidationRendered: false,
            secondGuess: false,
            shownImgs: falseArray,
            submittedBoxNumber: newBoxNumber,
            win: false
          },

          // Once the new game state has been set...
          () => {
            const gridContainerRect = this.gridContainer.getBoundingClientRect();
            const windowScrollY = window.scrollY;

            // If the new game's grid extends past the bottom of the window,
            // scroll down to the top of the grid
            if (gridContainerRect.bottom + windowScrollY > window.innerHeight) {
              window.scrollTo(0, gridContainerRect.top + windowScrollY);
            }
          }
        );
      }
    });
  }

  renderGameAlert(alertType, buttonAutoFocus, isModalAriaHidden) {
    const { wasNewCategorySelected } = this.state;

    // Initial variables' values are for the box number alert
    let setStateObj = { enoughImages: true, wasNewCategorySelected: false };
    let screenDepthClassName = 'screen-level-1';
    let alertText = (
      <h3 className="warning-text">
        <em>Whoops!</em>
        &nbsp;&nbsp;You don&apos;t have enough images in
        the selected category yet. Try adding some more to your library!
      </h3>
    );

    // Change variables' values if the screen size alert is to be rendered
    if (alertType === 'screenSizeAlert') {
      setStateObj = { gridSizeValidates: true };
      screenDepthClassName = styles['screen-level-2'];
      alertText = (
        <div>
          <h3 className="warning-text">
            Sorry! Your screen is too small to display that number of boxes.
            Try a different number!
          </h3>
          <h4 className="warning-text">
            <strong>Hint:&nbsp;</strong>
            Try to avoid multiples of large prime numbers. They require long rows and columns!
          </h4>
        </div>
      );
    }

    // Render the alert
    return (
      // Overlay
      <div className="overlay" aria-hidden={isModalAriaHidden}>

        {/* Alert */}
        <div
          className={`
            alert
            alert-danger
            pop-up
            ${screenDepthClassName}
          `}
        >

          {/* Alert Text */}
          <div className="text-center">
            { alertText }
          </div>

          {/* Ok Button Container */}
          <div className="text-center">

            {/* Ok Button */}
            <button
              type="button"
              className="btn btn-lg btn-primary"
              autoFocus={buttonAutoFocus}

              // On clicking the ok button...
              onClick={() => {
                // If a new category was selected and the panel category dropdown button exists,
                // focus back on the panel category dropdown button
                if (wasNewCategorySelected && this.panelDropdownButton) {
                  this.panelDropdownButton.focus();
                }

                // If a new category was not selected, focus back into the box number input field
                else if (!wasNewCategorySelected) {
                  this.boxNumberInput.focus();
                }

                // Set the state to remove the alert from the screen
                this.setState(setStateObj);
              }}

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

  renderGameValidation(validationType, buttonAutoFocus, isModalAriaHidden) {
    const { categories, updateWinTotal } = this.props;
    const { requestedCatIndexBeforeCatValidation } = this.state;

    // Initial variables' values are for the mid-game changing category validation
    let validationText = 'Changing the image category in mid-game will automatically start a new game. Are you sure you want to do this?';
    let yesButtonRefName = 'catValidationYesBtn';
    let onClickYesBtn = () => {
      const newBoxNumber = !categories[requestedCatIndexBeforeCatValidation].images
        ? null
        : this.defaultBoxNumber(requestedCatIndexBeforeCatValidation);

      this.newGame(
        newBoxNumber,
        requestedCatIndexBeforeCatValidation
      );
    };
    let onClickCancelBtn = () => {
      this.setState({ categoryValidationRendered: false });

      if (this.panelDropdownButton) {
        this.panelDropdownButton.focus();
      }
    };

    // Change the variables' values if the reset win total validation is to be rendered
    if (validationType === 'resetTotalValidation') {
      yesButtonRefName = 'resetTotalYesBtn';
      validationText = (
        <span>
          Once you reset your win total, it will be deleted&nbsp;
          <em>permanently</em>
          . Are you sure you want to do this?
        </span>
      );
      onClickYesBtn = () => {
        // Request is pending
        this.setState({ requestPending: true });

        // Update the win total to zero
        updateWinTotal(
          0,

          // If the request fails, the request is no longer pending
          () => this.setState({ requestPending: false }),

          // If the request is successfully submitted, remove the validation from the screen
          () => {
            this.setState({ requestPending: false, resetWinTotalValidationRendered: false });
          }
        );
      };
      onClickCancelBtn = () => {
        this.setState({ resetWinTotalValidationRendered: false });
        this.resetTotalBtn.focus();
      };
    }

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
            {validationText}
          </h3>

          {/* Container for Buttons */}
          <div className="text-center">

            {/* Yes Button */}
            <button
              className="btn btn-lg btn-danger left-side-button"
              type="button"
              autoFocus={buttonAutoFocus}
              onClick={onClickYesBtn}
              ref={(yesBtn) => {
                this[yesButtonRefName] = yesBtn;
              }}
            >

              {/* Static Yes Button Text */}
              Yes

            </button>

            {/* Cancel Button */}
            <button
              className="btn btn-lg btn-primary"
              type="button"
              onClick={onClickCancelBtn}

              // Prevent Validation Tab Escape
              onKeyDown={(e) => preventModalTabEscape(
                e.key,
                () => e.preventDefault(),
                () => this[yesButtonRefName].focus()
              )}

            >

              {/* Static Cancel Button Text */}
              Cancel

            </button>

          </div>
        </div>
      </div>
    );
  }

  renderPageHeading(isAriaHidden) {
    const { win } = this.state;

    // If the user has won the game, render the win-game heading
    if (win) {
      return (
        // Win-game heading
        <h1
          className={`text-center ${styles['win-game-heading']}`}
          aria-hidden={isAriaHidden}
        >
          YOU
          WIN!
        </h1>
      );
    }

    // If the user has not yet won the game, render the typical page heading
    return (
      <h1
        className="text-center"
        aria-hidden={isAriaHidden}
      >
        The Matching Game
      </h1>
    );
  }

  renderTextAboveBoxNumberInput() {
    const { win, windowWidth } = this.state;

    // Return the text above the box number input
    return (
      // Bootstrap Row
      <div className="row">

        {/* Container For Text Above Input */}
        <div className="col-xs-12 col-md-8 col-md-offset-2">

          {/* Text Above Input */}
          {
            // If the user won the game on a phone-size device, render the win text
            // above the box number input
            win && windowWidth < 767.5
              ? (
                // Win Text
                <div>

                  {/* Static Win Text */}
                  <h1
                    className={`text-center ${styles['win-game-heading']}`}
                  >
                    YOU WIN!
                  </h1>

                  {/* User's Current Win Total */}
                  <h4 className={`text-center ${styles['win-total-xs']}`}>

                    {/* Static Win Total Text */}
                    Win Total:&nbsp;

                    {/* Render the win total markup */}
                    { this.renderWinTotalMarkup(16, true) }

                  </h4>

                </div>
              )

              // If the user has not won the game on a phone-size device,
              // render the instructional text for the box number input
              : (
                <div className={`h3 text-center ${styles.roboto}`}>
                    Enter a non-prime number from 4 to 100:
                </div>
              )
          }

        </div>
      </div>
    );
  }

  renderBoxNumberInput() {
    const {
      boxNumberInput,
      boxNumBtnFocused,
      gridIsDirty,
      mouseDownBoxNumBtnAfterBoxNumInputFocus,
      submittedBoxNumber
    } = this.state;

    // Render the box number input field
    return (
      // Box Number Input
      <input
        aria-label="Box Number Input"
        type="number"
        value={boxNumberInput}
        placeholder={submittedBoxNumber}
        className={`form-control text-center ${styles['box-number-input']}`}
        min="4"
        max="100"

        // Render the typed value in the input field
        onChange={(e) => {
          const { value } = e.target;

          this.setState({ boxNumberInput: value === '' ? '' : parseInt(value, 10) });
        }}

        onFocus={(e) => e.target.select()}
        onBlur={() => {
          // Unless the user has focused on or clicked on the box number submit button...
          if (!boxNumBtnFocused && !mouseDownBoxNumBtnAfterBoxNumInputFocus) {
            // If the game has been started, the box number input value
            // should be the submitted box number
            if (gridIsDirty) {
              this.setState({ boxNumberInput: submittedBoxNumber });
            }

            // If the game has not yet been started, the box number input
            // should display a placeholder
            else {
              this.setState({ boxNumberInput: '' });
            }
          }
        }}

        // Prevent tab skipping over an enabled box number submit button due to the onBlur function
        onKeyDown={(e) => {
          if (e.key === 'Tab' && this.boxInputValidates()) {
            // Prevent tab skipping over an enabled box number submit button
            e.preventDefault();

            // Set the state to reflect that the submit button has focus, then focus on it
            this.setState(
              { boxNumBtnFocused: true },
              () => this.boxInputButton.focus()
            );
          }
        }}

        onKeyPress={(e) => this.onKeyPressBoxNumberInput(e)}
        ref={(boxNumberInputRef) => {
          this.boxNumberInput = boxNumberInputRef;
        }}
      />
    );
  }

  renderBoxNumberSubmitButton(btnText, btnColorClassName) {
    const {
      boxNumberInput,
      categoryIndex,
      gridIsDirty,
      submittedBoxNumber,
      windowWidth
    } = this.state;

    // Prepare to render btn-lg size on phones,
    // custom size of box-number-button class on non-phones
    const btnSizeClassName = windowWidth < 767.5 ? 'btn-lg' : '';

    return (
      <button
        className={`
          btn
          ${btnSizeClassName}
          ${btnColorClassName}
          ${styles['box-number-button']}
        `}
        type="button"
        disabled={!this.boxInputValidates()}
        onMouseDown={() => {
          if (document.activeElement === this.boxNumberInput) {
            this.setState({ mouseDownBoxNumBtnAfterBoxNumInputFocus: true });
          }
        }}
        onClick={() => {
          // Begin a new game with the entered box number and currently selected category
          this.newGame(boxNumberInput, categoryIndex);
        }}
        onBlur={() => {
          // If the game has been started, the box number input value
          // should be the submitted box number
          if (gridIsDirty) {
            this.setState({ boxNumberInput: submittedBoxNumber, boxNumBtnFocused: false });
          }

          // If the game has not yet been started, the box number input
          // should display a placeholder
          else {
            this.setState({ boxNumberInput: '', boxNumBtnFocused: false });
          }
        }}
        ref={(boxInputButton) => {
          this.boxInputButton = boxInputButton;
        }}
      >

        {/* Submit Button Text */}
        {btnText}

      </button>
    );
  }

  renderBoxNumberInputAndSubmitButton(boxNumberButtonText, boxNumberButtonClassName) {
    return (
      <div>

        {/* Box Number Input */}
        <div>
          { this.renderBoxNumberInput() }
        </div>

        {/* Box Number Submit Button Container */}
        <div className={styles['box-number-button-container']}>

          {/* Box Number Submit Button */}
          { this.renderBoxNumberSubmitButton(boxNumberButtonText, boxNumberButtonClassName) }

        </div>

      </div>
    );
  }

  renderBoxNumberInputGroup(boxNumberButtonText, boxNumberButtonClassName) {
    return (
      // Bootstrap Row
      <div className="row">

        {/* Input Group */}
        <div
          className={`
            input-group
            input-group-lg
            ${styles['box-number-input-group']}
          `}
        >

          {/* Box Number Input */}
          { this.renderBoxNumberInput() }

          {/* Box Number Submit Button Wrapper */}
          <span className="input-group-btn">

            {/* Box Number Submit Button */}
            { this.renderBoxNumberSubmitButton(boxNumberButtonText, boxNumberButtonClassName) }

          </span>

        </div>
      </div>
    );
  }

  renderCategoryOptions() {
    const { props } = this;
    const { categoryIndex, categoryPageNum } = this.state;
    const categories = [];
    const categoryIndexes = [];

    // Do not include the currently selected category as an option
    const initCats = props.categories ? props.categories.slice() : [];
    forEach(initCats, (cat, i) => {
      if (cat && i === categoryIndex) {
        initCats.splice(i, 1);
        return false;
      }

      return null;
    });

    // Form the categories and categoryIndexes arrays
    if (initCats.length > 0) {
      let lastIndex = (categoryPageNum * 10) - 1;
      let firstIndex = lastIndex - 9;

      // If the user is on the last page, change the firstIndex and lastIndex values
      if (categoryPageNum === ceil(initCats.length / 10)) {
        lastIndex = initCats.length - 1;
        const addend = initCats.length % 10 === 0 ? 10 : initCats.length % 10;
        firstIndex = lastIndex - (addend - 1);
      }

      let addOne = firstIndex >= categoryIndex;

      // Form the categories and categoryIndexes arrays
      for (let i = firstIndex; i <= lastIndex; i += 1) {
        if (i === categoryIndex) {
          addOne = true;
        }

        categories.push(initCats[i]);
        categoryIndexes.push(addOne ? i + 1 : i);
      }
    }

    // If the user has only one category, render text that says there are no
    // other categories to select from
    if (props.categories && props.categories.length === 1) {
      return (
        <li className={styles['no-other-categories-text']}>
          <em>You have no other categories to select from...</em>
        </li>
      );
    }

    // If the user has more than one category, render the user's other category options...

    const { windowWidth } = this.state;
    const lastCategoryDropdownOptionIndex = categoryIndexes[categoryIndexes.length - 1];

    // Category Options Markup
    return map(categories, (category, i) => {
      const loopedCategoryIndex = categoryIndexes[i];
      let categoryDropdownOptionClassName = '';

      // If the user has only two categories (only one other category to choose from),
      // style the dropdown item as the first and last item
      if (categoryIndexes.length === 1) {
        categoryDropdownOptionClassName = 'first-dropdown-item last-dropdown-item';
      }

      // If the user has more than two categories (more than one other category to choose from),
      // designate the special styling for the first and last dropdown items accordingly
      else if (loopedCategoryIndex === categoryIndexes[0]) {
        categoryDropdownOptionClassName = 'first-dropdown-item';
      } else if (
        loopedCategoryIndex === lastCategoryDropdownOptionIndex
        && !(windowWidth > 767.5 && windowWidth < 991.5)
      ) {
        categoryDropdownOptionClassName = 'last-dropdown-item';
      }

      // Render the category as an option
      return (
        // Category List Item
        <li key={loopedCategoryIndex}>

          {/* Category Option */}
          <a
            // Clicking the category option does not change the route
            to="/"

            className={`
              ${styles['category-dropdown-option']}
              ${categoryDropdownOptionClassName}
            `}
            role="button"
            tabIndex="0"
            onClick={() => this.onClickCategoryOption(loopedCategoryIndex)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.onClickCategoryOption(loopedCategoryIndex);
              }
            }}

            // Prevent dropdown tab escape on desktops
            // (non-desktops are governed by header component)
            onKeyDown={(e) => {
              if (
                e.key === 'Tab'
                && windowWidth > 991.5
                && loopedCategoryIndex === lastCategoryDropdownOptionIndex
                && props.categories.length < 12
              ) {
                e.preventDefault();
                this.panelDropdownButton.focus();
              }
            }}
          >

            {/* Category Option Text */}
            {category.title}

          </a>
        </li>
      );
    });
  }

  renderCategoryOptionsPaginationNav(headerCatDropdownBtn) {
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
        className={key !== keys(pageNums)[keys(pageNums).length - 1] ? styles['pagination-btn'] : styles['last-pagination-btn']}
        onClick={() => this.onClickCategoryPaginationButton(pageNums[key])}

        // Prevent dropdown tab escape
        onKeyDown={(e) => {
          if (key === keys(pageNums)[keys(pageNums).length - 1]) {
            // Declare the new focus for if the key down was 'Tab'
            const newFocus = windowWidth < 991.5 ? headerCatDropdownBtn : this.panelDropdownButton;

            // Prevent tab escape from the dropdown
            preventModalTabEscape(
              e.key,
              () => e.preventDefault(),
              () => newFocus.focus()
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

  renderWinTotalMarkup(animationWidth, inlineBlockAnimationDisplay) {
    const { winTotal } = this.props;
    const { winTotalIsLoading } = this.state;

    // Render the loader component if the win total is loading
    if (winTotalIsLoading) {
      return (
        <Loader
          animationWidth={animationWidth}
          inlineBlockDisplay={inlineBlockAnimationDisplay}
          relativePosition
          renderNoLoadingText
        />
      );
    }

    // Render the win total if the win total is less than the maximum
    if (winTotal <= 99999999) {
      return winTotal;
    }

    // Render the max text if the win total is greater than the maximum
    return '99999999+';
  }

  renderCheckmark() {
    return (
      // Checkmark Container
      <div className={`text-center ${styles['checkmark-container']}`}>

        {/* Checkmark */}
        <img
          src={
            document.body.classList.contains('webp')
              ? '../../images/next-gen/checkmark.webp'
              : '../../images/standard/checkmark.png'
          }
          alt="Checkmark"
          className={styles.checkmark}
          onLoad={this.onLoadOrOnErrorCheckmark.bind(this)}
          onError={this.onLoadOrOnErrorCheckmark.bind(this)}
        />

      </div>
    );
  }

  renderPanel() {
    const { categories, winTotal } = this.props;
    const {
      categoryTitle,
      checkmarkRendered,
      panelDropdownMenuMaxHeight,
      panelDropdownOpen,
      win
    } = this.state;

    // Render the panel
    return (
      // Panel
      <div className="panel panel-default col-md-2">

        {/* Panel Body */}
        <div className={`panel-body ${styles.roboto}`}>

          {/* Win Total Static Text */}
          <div className="h3 text-center">
            <strong>Win Total:</strong>
          </div>

          {/* User's Current Win Total */}
          <div
            className={`
              h3
              text-center
              ${styles['win-total']}
              ${winTotal && win ? 'win-total-after-win' : ''}
            `}
          >

            {/* Render the win total markup */}
            { this.renderWinTotalMarkup(26.4) }

          </div>

          {/* Reset Win Total Button */}
          <div className="text-center">
            <button
              className={`
                btn
                btn-md
                btn-danger
                ${styles['reset-total-btn']}
              `}
              type="button"
              disabled={!winTotal}
              onClick={() => this.setState({ resetWinTotalValidationRendered: true })}
              ref={(resetTotalBtn) => {
                this.resetTotalBtn = resetTotalBtn;
              }}
            >

              {/* Reset Win Total Button Static Text */}
              Reset Total

            </button>
          </div>

          {/* Category Dropdown Label */}
          <div className="h3 text-center">
            <strong>Category:</strong>
          </div>

          {/* Category Dropdown */}
          <div
            className={`
              dropdown
              ${panelDropdownOpen ? 'open' : ''}
              ${styles['panel-dropdown']}
            `}
          >

            {/* Category Dropdown Button */}
            <button
              className={`
                btn
                btn-default
                dropdown-toggle
                ${styles['panel-dropdown-button']}
              `}
              type="button"
              ref={(panelDropdownButton) => {
                this.panelDropdownButton = panelDropdownButton;
              }}
              onClick={() => {
                // If panel dropdown was open, scroll to its top
                if (panelDropdownOpen) {
                  this.panelDropdownMenu.scrollTo(0, 0);
                }

                // Set the state to open or close the panel dropdown,
                // then set the state of properties dependent on newly rendered elements' dimensions
                this.setState(
                  { panelDropdownOpen: !panelDropdownOpen },
                  () => this.setNewlyRenderedElementsDimensionalState({})
                );
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();

                  // If panel dropdown was open, scroll to its top
                  if (panelDropdownOpen) {
                    this.panelDropdownMenu.scrollTo(0, 0);
                  }

                  // Set the state to open or close the panel dropdown,
                  // then set the state of properties dependent on newly
                  // rendered elements' dimensions
                  this.setState(
                    { panelDropdownOpen: !panelDropdownOpen },
                    () => this.setNewlyRenderedElementsDimensionalState({})
                  );
                }
              }}
            >

              {/* Currently Selected Category Title */}
              <div className={`inline-block ${styles['panel-btn-category-title']}`}>
                {categoryTitle}
              </div>

              {/* Caret */}
              <div className="inline-block pull-right">
                <span className="caret" />
              </div>

            </button>

            {/* Category Dropdown Menu */}
            <ul
              className={`dropdown-menu ${styles['panel-dropdown-menu']}`}
              style={{ maxHeight: panelDropdownMenuMaxHeight }}
              ref={(panelDropdownMenu) => {
                this.panelDropdownMenu = panelDropdownMenu;
              }}
            >

              {/* Category Options */}
              {this.renderCategoryOptions()}

              {/* Render category options pagination navigation if there are
              more than eleven categories */}
              {
                categories.length > 11
                  ? this.renderCategoryOptionsPaginationNav()
                  : null
              }

            </ul>

          </div>

          {/* If the checkmark is to be rendered, render it, else render nothing */}
          { checkmarkRendered ? this.renderCheckmark() : null }

        </div>
      </div>
    );
  }

  renderRowBoxes(rowNumber) {
    const {
      bonusBlinking,
      boxWidth,
      clickedImgIndex,
      enoughImages,
      gameImages,
      imgIsLoading,
      matchArray,
      newImgShown,
      numColumns,
      reloadImage,
      shownImgs,
      waitPeriod,
      win
    } = this.state;
    const boxStyle = { width: boxWidth, height: boxWidth };
    const firstImgIndex = (rowNumber - 1) * numColumns;
    const imageRow = gameImages.slice(firstImgIndex, firstImgIndex + numColumns);

    // Return the row's boxes markup
    return map(imageRow, (image, loopIndex) => {
      const imgIndex = firstImgIndex + loopIndex;

      // If the box is supposed to contain a revealed image...
      if (shownImgs[imgIndex]) {
        const imageUrl = image.image;
        const imageFileName = image.image_file_name;

        // Extract image alt text from image filename (get rid of filename extension)
        const imageAltText = imageFileName.slice(0, imageFileName.lastIndexOf('.'));

        // Return the image inside a box
        return (
          // Image Box
          <div
            key={imgIndex}
            className={`
              ${styles.box}
              ${win || matchArray[imgIndex] ? styles.match : ''}
              ${bonusBlinking && gameImages[imgIndex].image === this.bonusSrc ? styles['blinking-bonus'] : ''}
            `}
            style={boxStyle}
          >

            {/* Image */}
            <img
              src={imageUrl}
              alt={imageAltText}
              className={styles.image}
              onLoad={() => {
                // Under the appropriate conditions, execute afterMidGameImageLoad
                if (!win && enoughImages && !reloadImage && newImgShown) {
                  this.afterMidGameImageLoad(imageUrl);
                }

                // If an image needs to be reloaded, force it to reload via setState
                else if (reloadImage) {
                  this.setState({ reloadImage: false });
                }
              }}
              onError={() => {
                // Under the appropriate conditions, execute afterMidGameImageLoad
                if (!win && enoughImages && !reloadImage && newImgShown) {
                  this.afterMidGameImageLoad(imageUrl);
                }

                // If an image needs to be reloaded, force it to reload via setState
                else if (reloadImage) {
                  this.setState({ reloadImage: false });
                }
              }}
            />

          </div>
        );
      }

      // If the image is not to be shown, and there is a wait period in effect...
      if (waitPeriod) {
        // Return a non-clickable box
        return (
          <div
            key={imgIndex}
            className={styles.box}
            style={boxStyle}
          />
        );
      }

      // If an image is loading, render the loader component for that image
      if (imgIsLoading && imgIndex === clickedImgIndex) {
        return (
          <div
            key={imgIndex}
            className={styles.box}
            style={boxStyle}
          >
            <Loader renderNoLoadingText animationWidth="80%" />
          </div>
        );
      }

      // If the image is not to be shown, and there is no wait period in effect,
      // return a box that is clickable
      return (
        <div
          key={imgIndex}
          className={styles.box}
          style={boxStyle}
          aria-label={`Row ${rowNumber} Column ${loopIndex + 1}`}
          role="button"
          tabIndex="0"
          onClick={() => this.fetchOrShowImage(imgIndex)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              this.fetchOrShowImage(imgIndex);
            }
          }}
        />
      );
    });
  }

  renderGameGrid() {
    const { numRows } = this.state;
    const rows = [];

    // For each row to be rendered...
    for (let rowNumber = 1; rowNumber <= numRows; rowNumber += 1) {
      // Push a row of game boxes onto the rows array
      rows.push(
        // Game Row
        <div
          key={rowNumber}
          className={`col-md-12 ${styles['game-row']}`}
        >

          {/* Row Boxes */}
          {this.renderRowBoxes(rowNumber)}

        </div>
      );
    }

    // Return the game grid (consists of all of the game grid's rows)
    return rows;
  }

  renderExtendedGameGridContainer() {
    const { boxWidth, numColumns } = this.state;

    // Render the extended game grid container
    return (
      <div
        className={`col-md-10 ${styles['grid-container']}`}
        style={{ position: 'static' }}
        ref={(gridContainer) => {
          this.gridContainer = gridContainer;
        }}
      >

        {/* Floated Right Grid Container */}
        <div className="pull-right" style={{ width: (boxWidth * numColumns) + 2 }}>

          {/* Game Grid */}
          { this.renderGameGrid() }

        </div>

      </div>
    );
  }

  renderGameGridContainer() {
    return (
      // Game Grid Container
      <div
        className={`col-sm-12 col-md-8 col-md-offset-2 ${styles['grid-container']}`}
        ref={(gridContainer) => {
          this.gridContainer = gridContainer;
        }}
      >

        {/* Game Grid */}
        { this.renderGameGrid() }

      </div>
    );
  }

  render() {
    const { serverErrors, winTotal } = this.props;
    const {
      categoryTitle,
      categoryValidationRendered,
      componentIsLoading,
      enoughImages,
      extendGrid,
      gridIsDirty,
      gridSizeValidates,
      requestPending,
      resetWinTotalValidationRendered,
      waitPeriod,
      win,
      windowWidth
    } = this.state;
    const boxNumberButtonClassName = gridIsDirty ? 'btn-primary' : 'btn-success';
    const boxNumberButtonText = gridIsDirty ? 'New Game' : 'Set Box Number';
    const buttonAutoFocus = !document.body.classList.contains('touchscreen');
    const isAriaHidden = !enoughImages
      || !gridSizeValidates
      || categoryValidationRendered
      || resetWinTotalValidationRendered;
    const isModalAriaHidden = serverErrors.length !== 0;
    const nonDesktopGameProps = windowWidth < 991.5
      ? {
        categoryTitle,
        categoryOptions: this.renderCategoryOptions(),
        categoryOptionsPaginationNav:
          (headerCatDropdownBtn) => this.renderCategoryOptionsPaginationNav(headerCatDropdownBtn),
        paginationNavClassNames: [styles['pagination-nav'], styles['pagination-btn'], styles['last-pagination-btn']],
        renderWinTotalMarkup:
          (animationWidth, inlineBlockAnimationDisplay) => this.renderWinTotalMarkup(
            animationWidth, inlineBlockAnimationDisplay
          ),
        resetWinTotal: () => this.setState({ resetWinTotalValidationRendered: true }),
        win,
        winTotal
      }
      : null;
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

          {/* If a request is pending, or a wait period is in effect,
          make the page not clickable */}
          { requestPending || waitPeriod ? <div className="page-not-clickable" /> : null }

          {/* Navbar Header */}
          <Header
            aria-hidden={isAriaHidden}
            nonDesktopGameProps={nonDesktopGameProps}
          />

          {/* Game Page Container */}
          <div
            className={`container ${styles.container}`}
            ref={(gameCompContainer) => {
              this.gameCompContainer = gameCompContainer;
            }}
          >

            {/* If the screen size is too small to support the requested
            number of boxes for the game, render the screen size alert */}
            {
              !gridSizeValidates
                ? this.renderGameAlert('screenSizeAlert', buttonAutoFocus, isModalAriaHidden)
                : null
            }

            {/* If the user does not have enough images in the selected
            category to support the requested number of boxes for the game,
            render the box number alert */}
            {
              !enoughImages
                ? this.renderGameAlert('boxNumberAlert', buttonAutoFocus, isModalAriaHidden)
                : null
            }

            {/* If the user tried to change the category in mid-game,
            render the mid-game change category validation */}
            {
              categoryValidationRendered
                ? this.renderGameValidation('categoryValidation', buttonAutoFocus, isModalAriaHidden)
                : null
            }

            {/* If the user clicked the reset win total button,
            render the reset win total validation */}
            {
              resetWinTotalValidationRendered
                ? this.renderGameValidation('resetTotalValidation', buttonAutoFocus, isModalAriaHidden)
                : null
            }

            {/* Render the page heading if the device is not phone-size */}
            { windowWidth > 767.5 ? this.renderPageHeading() : null }

            {/* Box Number Input Form Group */}
            <div
              className={`form-group ${styles['box-number-input-form-group']}`}
              aria-hidden={isAriaHidden}
            >

              {/* Text Above Box Number Input */}
              { this.renderTextAboveBoxNumberInput() }

              {/* If the device is phone-size, render the box number input
              and submit button separately.
              Else render the box number input and submit button as a group. */}
              {
                windowWidth < 767.5
                  ? this.renderBoxNumberInputAndSubmitButton(
                    boxNumberButtonText, boxNumberButtonClassName
                  )
                  : this.renderBoxNumberInputGroup(boxNumberButtonText, boxNumberButtonClassName)
              }

            </div>

            {/* Game Grid and Panel */}
            <div className="row" aria-hidden={isAriaHidden}>

              {/* If the grid container is to be extended, render the grid in
              an extended container.
              Else render the grid in a normal container. */}
              {
                extendGrid
                  ? this.renderExtendedGameGridContainer()
                  : this.renderGameGridContainer()
              }

              {/* Render the panel if the device is desktop-size */}
              { windowWidth > 991.5 ? this.renderPanel() : null }

            </div>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const {
    categories,
    navigationAlert,
    serverErrors,
    winTotal
  } = state;

  return {
    categories,
    navigationAlert,
    serverErrors,
    winTotal
  };
}

export default connect(
  mapStateToProps,
  {
    fetchCategory,
    fetchCategoryTitles,
    fetchCategoryImage,
    fetchWinTotal,
    updateWinTotal,
    notEnoughImages,
    visitedHome
  }
)(Game);
