import { pick, map, forEach } from 'lodash-es';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Fields, reduxForm } from 'redux-form';
import { Link } from 'react-router-dom';

import {
  manageKeyboardAccessibility,
  preventSpaceFirst,
  serverErrorsInvisibleBackground
} from '../../utils';

import {
  authError,
  disableWarnings,
  signinUser,
  signupUser
} from '../../actions';

import AlreadySignedInOrOut from './already_signed_in_or_out';
import ServerErrorsPopup from '../server_errors_popup';
import styles from '../../style/auth.css';

class AuthPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      countdownSeconds: 3,
      requestPending: false,
      windowHeight: window.innerHeight
    };

    const { location: { pathname } } = this.props;
    const functionsToBeBound = [
      'updateDimensions',
      'renderFields'
    ];

    // Determine whether user is visiting signin page or signup page
    if (/^\/signin/.test(pathname)) {
      this.signinPage = true;
    } else {
      this.signupPage = true;
    }

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

  componentDidMount() {
    const { authenticated, disableWarnings, history } = this.props;

    // If user is already signed in, redirect to game page
    if (authenticated) {
      this.alreadySignedInRedirect = setTimeout(() => {
        disableWarnings();
        history.push('/game');
      }, 3000);

      // Countdown for redirect
      this.alreadySignedInCountdown = setInterval(() => {
        this.setState((prevState) => ({ countdownSeconds: prevState.countdownSeconds - 1 }));
      }, 1000);
    }
  }

  componentWillUnmount() {
    const { errorMessage, authError } = this.props;

    // If there's an error message, remove it
    if (errorMessage) {
      authError(null);
    }

    // Component cleanup
    clearTimeout(this.alreadySignedInRedirect);
    clearInterval(this.alreadySignedInCountdown);
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

  onSubmit(values) {
    // Request is pending upon submitting form
    this.setState({ requestPending: true });

    // If user is already signed in on another device, refresh page to begin redirect
    if (localStorage.email && localStorage.token) {
      window.location.reload();
      return null;
    }

    const { props } = this;
    const { disableWarnings, history } = props;
    const { email, password } = values;

    // Declaring signin variables
    let action = 'signinUser';
    let newPath = '/game';

    // Declaring signup variables
    if (this.signupPage) {
      action = 'signupUser';
      newPath = '/categories';
    }

    // Dispatching action
    props[action](
      { email, password },
      () => this.setState({ requestPending: false }),
      () => {
        this.setState({ requestPending: false });
        disableWarnings();
        history.push(newPath);
      }
    );

    return null;
  }

  updateDimensions() {
    this.setState({ windowHeight: window.innerHeight });
  }

  renderFieldError(field, fieldKey, passwordErrorDisplay) {
    // Return special error display for signup page password error
    if (fieldKey === 'password' && this.signupPage) {
      return passwordErrorDisplay;
    }

    // Else return normal error display
    if (field.meta.touched) {
      return field.meta.error;
    }

    // Return an empty string if there is no error
    return '';
  }

  renderFields(fields) {
    const passwordError = fields.password.meta.error;
    const passwordTouched = fields.password.meta.touched;
    const fieldNames = pick(fields, fields.names);
    const labels = ['Email', 'Password'];

    let passwordErrorDisplay = '';
    let i = -1;

    // If signup page is to be rendered
    if (this.signupPage) {
      // Add confirm password to labels
      labels.push('Confirm Password');

      // If passwords don't match, set special error display
      if (passwordError === 'Passwords must match' && passwordTouched && fields.passwordConfirm.meta.touched) {
        passwordErrorDisplay = passwordError;
      }

      // If passwords match, set normal error display
      if (passwordError !== 'Passwords must match' && passwordTouched) {
        passwordErrorDisplay = passwordError;
      }
    }

    // Fields markup
    const renderedFields = map(fieldNames, (field, fieldKey) => {
      i += 1;
      let classNamePortion = '';

      // Determine if field has error
      const fieldHasError = (
        this.signupPage
          && (
            (
              fieldKey !== 'password'
              && fields[fieldKey].meta.error
              && fields[fieldKey].meta.touched
            )
            || (
              fieldKey === 'password'
              && passwordErrorDisplay
            )
          )
      )
      || (
        this.signinPage
        && fields[fieldKey].meta.error
        && fields[fieldKey].meta.touched
      );

      if (fieldHasError) {
        classNamePortion = 'has-error';
      }

      // Defining each field to be rendered
      return (
        // Form group div
        <div
          key={i}
          className={`
            ${classNamePortion}
            form-group
            ${styles['form-group']}
          `}
        >
          <label
            htmlFor={fieldKey}
            className={styles['input-label']}
            onClick={(e) => e.preventDefault()}
          >

            {/* Label */}
            <div className={styles['label-text']}>
              {labels[i]}
            </div>

            {/* Input field */}
            <input
              id={fieldKey}
              className={`text-center form-control ${styles['input-field']}`}
              type={fieldKey === 'email' ? 'text' : 'password'}
              maxLength={fieldKey === 'email' ? 254 : 35}
              onKeyPress={(e) => preventSpaceFirst(e.target.value, e.key, () => e.preventDefault())}
              {...fields[fieldKey].input}
            />
          </label>

          {/* Field error (will be empty string if there is none) */}
          <div className={`text-danger ${styles['error-text']}`}>
            {this.renderFieldError(
              fields[fieldKey],
              fieldKey,
              passwordErrorDisplay
            )}
          </div>
        </div>
      );
    });

    // Return the fields to be rendered
    return <div>{renderedFields}</div>;
  }

  renderAuthFormPage() {
    const { errorMessage, handleSubmit, history } = this.props;
    const { requestPending } = this.state;

    // Initial variables are for signin page
    const names = ['email', 'password'];
    let headingPortion = 'In';
    let headingClassname = 'signin-heading';
    let buttonText = 'Submit';

    // Change values if visiting signup page
    if (this.signupPage) {
      headingPortion = 'Up';
      headingClassname = 'signup-heading';
      buttonText = 'Sign Up!';
      names.push('passwordConfirm');
    }

    // Auth form page to be rendered
    return (
      <div>

        {/* If a request is pending, page is not clickable */}
        {
          requestPending
            ? <div className="page-not-clickable" />
            : null
        }

        {/* Page heading */}
        <h1 className={`text-center ${styles[headingClassname]}`}>
          {`Sign ${headingPortion}`}
        </h1>

        {/* Auth form */}
        <div className="text-center">
          <form onSubmit={handleSubmit(this.onSubmit.bind(this))}>

            {/* Fields to be rendered */}
            <Fields names={names} component={this.renderFields} />

            {/* If app state contains error message, display error at bottom of form */}
            {
              errorMessage
                ? (
                  <div className={`alert alert-danger h3 ${styles['error-alert']}`}>
                    <strong>
                      {errorMessage}
                    </strong>
                  </div>
                )
                : null
            }

            {/* Submit button */}
            <button
              type="submit"
              className={`btn btn-lg btn-primary ${styles['submit-button']}`}
            >
              {buttonText}
            </button>
          </form>

          {/* Link to landing page */}
          <Link
            to="/"
            className={styles['landing-page-link']}

            // Handler prevents validation from taking precedent over link navigation
            onMouseDown={() => history.push('/')}
          >

            &larr;&nbsp; Back to Landing Page
          </Link>
        </div>
      </div>
    );
  }

  render() {
    const { serverErrors, authenticated } = this.props;
    const { countdownSeconds, windowHeight } = this.state;
    const parentComp = this.signinPage ? 'Signin' : 'Signup';
    const alreadySignedInProps = { countdownSeconds, parentComp, windowHeight };
    const serverErrorInvisibleBackground = serverErrorsInvisibleBackground(serverErrors);

    return (
      <div className="page-container">

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

          {/* Render redirect page if signed in, else render auth form */}
          {
            authenticated
              ? <AlreadySignedInOrOut {...alreadySignedInProps} />
              : this.renderAuthFormPage()
          }

        </div>
      </div>
    );
  }
}

