import React, { Component } from 'react';
import { connect } from 'react-redux';

import { forEach } from 'lodash-es';
import { resetServerInactivityTimer, signoutUser } from '../../actions';

export default function (ComposedComponent) {
  class Authentication extends Component {
    constructor(props) {
      super(props);

      // Bind this to necessary functions
      this.resetInactivityTimer = this.resetInactivityTimer.bind(this);

      // Add event listeners to reset the user inactivity timer when an event occurs
      forEach(['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'], (eventType) => {
        window.addEventListener(eventType, this.resetInactivityTimer);
      });

      // Store constant values that may be accessed multiple times in this component
      this.sessionTimedOut = false;
    }

    componentWillMount() {
      const { authenticated, history } = this.props;

      // If user is not authenticated, redirect to signin page
      if (!authenticated) {
        history.push('/signin');
      }
    }

    componentDidMount() {
      const { resetServerInactivityTimer } = this.props;

      // Start the frontend inactivity timer
      this.startInactivityTimer();

      // Start the backend inactivity timer
      resetServerInactivityTimer();

      // Reset the backend inactivity timer every five minutes
      this.resetServerInactivityIntervalId = setInterval(() => {
        resetServerInactivityTimer();
      }, 300000);
    }

    componentWillUpdate(nextProps) {
      const { location } = window;

      // If the user is not authenticated, the session has not timed out
      // (which has its own redirect attached to its handler),
      // and the user is not on the delete-account page
      // (which will update to render a view that should be temporarily permitted
      // if the user deletes their account),
      // redirect to the signin page
      if (!nextProps.authenticated && !this.sessionTimedOut && location.pathname !== '/delete-account') {
        location.pathname = '/signin';
      }
    }

    componentWillUnmount() {
      const { resetServerInactivityTimer } = this.props;

      // Clear the frontend inactivity timer
      clearTimeout(this.inactivityTimeoutId);

      // Remove all event listeners
      forEach(['mousemove', 'mousedown', 'keypress', 'touchmove', 'scroll'], (eventType) => {
        window.removeEventListener(eventType, this.resetInactivityTimer);
      });

      // Clear the interval to reset the server inactivity timer
      clearInterval(this.resetServerInactivityIntervalId);
    }

    startInactivityTimer() {
      const { history, signoutUser } = this.props;

      // Signout the user if they have been inactive for 30 minutes
      this.inactivityTimeoutId = setTimeout(() => {
        this.sessionTimedOut = true;

        signoutUser(
          () => history.push('/signin'),
          () => history.push('/signin'),
          true
        );
      }, 1800000);
    }

    resetInactivityTimer() {
      // Clear the inactivity timer
      clearTimeout(this.inactivityTimeoutId);

      // Start the inactivity timer over again
      this.startInactivityTimer();
    }

    render() {
      // Return composed component
      return <ComposedComponent {...this.props} />;
    }
  }

  function mapStateToProps(state) {
    return { authenticated: state.auth.authenticated };
  }

  return connect(mapStateToProps, { resetServerInactivityTimer, signoutUser })(Authentication);
}
