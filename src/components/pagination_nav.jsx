import { forEach, last } from 'lodash-es';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import numOfPages from '../utils/numOfPages';
import styles from '../style/pagination_nav.css';

class PaginationNav extends Component {
  displayedPageNumbers(totalNumberOfPages) {
    const { currentPageNumber } = this.props;
    const windowWidth = document.body.classList.contains('safari')
      ? document.getElementsByTagName('html')[0].clientWidth
      : window.innerWidth;

    // Initial variables' values are for non-phone size
    let minPageNumToSlideNavForward = 7;
    let maxNumOfPagesDisplayedAfterActivePageNum = 4;
    let amountOfDisplayedPageNums = totalNumberOfPages < 10 ? totalNumberOfPages : 10;

    // Change variables' values if the device is phone-size
    if (windowWidth < 767.5) {
      minPageNumToSlideNavForward = 4;
      maxNumOfPagesDisplayedAfterActivePageNum = 2;
      amountOfDisplayedPageNums = totalNumberOfPages < 5 ? totalNumberOfPages : 5;
    }

    // The first and last displayed page numbers are declared based on the initial assumption
    // that the current page number is close to the beginning of all the possible page numbers
    let firstDisplayedNumber = 1;
    let lastDisplayedNumber = amountOfDisplayedPageNums;

    // If the current page number is somewhere in the middle of all the possible page numbers,
    // redefine the first and last displayed page numbers
    if (
      currentPageNumber >= minPageNumToSlideNavForward
      && currentPageNumber < totalNumberOfPages - maxNumOfPagesDisplayedAfterActivePageNum
    ) {
      lastDisplayedNumber = currentPageNumber + maxNumOfPagesDisplayedAfterActivePageNum;
      firstDisplayedNumber = lastDisplayedNumber - amountOfDisplayedPageNums + 1;
    }

    // If the current page number is close to the end of all the possible page numbers,
    // the last displayed page number is the last of all the pages
    else if (currentPageNumber >= totalNumberOfPages - maxNumOfPagesDisplayedAfterActivePageNum) {
      lastDisplayedNumber = totalNumberOfPages;

      // Adjust the first displayed number
      firstDisplayedNumber = lastDisplayedNumber - amountOfDisplayedPageNums + 1;
    }

    // Create an array of all the page numbers to be displayed
    const pageNumbers = [];

    // Push the appropriate page numbers into the array
    for (let i = firstDisplayedNumber; i <= lastDisplayedNumber; i += 1) {
      pageNumbers.push(i);
    }

    // Return the page numbers to be displayed
    return pageNumbers;
  }

  renderPageNumberButtons(numberOfPages) {
    const {
      categoryId,
      currentPageNumber,
      onChangePageNumber,
      parentComp
    } = this.props;
    const displayedPageNumbers = this.displayedPageNumbers(numberOfPages);
    const pageNumberButtons = [];

    // For each page number to be displayed, push a clickable link (page number)
    // into the pageNumberButtons array
    forEach(displayedPageNumbers, (displayedPageNumber) => {
      const displayedNumberIsActive = displayedPageNumber === currentPageNumber;
      const isActiveClassName = displayedNumberIsActive ? 'active-page-number' : '';

      pageNumberButtons.push(
        <Link
          key={displayedPageNumber}

          // If the current component is Images, the link is to an images route.
          // Otherwise the link is to a categories route.
          to={
            parentComp === 'Images'
              ? `/images/pg-${displayedPageNumber}`
              : `/categories/${categoryId}/${displayedPageNumber}`
          }

          // If this page number is active, make it not clickable via css
          disabled={displayedNumberIsActive}

          // If this page number is active, make it not focusable via tab
          tabIndex={displayedNumberIsActive ? -1 : 0}

          className={
            displayedPageNumber === last(displayedPageNumbers)
              ? `${styles[isActiveClassName]} ${styles['last-page-number-button']}`
              : `${styles[isActiveClassName]} ${styles['page-number-button']}`
          }

          onClick={(e) => {
            // If the page number is active, keyboard clicking it (from already
            // being focused from the previous click) does nothing
            if (displayedNumberIsActive) {
              e.preventDefault();
            }

            // If the page number is not active, set the parent component's
            // page number state upon clicking
            else {
              onChangePageNumber(displayedPageNumber);
            }
          }}
        >
          {displayedPageNumber}
        </Link>
      );
    });

    // Return the page number buttons
    return pageNumberButtons;
  }

  renderNavigationButton(pageDestination, numberOfPages) {
    const {
      categoryId,
      currentPageNumber,
      onChangePageNumber,
      parentComp
    } = this.props;

    // If a next button is to be rendered, the page number should increase by one
    let pageNumber = currentPageNumber + 1;
    let directionSymbol = '>';
    let className = 'forward-button';

    // If a previous button is to be rendered, the page number should decrease by one
    if (pageDestination === 'prev') {
      pageNumber = currentPageNumber - 1;
      directionSymbol = '<';
      className = 'back-button';
    }

    // If a last button is to be rendered, the page number should become the
    // last possible page number
    if (pageDestination === 'last') {
      pageNumber = numberOfPages;
      directionSymbol = '>>';
      className = 'forward-button';
    }

    // If a first button is to be rendered, the page number should become 1
    if (pageDestination === 'first') {
      pageNumber = 1;
      directionSymbol = '<<';
      className = 'back-button';
    }

    // Render the navigation button
    return (
      <Link

        // If the current component is Images, the link is to an images route.
        // Otherwise the link is to a categories route.
        to={
          parentComp === 'Images'
            ? `/images/pg-${pageNumber}`
            : `/categories/${categoryId}/${pageNumber}`
        }
        className={styles[className]}

        // Set the parent component's page number state upon clicking
        onClick={() => onChangePageNumber(pageNumber)}
      >

        {/* Link Text */}
        { directionSymbol }

      </Link>
    );
  }

  render() {
    const {
      currentPageNumber,
      images,
      navLocation,
      parentComp
    } = this.props;
    const numberOfPages = numOfPages(images.length);

    // Render the pagination navigation
    return (
      <div
        className={`
          ${styles['pagination-nav']}
          ${navLocation === 'bottom' ? styles['bottom-pagination-nav'] : ''}
          ${
            parentComp === 'Categories'
            && navLocation === 'top'
              ? styles['categories-top-pagination-nav']
              : ''
          }
        `}
      >

        {/* If the current page number is greater than 2, render a 'first' page button */}
        { currentPageNumber > 2 ? this.renderNavigationButton('first', numberOfPages) : false }

        {/* If the current page number is not the first page, render a 'previous' button */}
        { currentPageNumber !== 1 ? this.renderNavigationButton('prev', numberOfPages) : false }

        {/* Render the page number buttons */}
        {this.renderPageNumberButtons(numberOfPages)}

        {/* If the current page number is not the last page, render a 'next' button */}
        {
          currentPageNumber !== numberOfPages
            ? this.renderNavigationButton('next', numberOfPages)
            : false
        }

        {/* If the current page number is more than one away from the last page,
        render a 'last' button */}
        {
          numberOfPages - currentPageNumber > 1
            ? this.renderNavigationButton('last', numberOfPages)
            : false
        }
      </div>
    );
  }
}

export default PaginationNav;
