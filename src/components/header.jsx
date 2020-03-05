import {
  clone,
  forEach,
  intersection,
  isEmpty,
  keys
} from 'lodash-es';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { manageKeyboardAccessibility, preventModalTabEscape } from '../utils';
import NavItem from './nav_item';
import styles from '../style/header.css';

class Header extends Component {
  constructor(props) {
    super(props);

    this.state = {
      categoryDropdownMaxHeight: null,
      categoryDropdownOpen: false,
      collapsibleNavbarIsOpen: false,
      manageDropdownOpen: false,
      navbarIsAnimating: false,
      sayingGoodbyeDropdownOpen: false,
      windowWidth: document.body.classList.contains('safari')
        ? document.getElementsByTagName('html')[0].clientWidth
        : window.innerWidth
    };

    const functionsToBeBound = [
      'closeOpenNonPhoneDropdownsOnClickOutside',
      'updateDimensions'
    ];

    // Bind this to all necessary functions
    forEach(functionsToBeBound, (functionToBeBound) => {
      this[functionToBeBound] = this[functionToBeBound].bind(this);
    });

    // Add event listeners
    document.addEventListener('click', this.closeOpenNonPhoneDropdownsOnClickOutside);
    window.addEventListener('resize', this.updateDimensions);
    window.addEventListener(
      'keydown',
      (e) => {
        const { navbarIsAnimating } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          navbarIsAnimating
        );
      }
    );
  }

  componentDidMount() {
    // Set the state of properties dependent on newly rendered elements' dimensions
    this.setNewlyRenderedElementsDimensionalState({});
  }

  componentWillUnmount() {
    // Remove event listeners
    document.removeEventListener('click', this.closeOpenNonPhoneDropdownsOnClickOutside);
    window.removeEventListener('resize', this.updateDimensions);
    window.removeEventListener(
      'keydown',
      (e) => {
        const { navbarIsAnimating } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          navbarIsAnimating
        );
      }
    );
  }

  onClickCategoryDropdownButton() {
    const { categoryDropdownOpen } = this.state;

    // Scroll to the top of the category dropdown menu before closing it
    if (categoryDropdownOpen) {
      this.categoryDropdownMenu.scrollTo(0, 0);
    }

    // Open the category dropdown if it's closed, and close it if it's open
    // (as well as close any other open dropdowns)
    this.setState({
      categoryDropdownOpen: !categoryDropdownOpen,
      manageDropdownOpen: false,
      sayingGoodbyeDropdownOpen: false
    },

    // Then set the state of properties dependent on newly rendered elements' dimensions
    () => this.setNewlyRenderedElementsDimensionalState({}));
  }

  onClickManageDropdownButton() {
    const { categoryDropdownOpen, manageDropdownOpen } = this.state;

    // Scroll to the top of the category dropdown menu before closing it
    if (categoryDropdownOpen) {
      this.categoryDropdownMenu.scrollTo(0, 0);
    }

    // Open the manage dropdown if it's closed, and close it if it's open
    // (as well as close any other open dropdowns)
    this.setState({
      manageDropdownOpen: !manageDropdownOpen,
      categoryDropdownOpen: false,
      sayingGoodbyeDropdownOpen: false
    });
  }

  onClickSayingGoodbyeDropdownButton() {
    const { categoryDropdownOpen, sayingGoodbyeDropdownOpen, windowWidth } = this.state;

    // Scroll to the top of the category dropdown menu before closing it
    if (categoryDropdownOpen) {
      this.categoryDropdownMenu.scrollTo(0, 0);
    }

    // If the user is on a phone-size device on the game page,
    // and the saying goodbye dropdown was closed before it was clicked...
    if (windowWidth < 767.5 && window.location.pathname === '/game' && !sayingGoodbyeDropdownOpen) {
      const { manageDropdownOpen } = this.state;
      const windowHeight = window.innerHeight;

      // Declare what the bottom position of the saying goodbye dropdown will be when it opens,
      // if all dropdowns are closed initially (86 is the static height
      // of the saying goodbye dropdown menu)
      let sayingGoodbyeDropdownBottom = this.sayingGoodbyeDropdownButton
        .getBoundingClientRect().bottom
        + 86;

      // If the category dropdown was open before the click, adjust what the
      // saying goodbye dropdown bottom value will be when it opens and the category dropdown closes
      if (categoryDropdownOpen) {
        sayingGoodbyeDropdownBottom -= this.categoryDropdownMenu.getBoundingClientRect().height;
      }

      // If the manage dropdown was open before the click, adjust what the
      // saying goodbye dropdown bottom value will be when it opens and the manage dropdown closes
      else if (manageDropdownOpen) {
        // 86 is the static height of the manage dropdown
        sayingGoodbyeDropdownBottom -= 86;
      }

      // If the saying goodbye dropdown will go past the bottom of the window upon opening,
      // scroll down so the whole dropdown will be visible on screen
      if (sayingGoodbyeDropdownBottom > windowHeight) {
        window.scrollTo(
          0,
          sayingGoodbyeDropdownBottom - windowHeight + window.scrollY
        );
      }
    }

    // Set the state to close the saying goodbye dropdown if it's open,
    // and to open it if it's closed (as well as close any other open dropdowns)
    this.setState({
      sayingGoodbyeDropdownOpen: !sayingGoodbyeDropdownOpen,
      categoryDropdownOpen: false,
      manageDropdownOpen: false
    });
  }

  onMouseOverDropdownButton(mousedOverDropdownStateKey) {
    const { state } = this;
    const { categoryDropdownOpen, windowWidth } = state;

    // If the device is a non-phone non-touchscreen device...
    if (windowWidth > 767.5 && !document.body.classList.contains('touchscreen')) {
      const setStateObj = {};

      // Initial value for the non-moused-over state keys array includes all dropdowns
      const nonMousedOverDropdownStateKeys = [
        'categoryDropdownOpen',
        'manageDropdownOpen',
        'sayingGoodbyeDropdownOpen'
      ];

      // Remove the moused over state key from the array of non-moused-over dropdown state keys
      nonMousedOverDropdownStateKeys.splice(
        nonMousedOverDropdownStateKeys.indexOf(mousedOverDropdownStateKey),
        1
      );

      // If another dropdown was open besides the one that was moused over...
      if (state[nonMousedOverDropdownStateKeys[0]] || state[nonMousedOverDropdownStateKeys[1]]) {
        // Prepare to the set the state of the moused over dropdown to open it
        setStateObj[mousedOverDropdownStateKey] = true;

        // Prepare to the set the state of the non-moused-over dropdowns to ensure they close
        forEach(nonMousedOverDropdownStateKeys, (dropdownStateKey) => {
          setStateObj[dropdownStateKey] = false;
        });

        if (categoryDropdownOpen) {
          this.categoryDropdownMenu.scrollTo(0, 0);
        }

        // Set the state to open the moused over dropdown and close the others
        this.setState(
          setStateObj,

          // Then set the state of properties dependent on newly
          // rendered elements' dimensions
          () => this.setNewlyRenderedElementsDimensionalState({})
        );
      }
    }
  }

  setNewlyRenderedElementsDimensionalState(initialSetStateObj) {
    const { categoryDropdownOpen } = this.state;
    const { categoryDropdownMenu } = this;
    const setStateObj = clone(initialSetStateObj);
    let newStateShouldBeSet = !isEmpty(initialSetStateObj);

    // If the category dropdown is open...
    if (categoryDropdownOpen) {
      const { categoryDropdownMaxHeight, windowWidth } = this.state;

      // On a tablet, the category dropdown's height should not be
      // greater than 3/4 of the window's height
      const newCategoryDropdownMaxHeight = windowWidth > 767.5 && windowWidth < 991.5
        ? (window.innerHeight - categoryDropdownMenu.getBoundingClientRect().top) * 0.75

        // On a phone, the category dropdown's max height should be a static 245px
        : 245;

      // If the category dropdown's max height has changed, prepare to set
      // the state with the new max height value
      if (categoryDropdownMaxHeight !== newCategoryDropdownMaxHeight) {
        setStateObj.categoryDropdownMaxHeight = newCategoryDropdownMaxHeight;
        newStateShouldBeSet = true;
      }
    }

    // If a new state should be set, set the state
    if (newStateShouldBeSet) {
      this.setState(setStateObj);
    }
  }

  openOrCloseCollapsibleNavbar(animationDuration) {
    const { categoryDropdownOpen, collapsibleNavbarIsOpen } = this.state;

    // Scroll to the top of the category dropdown menu before closing it
    if (categoryDropdownOpen) {
      this.categoryDropdownMenu.scrollTo(0, 0);
    }

    // Begin the animation to open the navbar if it was closed, or close the navbar if it was open,
    // ensuring all of the dropdowns inside it are closed as well
    this.setState({
      collapsibleNavbarIsOpen: !collapsibleNavbarIsOpen,
      navbarIsAnimating: true,
      categoryDropdownOpen: false,
      manageDropdownOpen: false,
      sayingGoodbyeDropdownOpen: false
    });

    // Set the state to reflect the end of the navbar animation after the navbar is done animating
    setTimeout(() => {
      this.setState({ navbarIsAnimating: false });
    }, animationDuration);
  }

  closeOpenNonPhoneDropdownsOnClickOutside(clickEvent) {
    const { state } = this;
    const { nonDesktopGameProps } = this.props;
    const { windowWidth } = state;
    const { classList } = clickEvent.target;

    // Define paginationNavClassNames
    let paginationNavClassNames = [];
    if (nonDesktopGameProps) {
      ({ paginationNavClassNames } = nonDesktopGameProps);
    }

    // If the device is not phone-size...
    if (windowWidth > 767.5) {
      const setStateObject = {};
      const dropdownButtons = [
        'manageDropdownButton',
        'sayingGoodbyeDropdownButton',
        'categoryDropdownButton'
      ];
      const openDropdownStateKeys = [
        'manageDropdownOpen',
        'sayingGoodbyeDropdownOpen',
        'categoryDropdownOpen'
      ];

      // Loop through each of the dropdown buttons...
      forEach(dropdownButtons, (dropdownButton, i) => {
        const paginationNavWasNotClicked = !(
          dropdownButton === 'categoryDropdownButton'
          && intersection(classList, paginationNavClassNames).length > 0
        );

        // If the dropdown button is of an open dropdown, and the click
        // occurred outside the open dropdown's button and the dropdown's pagination nav...
        if (
          state[openDropdownStateKeys[i]]
          && !this[dropdownButton].contains(clickEvent.target)
          && paginationNavWasNotClicked
        ) {
          // Scroll to the top of the category dropdown menu before closing it
          if (openDropdownStateKeys[i] === 'categoryDropdownOpen') {
            this.categoryDropdownMenu.scrollTo(0, 0);
          }

          // Close the open dropdown
          setStateObject[openDropdownStateKeys[i]] = false;
          this.setState(setStateObject);

          // End the loop
          return false;
        }

        return null;
      });
    }
  }

  preventNavAwayIfUnsavedCatChanges(clickEvent) {
    const { renderUnsavedCatChangesAlert, unsavedCatChanges } = this.props;

    // If unsaved cat changes are present, prevent the default from the click event,
    // and render the unsaved cat changes alert
    if (unsavedCatChanges) {
      clickEvent.preventDefault();
      renderUnsavedCatChangesAlert();
    }
  }

  updateDimensions() {
    // Set the state of the window width, as well as the state of properties
    // dependent on newly rendered elements' dimensions
    this.setNewlyRenderedElementsDimensionalState({
      windowWidth: document.body.classList.contains('safari')
        ? document.getElementsByTagName('html')[0].clientWidth
        : window.innerWidth
    });
  }

  renderHorizontalDividerOnPhone() {
    const { windowWidth } = this.state;

    // Render horizontal divider on phone-size devices
    if (windowWidth < 767.5) {
      return (
        // Horizontal Divider
        <li role="separator">
          <hr className={styles['xs-hr']} />
        </li>
      );
    }

    // Render nothing on non-phone-size devices
    return null;
  }

  renderManageTab(btnTabIndex) {
    const { categories, isCatchAllPage } = this.props;
    const { manageDropdownOpen } = this.state;
    const { pathname } = window.location;
    const firstCatId = parseInt(keys(categories)[0], 10);
    const categoriesPath = firstCatId ? `/categories/${firstCatId}/1` : '/categories';

    // If the current route is a catch-all route or a game page route,
    // render the manage dropdown tab
    if (isCatchAllPage || /^\/game.*$/.test(pathname)) {
      return (
        // Manage Dropdown
        <li className={`dropdown ${manageDropdownOpen ? 'open' : ''}`}>

          {/* Manage Dropdown Button */}
          <a
            // Clicking the dropdown button does not change the route
            to="/"

            role="button"
            tabIndex={btnTabIndex}
            className={`text-center ${styles['header-button']}`}
            onClick={() => {
              this.onClickManageDropdownButton();

              // Blur on click for better appearance
              this.manageDropdownButton.blur();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.onClickManageDropdownButton();
              }
            }}
            onMouseOver={() => this.onMouseOverDropdownButton('manageDropdownOpen')}
            onFocus={() => this.onMouseOverDropdownButton('manageDropdownOpen')}
            ref={(manageDropdownButton) => {
              this.manageDropdownButton = manageDropdownButton;
            }}
          >

            {/* Manage Dropdown Button Text */}
            Manage

            {/* Caret (Separate Line) */}
            <div className="text-center">
              <span className="caret" />
            </div>

          </a>

          {/* Manage Dropdown Menu */}
          <ul className="dropdown-menu">

            {/* Link to Images Page */}
            <NavItem
              to="/images"
              className="first-dropdown-item"
            >
              Images
            </NavItem>

            {/* Link to Categories Page */}
            <NavItem
              to={categoriesPath}
              className="last-dropdown-item"

              // Prevent Dropdown Tab Escape
              onKeyDown={(e) => preventModalTabEscape(
                e.key,
                () => e.preventDefault(),
                () => this.manageDropdownButton.focus()
              )}
            >
              Categories
            </NavItem>
          </ul>
        </li>
      );
    }

    // If the current route is a categories or images route...
    const isImagesPage = /^\/images.*$/.test(pathname);

    // Render a button linking to the other of those routes the user is not
    // currently on (either categories or images)
    return (
      // Link
      <NavItem
        to={isImagesPage ? categoriesPath : '/images'}
        tabIndex={btnTabIndex}
        className={`text-center ${styles['header-button']}`}
        onClick={(e) => this.preventNavAwayIfUnsavedCatChanges(e)}
      >

        {/* Manage Text */}
        <div className={styles['manage-text']}>
          Manage
        </div>

        {/* Other Manage String Text */}
        <div className={styles['other-manage-string-text']}>
          {isImagesPage ? 'Categories' : 'Images'}
        </div>

      </NavItem>
    );
  }

  renderTypicalLeftSideHeaderBody(btnTabIndex) {
    return (
      // Typical Left-Side Header Body
      <ul className="nav navbar-nav">

        {/* Link to Game Page */}
        <NavItem
          to="/game"
          tabIndex={btnTabIndex}
          className={`text-center ${styles['header-button']}`}
          onClick={(e) => this.preventNavAwayIfUnsavedCatChanges(e)}
        >

          {/* Static Game Page Link Text */}
          <div className={styles['home-text']}>Home</div>

          {/* Home Icon */}
          <span className={styles['icon-home']} />

        </NavItem>
      </ul>
    );
  }

  renderNonDesktopGameLeftSideHeaderBody(nonDesktopGameProps, btnTabIndex) {
    const { categories } = this.props;
    const { categoryDropdownMaxHeight, categoryDropdownOpen } = this.state;
    const {
      categoryOptions,
      categoryOptionsPaginationNav,
      categoryTitle,
      renderWinTotalMarkup,
      resetWinTotal,
      win,
      winTotal
    } = nonDesktopGameProps;

    // Render the non-desktop game-page left-side header body
    return (
      // Left-Side Header Body
      <ul className="nav navbar-nav">

        {/* Reset Win Total List Item */}
        <li>

          {/* Reset Win Total Button */}
          <a
            // Clicking button does not change route
            to="/"

            role="button"
            tabIndex={btnTabIndex}
            className={`text-center ${styles['header-button']}`}

            // On click, reset win total if one exists, otherwise do nothing
            onClick={winTotal ? resetWinTotal : () => false}

            // On keyboard click, reset win total if one exists
            onKeyPress={(e) => {
              if (e.key === 'Enter' && winTotal) {
                resetWinTotal();
              }
            }}
          >

            {/* Static Button Text */}
            Reset Win Total

            {/* Win Total Container */}
            <div className={`text-center ${styles['win-total-container']}`}>

              {/* Left Parenthesis */}
              <span>&#40;</span>

              {/* User's Current Win Total */}
              <span className={winTotal && win ? 'win-total-after-win' : ''}>

                {/* Render the win total markup */}
                { renderWinTotalMarkup(12, true) }

              </span>

              {/* Right Parenthesis */}
              <span>&#41;</span>

            </div>

          </a>
        </li>

        {/* Render a horizontal divider on phone-size devices */}
        { this.renderHorizontalDividerOnPhone() }

        {/* Category Dropdown */}
        <li className={`dropdown ${categoryDropdownOpen ? 'open' : ''}`}>

          {/* Category Dropdown Button */}
          <a
            // Clicking the dropdown button does not change the route
            to="/"

            role="button"
            tabIndex={btnTabIndex}
            className={`text-center ${styles['header-button']}`}
            onClick={() => {
              this.onClickCategoryDropdownButton();

              // Blur on click for better appearance
              this.categoryDropdownButton.blur();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.onClickCategoryDropdownButton();
              }
            }}
            onMouseOver={() => this.onMouseOverDropdownButton('categoryDropdownOpen')}
            onFocus={() => this.onMouseOverDropdownButton('categoryDropdownOpen')}
            ref={(categoryDropdownButton) => {
              this.categoryDropdownButton = categoryDropdownButton;
            }}
          >

            {/* Static Category Dropdown Button Text */}
            <div>Category</div>

            {/* Currently Selected Category Text Container */}
            <div className={`text-center ${styles['current-category-title-container']}`}>

              {/* Left Parenthesis */}
              <span className={styles['current-category-title-parenthesis']}>
                &#40;
              </span>

              {/* Current Category Title Text */}
              <span className={`text-with-max-width ${styles['current-category-title']}`}>
                {categoryTitle}
              </span>

              {/* Right Parenthesis */}
              <span className={styles['current-category-title-parenthesis']}>
                &#41;
              </span>

            </div>

            {/* Caret (Separate Line) */}
            <div className="text-center">
              <span className="caret" />
            </div>

          </a>

          {/* Category Dropdown Menu */}
          <ul
            className={`dropdown-menu ${styles['category-dropdown-menu']}`}
            style={{ maxHeight: categoryDropdownMaxHeight }}

            // Prevent Dropdown Tab Escape
            onKeyDown={(e) => {
              // If there is no pagination nav, prevent tab escape when on the last dropdown item
              if (
                e.key === 'Tab'
                && categories.length < 12
                && document.activeElement.classList.contains('last-dropdown-item')
              ) {
                e.preventDefault();
                this.categoryDropdownButton.focus();
              }
            }}

            ref={(categoryDropdownMenu) => {
              this.categoryDropdownMenu = categoryDropdownMenu;
            }}
          >

            {/* Render all non-selected category options */}
            {categoryOptions}

            {/* Render category options pagination navigation if there are
              more than eleven categories */}
            {
              categories.length > 11
                ? categoryOptionsPaginationNav(this.categoryDropdownButton)
                : null
            }

          </ul>

        </li>
      </ul>
    );
  }

  renderRightSideHeaderBody(btnTabIndex) {
    const { sayingGoodbyeDropdownOpen } = this.state;

    // Render Right-Side Header Body
    return (
      // Right-Side Header Body
      <ul className="nav navbar-nav navbar-right">

        {/* Manage Tab */}
        { this.renderManageTab(btnTabIndex) }

        {/* Render a horizontal divider on phone-size devices */}
        { this.renderHorizontalDividerOnPhone() }

        {/* Saying Goodbye Dropdown */}
        <li className={`dropdown ${sayingGoodbyeDropdownOpen ? 'open' : ''}`}>

          {/* Saying Goodbye Dropdown Button */}
          <a
            // Clicking the dropdown button does not change the route
            to="/"

            role="button"
            tabIndex={btnTabIndex}
            className={`${styles['header-button']} ${styles['saying-goodbye-button']}`}
            ref={(sayingGoodbyeDropdownButton) => {
              this.sayingGoodbyeDropdownButton = sayingGoodbyeDropdownButton;
            }}
            onClick={() => {
              this.onClickSayingGoodbyeDropdownButton();

              // Blur on click for better appearance
              this.sayingGoodbyeDropdownButton.blur();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.onClickSayingGoodbyeDropdownButton();
              }
            }}
            onMouseOver={() => this.onMouseOverDropdownButton('sayingGoodbyeDropdownOpen')}
            onFocus={() => this.onMouseOverDropdownButton('sayingGoodbyeDropdownOpen')}
          >

            {/* Saying Goodbye Dropdown Button Static Text */}
            <div className="text-center">
              <div>Saying</div>
              <div>Goodbye?</div>
            </div>

            {/* Caret (Separate Line) */}
            <div className="text-center">
              <span className="caret" />
            </div>

          </a>

          {/* Saying Goodbye Dropdown Menu */}
          <ul className="dropdown-menu">

            {/* Link to Signout Page */}
            <NavItem
              to="/signout"
              className="first-dropdown-item"
              onClick={(e) => this.preventNavAwayIfUnsavedCatChanges(e)}
            >
              Logout
            </NavItem>

            {/* Link to Delete Account Page */}
            <NavItem
              to="/delete-account"
              className="last-dropdown-item"
              onClick={(e) => this.preventNavAwayIfUnsavedCatChanges(e)}

              // Prevent Dropdown Tab Escape
              onKeyDown={(e) => preventModalTabEscape(
                e.key,
                () => e.preventDefault(),
                () => this.sayingGoodbyeDropdownButton.focus()
              )}
            >
              Delete Account
            </NavItem>

          </ul>
        </li>
      </ul>
    );
  }

  render() {
    const { nonDesktopGameProps } = this.props;
    const {
      collapsibleNavbarIsOpen,
      navbarIsAnimating,
      windowWidth
    } = this.state;

    // Header buttons should not be tabbable when the collapsible navbar
    // is closed on phone-size devices
    const btnTabIndex = !collapsibleNavbarIsOpen && windowWidth < 767.5 ? -1 : 0;

    // Initial variables' values are for when the collapsible navbar is closed or closing,
    // and the user is on a typically rendered header route
    let collapsibleNavbarMaxHeight = 0;
    let collapsibleNavbarTransition = `
      max-height 0.65s ease-out,
      border-color 0.9s ease-out,
      border-width 0.9s ease-out
    `;
    let navbarAnimationDuration = 650;

    // If the user is on the game page on a non-desktop device, change the variables' values
    if (nonDesktopGameProps) {
      collapsibleNavbarTransition = `
        max-height 0.75s ease-out,
        border-color 1.25s ease-out,
        border-width 1.25s ease-out
      `;
      navbarAnimationDuration = 750;
    }

    // If the collapsible navbar is open or opening, change the variables' values
    if (collapsibleNavbarIsOpen) {
      // If the user is on a typically rendered header route...
      collapsibleNavbarMaxHeight = 425;
      collapsibleNavbarTransition = 'max-height 0.65s ease-in';

      // If the user is on the game page on a non-desktop device...
      if (nonDesktopGameProps) {
        collapsibleNavbarMaxHeight = 710;
        collapsibleNavbarTransition = 'max-height 0.75s ease-in';
      }
    }

    // Render the Header Component
    return (
      <nav className="navbar navbar-default">

        {/* If the navbar is animating, make the page not clickable */}
        { navbarIsAnimating ? <div className="page-not-clickable" /> : null }

        {/* Container Fluid */}
        <div className="container-fluid">

          {/* Collapse Button and Header Brand */}
          <div className="navbar-header">

            {/* Collapse Button */}
            <button
              type="button"
              className="navbar-toggle"
              onClick={() => this.openOrCloseCollapsibleNavbar(navbarAnimationDuration)}
            >

              {/* Screen Reader Identifier */}
              <span className="sr-only">Toggle navigation</span>

              {/* Icon Bars */}
              <span className="icon-bar" />
              <span className="icon-bar" />
              <span className="icon-bar" />

            </button>

            {/* Header Brand (Link to Game Page) */}
            <Link
              to="/game"
              className="navbar-brand"
              onClick={(e) => this.preventNavAwayIfUnsavedCatChanges(e)}
            >
              The Matching Game
            </Link>

          </div>

          {/* Header Body Container */}
          <div
            className={`
              collapse
              navbar-collapse
              ${collapsibleNavbarIsOpen ? 'in' : styles.out}
            `}
            style={{
              maxHeight: collapsibleNavbarMaxHeight,
              transition: collapsibleNavbarTransition
            }}
          >

            {/* If the user is on the game page and on a non-desktop device,
                render a special left-side header body.
                Else, render the typical left-side header body. */}
            {
              nonDesktopGameProps
                ? this.renderNonDesktopGameLeftSideHeaderBody(nonDesktopGameProps, btnTabIndex)
                : this.renderTypicalLeftSideHeaderBody(btnTabIndex)
            }

            {/* Render a horizontal divider on phone-size devices */}
            { windowWidth < 767.5 ? <hr className={styles['xs-hr']} /> : null }

            {/* Right-Side Header Body */}
            { this.renderRightSideHeaderBody(btnTabIndex) }

          </div>

        </div>
      </nav>
    );
  }
}

function mapStateToProps(state) {
  return { categories: state.categories };
}

export default connect(mapStateToProps)(Header);
