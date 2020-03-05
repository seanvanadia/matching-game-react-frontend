import React from 'react';
import ReactDOM from 'react-dom';
import { applyMiddleware, createStore } from 'redux';
import promise from 'redux-promise';
import reduxThunk from 'redux-thunk';
import { Provider } from 'react-redux';

import reducers from './reducers';
import { AUTH_USER } from './actions';
import App from './components/app';

// Create a redux store for the app with redux-promise and redux-thunk functionality
const store = applyMiddleware(promise, reduxThunk)(createStore)(reducers);

// If there is a valid email and token in local storage, authenticate the user on the front end
if (localStorage.email && localStorage.token) {
  store.dispatch({ type: AUTH_USER });
}

// If the user touches a touchscreen for the first time, add a 'touchscreen'
// classname to the document body to indicate that the user's device is a touchscreen
window.addEventListener(
  'touchstart',
  function onFirstTouch() {
    document.body.classList.add('touchscreen');
    window.removeEventListener('touchstart', onFirstTouch, false);
  },
  false
);

// If the browser is Chrome or Opera, add a 'webp' classname to the document
// body to indicate that the browser supports webp files
if (
  // Browser is Chrome
  (!!window.chrome)
  || (
    // Browser is Opera
    (!!window.opr && !!window.opr.addons)
    || !!window.opera
    || navigator.userAgent.indexOf(' OPR/') >= 0
  )
) {
  // Add 'webp' classname to the document body
  document.body.classList.add('webp');
}

// If the browser is Safari, add a 'safari' classname to the document
if (
  /constructor/i.test(window.HTMLElement)
    || (
      !!window.safari
        || (
          typeof safari !== 'undefined' && safari.pushNotification
        ).toString() === '[object SafariRemoteNotification]'
    )
) {
  document.body.classList.add('safari');
}

// Render the app, providing the Redux store to it
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,

  // Render the app in the element of index.html with the id 'app'
  document.getElementById('app')
);
