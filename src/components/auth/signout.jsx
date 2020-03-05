import React, { Component } from 'react';
import { connect } from 'react-redux';
import { signoutUser } from '../../actions';

import AlreadySignedInOrOut from './already_signed_in_or_out';
import Goodbye from './goodbye';
import Loader from '../loader';

class Signout extends Component {
  constructor(props) {
    super(props);

    this.state = {
      componentIsLoading: true,
      countdownSeconds: 3,
      windowHeight: window.innerHeight
    };

    // Bound functions
    this.updateDimensions = this.updateDimensions.bind(this);

    // Event listeners
    window.addEventListener('resize', this.updateDimensions);
  }

  componentWillMount() {
    const { authenticated, history, signoutUser } = this.props;

    // If user is signed in, and has not signed out in another window, signout user
    if (authenticated && (localStorage.email && localStorage.token)) {
      signoutUser(() => {
        // After signout, component is no longer loading
        this.setState({ componentIsLoading: false });

        // Redirect to landing page after three second countdown
        this.redirectToLandingAtZero();
      },

      // If user is already signed out on a different device,
      // Redirect to signin page after action unauths user
      () => history.push('/signin'));
    }

    // If user was already signed out, component is no longer loading
    // Set component variable to render already signed out markup
    else {
      this.setState({ componentIsLoading: false });
      this.userWasSignedOutBeforeRequest = true;
    }
  }

  componentDidMount() {
    // If user was already signed out
    if (this.userWasSignedOutBeforeRequest) {
      // Set countdown to landing page redirect
      this.alreadySignedOutCountdown = setInterval(() => {
        this.setState((prevState) => ({ countdownSeconds: prevState.countdownSeconds - 1 }));
      }, 1000);

      // Redirect when timer hits zero (three seconds)
      this.redirectToLandingAtZero();
    }
  }

  componentWillUnmount() {
    // Component cleanup
    window.removeEventListener('resize', this.updateDimensions);
    clearTimeout(this.redirectToLandingAtZeroRefId);
    if (this.userWasSignedOutBeforeRequest) {
      clearInterval(this.alreadySignedOutCountdown);
    }
  }

  redirectToLandingAtZero() {
    const { history } = this.props;

    // Redirect to landing page when timer hits zero (three seconds)
    this.redirectToLandingAtZeroRefId = setTimeout(() => {
      history.push('/');
    }, 3000);
  }

  updateDimensions() {
    this.setState({ windowHeight: window.innerHeight });
  }

  render() {
    const { componentIsLoading, countdownSeconds, windowHeight } = this.state;
    const alreadySignedOutProps = { countdownSeconds, windowHeight };

    // If component is loading, return loader component
    if (componentIsLoading) {
      return <Loader />;
    }

    // Else return signout page
    return (
      <div className="page-container">

        {/* Render redirect component if already signed out, else render goodbye component */}
        {
          this.userWasSignedOutBeforeRequest
            ? <AlreadySignedInOrOut parentComp="Signout" {...alreadySignedOutProps} />
            : <Goodbye />
        }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { authenticated: state.auth.authenticated };
}

export default connect(mapStateToProps, { signoutUser })(Signout);