function validateAuthForm(values, props) {
  const errors = {};
  const signupPage = /^\/signup/.test(props.location.pathname);
  const fields = {
    email: 'an email address',
    password: 'a password'
  };

  // If visiting signup page, set password confirm error text
  if (signupPage) {
    fields.passwordConfirm = 'a password confirmation';
  }

  // Set error text for invalid email regex
  if (!/^\s*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\s*$/i.test(values.email)) {
    errors.email = 'Invalid email address';
  }

  // Set error text for invalid password regex
  if (!/(?=.*[A-Z])(?=.*[0-9])^.{8,30}$/i.test(values.password)) {
    errors.password = 'Invalid password (passwords must be between 8 and 30 characters in length, and contain letters and numbers)';
  }
  // Set error text for passwords not matching
  else if (signupPage && values.password !== values.passwordConfirm) {
    errors.password = 'Passwords must match';
  }

  // Set error text for empty input fields
  map(fields, (field, fieldKey) => {
    if (!values[fieldKey]) {
      errors[fieldKey] = `Please enter ${field}`;
    }
  });

  // Return all errors
  return errors;
}

function mapStateToProps(state) {
  const { auth: { error, authenticated }, serverErrors } = state;

  return {
    errorMessage: error,
    authenticated,
    serverErrors
  };
}

export default connect(
  mapStateToProps,
  {
    authError,
    disableWarnings,
    signinUser,
    signupUser
  }
)(reduxForm({
  validate: validateAuthForm,
  form: 'AuthForm'
})(AuthPage));
