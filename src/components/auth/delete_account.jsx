import { forEach, map } from 'lodash-es';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { deleteUser } from '../../actions';
import { manageKeyboardAccessibility, serverErrorsInvisibleBackground } from '../../utils';

import Goodbye from './goodbye';
import ServerErrorsPopup from '../server_errors_popup';
import styles from '../../style/delete_account.css';

class DeleteAccount extends Component {
  constructor(props) {
    super(props);

    this.state = {
      accountDeleted: false,
      bottomDivHeight: null,
      requestPending: false,
      warningTextHeight: null,
      windowWidth: document.body.classList.contains('safari')
        ? document.getElementsByTagName('html')[0].clientWidth
        : window.innerWidth
    };

    const functionsToBeBound = [
      'updateDimensions',
      'deleteUser',
      'cancelDelete'
    ];

    // Bind this to all necessary functions
    forEach(functionsToBeBound, (functionToBeBound) => {
      this[functionToBeBound] = this[functionToBeBound].bind(this);
    });

    // Add event listeners
    window.addEventListener('resize', this.updateDimensions);
    window.addEventListener(
      'keydown',
      (e) => {
        const { requestPending } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          requestPending
        );
      }
    );
  }

  componentWillMount() {
    const { authenticated, history } = this.props;

    // If the user is not authenticated, redirect to the signin page
    if (!authenticated) {
      history.push('/signin');
    }
  }

  componentDidMount() {
    const warningTextHeight = this.warningText.getBoundingClientRect().height;
    const bottomDivHeight = this.bottomDiv.getBoundingClientRect().height;

    // Set state with rendered elements' dimensions
    this.setState({ warningTextHeight, bottomDivHeight });
  }

  componentWillUnmount() {
    // Component cleanup
    clearTimeout(this.redirectOnSignoutRefId);
    window.removeEventListener('resize', this.updateDimensions);
    window.removeEventListener(
      'keydown',
      (e) => {
        const { requestPending } = this.state;

        manageKeyboardAccessibility(
          e.key,
          () => e.preventDefault(),
          requestPending
        );
      }
    );
  }

  updateDimensions() {
    const { accountDeleted } = this.state;

    // If the account has not been deleted yet...
    if (!accountDeleted) {
      // Window width state will always be set when updating window dimensions
      const setStateObj = {
        windowWidth: document.body.classList.contains('safari')
          ? document.getElementsByTagName('html')[0].clientWidth
          : window.innerWidth
      };

      // Refs whose dimensions may have been updated, and their corresponding state keys
      const refs = ['warningText', 'bottomDiv'];
      const stateKeys = ['warningTextHeight', 'bottomDivHeight'];

      // For each ref...
      forEach(refs, (ref, i) => {
        const { state } = this;
        const stateKey = stateKeys[i];
        const newStatePropValue = this[ref].getBoundingClientRect().height;

        // If the ref's dimensions have changed, prepare to set state with the new value
        if (state[stateKey] !== newStatePropValue) {
          setStateObj[stateKey] = newStatePropValue;
        }
      });

      // Set the state
      this.setState(setStateObj);
    }
  }

  redirectOnDeleteAcc() {
    const { history } = this.props;

    // Redirect to landing page after three seconds
    this.redirectOnDeleteAccRefId = setTimeout(() => {
      history.push('/');
    }, 3000);
  }

  deleteUser() {
    const { deleteUser } = this.props;

    // Request is pending
    this.setState({ requestPending: true });

    // Delete user
    deleteUser(
      // If the deletion is not successful, the request is no longer pending
      () => this.setState({ requestPending: false }),

      // If the deletion is successful, update state and redirect
      // (redirect occurs three seconds later)
      () => {
        this.setState({ requestPending: false, accountDeleted: true });
        this.redirectOnDeleteAcc();
      }
    );
  }

  cancelDelete() {
    const { history } = this.props;

    // Redirect to previous route
    history.goBack();
  }

  renderButtons(btnSizeClassName) {
    const btnTexts = ['Yes', 'No'];

    // Initial variables are for yes button
    let className = `btn ${btnSizeClassName} btn-danger left-side-button`;
    let onClick = this.deleteUser;

    // Return buttons markup
    return map(btnTexts, (btnText, i) => {
      // Change variables' values if rendering no button
      if (btnText === 'No') {
        className = `btn ${btnSizeClassName} btn-primary`;
        onClick = this.cancelDelete;
      }

      // Return button to be rendered
      return (
        <button
          key={i}
          className={className}
          type="button"
          onClick={onClick}
        >
          {btnText}
        </button>
      );
    });
  }

  render() {
    const { serverErrors } = this.props;
    const {
      accountDeleted,
      requestPending,
      windowWidth,
      warningTextHeight,
      bottomDivHeight
    } = this.state;
    const windowHeight = window.innerHeight;
    const serverErrorInvisibleBackground = serverErrorsInvisibleBackground(serverErrors);

    // Initial variables are for screen-size larger than phone
    let imgVerticalMargins = 106;
    let btnSizeClassName = styles['btn-xl'];

    // Change values if on phone-size screen
    if (windowWidth < 767.5) {
      imgVerticalMargins = 76;
      btnSizeClassName = 'btn-lg';
    }

    // If account has been deleted, render goodbye component
    if (accountDeleted) {
      return <Goodbye parentCompIsDeleteAccount />;
    }

    // Else render warning markup
    return (
      <div className={`text-center ${styles.container}`}>

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

          {/* If request is pending, page is not clickable */}
          {
            requestPending
              ? <div className="page-not-clickable" />
              : null
          }

          {/* Warning text */}
          <div
            className={styles['warning-text']}
            ref={(warningText) => {
              this.warningText = warningText;
            }}
          >
            Once you delete your account, all of your images and user data will be gone forever!
          </div>

          {/* Render next-gen image version if browser support exists */}
          <img
            src={
              document.body.classList.contains('webp')
                ? '../../../images/next-gen/stop-sign.webp'
                : '../../../images/standard/stop-sign.png'
            }
            alt="Stop Sign"
            className={styles['stop-sign']}
            style={{
              maxHeight:
                windowHeight - warningTextHeight - bottomDivHeight - imgVerticalMargins
            }}
          />

          {/* Bottom div */}
          <div
            ref={(bottomDiv) => {
              this.bottomDiv = bottomDiv;
            }}
          >

            {/* Verification text */}
            <div className={styles['verification-text']}>
              Are you sure you want to&nbsp;
              <strong>
                permanently
              </strong>
              &nbsp;delete your account?
            </div>

            {/* Render yes and no buttons */}
            <div className="text-center">
              {this.renderButtons(btnSizeClassName)}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const { auth: { authenticated }, serverErrors } = state;

  return { authenticated, serverErrors };
}

export default connect(mapStateToProps, { deleteUser })(DeleteAccount);
