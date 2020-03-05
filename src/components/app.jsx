import React, { Component } from 'react';
import Loadable from 'react-loadable';
import {
  BrowserRouter,
  Redirect,
  Route,
  Switch
} from 'react-router-dom';

import registerServiceWorker from '../registerServiceWorker';
import Loader from './loader';
import RequireAuth from './auth/require_auth';
import styles from '../style/app.css';

class App extends Component {
  static renderNewVersionAlert() {
    return (
      // Overlay
      <div className={`overlay ${styles['new-version-alert-overlay']}`}>

        {/* Modal */}
        <div className="alert alert-success pop-up">

          {/* Text Heading */}
          <h2 className={`text-center ${styles['new-version-alert-heading']}`}>
            New Version!
          </h2>

          {/* Text Body */}
          <h3 className="text-center warning-text">
            <span className={styles['new-version-text-line-1']}>Your application is out of date!</span>
            <span>&nbsp;Please refresh the page to get the latest version.</span>
          </h3>

          {/* Button Container */}
          <div className="text-center">

            {/* Refresh Button */}
            <button
              className="btn btn-lg btn-primary"
              type="button"

              // Autofocus if device is not a touchscreen
              autoFocus={!document.body.classList.contains('touchscreen')}

              // Reload the page on click
              onClick={() => window.location.reload()}
            >

              {/* Button Text */}
              Refresh

            </button>

          </div>
        </div>
      </div>
    );
  }

  static renderApp() {
    // Lazy Loaded Components - permit asynchronous loading and render the
    // Loader component while loading
    const AsyncLanding = Loadable({
      loader: () => import('./landing'),
      loading: Loader
    });
    const AsyncAuth = Loadable({
      loader: () => import('./auth/auth'),
      loading: Loader
    });
    const AsyncSignout = Loadable({
      loader: () => import('./auth/signout'),
      loading: Loader
    });
    const AsyncDeleteAccount = Loadable({
      loader: () => import('./auth/delete_account'),
      loading: Loader
    });
    const AsyncImages = Loadable({
      loader: () => import('./images'),
      loading: Loader
    });
    const AsyncCategories = Loadable({
      loader: () => import('./categories'),
      loading: Loader
    });
    const AsyncGame = Loadable({
      loader: () => import('./game'),
      loading: Loader
    });
    const AsyncCatchAll = Loadable({
      loader: () => import('./catch_all'),
      loading: Loader
    });

    // App Markup
    return (
      // Enable React Routing for the App
      <BrowserRouter>
        {/* Render the first Route whose path matches the user's location */}
        <Switch>
          {/* Landing Component */}
          <Route exact path="/" component={AsyncLanding} />

          {/* Auth Component (Signin or Signup) */}
          <Route path="/(signin|signup)/" component={AsyncAuth} />

          {/* Signout Component */}
          <Route path="/signout" component={AsyncSignout} />

          {/* Delete Account Component */}
          <Route path="/delete-account" component={RequireAuth(AsyncDeleteAccount)} />

          {/* Game Component */}
          <Route path="/game" component={RequireAuth(AsyncGame)} />

          {/* Images Component */}
          <Route path="/images/pg-:pageId" component={RequireAuth(AsyncImages)} />

          {/* Redirect from '/images' to '/images/pg-1' */}
          <Redirect from="/images" to="/images/pg-1" />

          {/* Categories Component */}
          <Route path="/categories/:categoryId?/:pageId?" component={RequireAuth(AsyncCategories)} />

          {/* Catch-All Component */}
          <Route component={RequireAuth(AsyncCatchAll)} />

        </Switch>
      </BrowserRouter>
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      newVersion: false
    };
  }

  componentDidMount() {
    // Register the app's service worker, and if a new version of the app exists,
    // set the state to reflect that
    registerServiceWorker(() => this.setState({ newVersion: true }));
  }


  render() {
    const { newVersion } = this.state;

    // If there is a new version of the app, render the new version alert
    if (newVersion) {
      return App.renderNewVersionAlert();
    }

    // Render the main app markup
    return App.renderApp();
  }
}

export default App;
