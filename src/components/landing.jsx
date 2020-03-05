import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { HeadProvider, Style } from 'react-head';

import styles from '../style/landing.css';

class Landing extends Component {
  constructor(props) {
    super(props);

    this.state = {
      windowHeight: window.innerHeight
    };

    // Bound functions
    this.updateDimensions = this.updateDimensions.bind(this);

    // Event listeners
    window.addEventListener('resize', this.updateDimensions);
  }

  componentWillMount() {
    const { authenticated, history } = this.props;

    // If user is already signed in, redirect to game page
    if (authenticated) {
      history.push('/game');
    }
  }

  componentWillUnmount() {
    // Component cleanup
    window.removeEventListener('resize', this.updateDimensions);
  }

  updateDimensions() {
    this.setState({ windowHeight: window.innerHeight });
  }

  render() {
    const { windowHeight } = this.state;

    return (
      <div>

        {/* Internal Styling for quicker load time on landing page (first page user sees) */}
        <HeadProvider>
          <Style>
            {`
              .landing-page {
                min-height: ${windowHeight}px;
                background-color: #000;
                color: #fff;
              }
              .droid-serif {
                font-family: "Droid Serif", sans-serif;
                font-weight: 700;
              }
              .landing-top {
                z-index: 2;
                position: relative;
                padding-top: 40vh;
              }
              .landing-header {
                margin-bottom: 20px;
              }
              .or-span {
                margin-left: 10px;
                margin-right: 10px;
              }
              .landing-header, .or-span {
                text-shadow:
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000; 
              }
              .landing-page-button {
                font-size: 24px;
                letter-spacing: 0.75px;
              }
              .landing-signin-button {
                border-color: #3D993D;
                background-color: #4AA64A;
              }
              @media (max-width: 767.5px) {
                .landing-header {
                  font-size: 30px;
                  letter-spacing: 1px;
                  margin-top: 0;
                  margin-bottom: 10px;
                }
                .landing-page-button {
                  font-size: 18px;
                  letter-spacing: 0;
                }
                .landing-signin-button {
                  background-color: #3C853C;
                  border-color: #2F782F;
                }
                .landing-signin-button:hover, .landing-signin-button:focus {
                  background-color: #2F782F;
                  border-color: #236C23;
                }
              }
            `}
          </Style>
        </HeadProvider>

        {/* Landing page body */}
        <div className="landing-page droid-serif">

          {/* Overlay content */}
          <div
            className="landing-top text-center"
            style={{ paddingTop: (windowHeight / 2) - 70 }}
          >
            {/* Heading text */}
            <h1 className="landing-header">
              Welcome to the Matching Game!
            </h1>

            {/* Signin Link */}
            <Link
              to="/signin"
              className="
                btn
                btn-lg
                btn-success
                landing-page-button
                landing-signin-button
              "
            >
              Sign In
            </Link>

            {/* Or text */}
            <span className="h3 or-span">
              &nbsp;or&nbsp;
            </span>

            {/* Signup Link */}
            <Link
              to="/signup"
              className="
                btn
                btn-lg
                btn-primary
                landing-page-button
              "
            >
              Sign Up
            </Link>
          </div>

          {/* Slideshow Background */}
          <ul
            className={styles.slideshow}
            aria-label="Slideshow of a baby, beach, nighttime, snowfall, and a dog and cat"
          >

            {/* Individual slideshow elements */}
            <li />
            <li />
            <li />
            <li />
            <li />
          </ul>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { authenticated: state.auth.authenticated };
}

export default connect(mapStateToProps)(Landing);
