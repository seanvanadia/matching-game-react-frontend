import { last, map } from 'lodash-es';
import React, { Component } from 'react';
import { connect } from 'react-redux';

import { removeServerErrors } from '../actions';
import styles from '../style/server_errors_popup.css';

class ServerErrorsPopup extends Component {
  componentWillUnmount() {
    // Remove server errors from application state when the user navigates away from the current url
    if (!this.okBtnClicked) {
      const { removeServerErrors } = this.props;

      removeServerErrors();
    }
  }

  renderOkButton() {
    const { prevFocus, removeServerErrors } = this.props;

    // Return Ok Button Markup
    return (
      <button
        type="button"
        className={`btn btn-lg btn-primary ${styles['ok-button']}`}

        // Autofocus if the device is not a touchscreen
        autoFocus={!document.body.classList.contains('touchscreen')}

        // Keep the server errors popup scrolled to the top when it is first
        // rendered, regardless of autofocus
        onFocus={(e) => e.target.parentNode.parentNode.scrollTo(0, 0)}

        // Remove the server errors from the application state upon clicking
        // the Ok Button, and focus on the previously focused element
        onClick={() => {
          removeServerErrors();
          prevFocus.focus();
          this.okBtnClicked = true;
        }}

        // Do not allow tabbing out of the server errors popup
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
          }
        }}
      >
        Ok
      </button>
    );
  }

  renderServerErrors() {
    const { serverErrors } = this.props;

    // Return the collection of server error elements
    return map(serverErrors, (error, i) => {
      const errorText = error.text ? error.text : error;

      // For each of the server errors, render an error div
      return (
        <div key={i} className="text-center">

          {/* Error Display */}
          <h3 className="warning-text">

            {/* Error Text (if there are multiple errors, number them) */}
            {
              serverErrors.length > 1
                ? `${(i + 1).toString()}) ${errorText}`
                : errorText
            }

            {/* If the error comes with a code, render the Error Code Text
            (code number and meaning) */}
            {
              error.codeText
                ? (
                  <em className={styles['error-code-text']}>
                    &nbsp;&#40;
                    {error.codeText}
                    &#41;
                  </em>
                )
                : null
            }
          </h3>
        </div>
      );
    });
  }

  render() {
    const { invisibleBackground, serverErrors } = this.props;
    const { pathname } = window.location;

    // Initial variables' values are for the case of only one server error
    // occurring, and it not occurring during a get request
    let serverErrorsHeading = 'Server Error!';
    let getRequestError = false;

    // If the last element of the server errors array is a boolean,
    // that boolean has been added to the array during error
    // handling in the actions file to indicate whether or not the error
    // occurred during a get request. Update the getRequestError variable accordingly.
    if (typeof (last(serverErrors)) === 'boolean') {
      getRequestError = serverErrors.pop();
    }

    // If there are multiple server errors, make the errors heading plural
    if (serverErrors.length > 1) {
      serverErrorsHeading = 'Server Errors!';
    }

    // If a server error occurs while the user is attempting to sign out, update the heading
    // variable to indicate that the user may not be logged out
    else if (pathname === '/signout') {
      serverErrorsHeading = 'Error! You may not be logged out!';
    }

    // If a server error occurs on the delete account page, update the heading
    // variable to indicate that the user may not have successfully deleted their account
    else if (pathname === '/delete-account') {
      serverErrorsHeading = 'Error! Your account may not have been deleted!';
    }

    // Render the server errors popup markup
    return (
      <div className={`overlay ${styles['popup-overlay']}`}>

        {/* Popup */}
        <div className={`alert alert-danger pop-up ${styles['errors-popup']}`}>

          {/* Heading */}
          <h2 className={`text-center ${styles['errors-heading']}`}>
            {serverErrorsHeading}
          </h2>

          {/* All Server Errors Text */}
          <div className={styles['error-text']}>
            { this.renderServerErrors() }
          </div>

          {/* Render the Ok Button, unless an invisible background is to be rendered */}
          {
            !invisibleBackground
              ? (
                <div className="text-center">

                  {/* If the server error occurred while the user was attempting to
                  signout, or the server error occurred during a get request (i.e.
                  the user has gone to a new page and the information could not be
                  retrieved), make the Ok Button redirect to the catch-all page.
                  Otherwise, simply render the typical Ok Button. */}
                  {
                    pathname === '/signout' || getRequestError
                      ? (
                        <a href="/not-found">
                          {this.renderOkButton()}
                        </a>
                      )
                      : this.renderOkButton()
                  }
                </div>
              )
              : null
          }
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { serverErrors: state.serverErrors };
}

export default connect(mapStateToProps, { removeServerErrors })(ServerErrorsPopup);
