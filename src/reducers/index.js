import { combineReducers } from 'redux';
import { reducer as formReducer } from 'redux-form';

import AuthReducer from './auth_reducer';
import CategoriesReducer from './reducer_categories';
import ImagesReducer from './reducer_images';
import NavAlertReducer from './nav_alert_reducer';
import ServerErrorsReducer from './reducer_server_errors';
import WinTotalReducer from './reducer_win_total';

import { UNAUTH_USER } from '../actions';

const appReducer = combineReducers({
  auth: AuthReducer,
  categories: CategoriesReducer,
  form: formReducer,
  images: ImagesReducer,
  navigationAlert: NavAlertReducer,
  serverErrors: ServerErrorsReducer,
  winTotal: WinTotalReducer
});

// Account for recent unauthentication...
const rootReducer = (state, action) => {
  let newState = state;

  // If the user has been unauthenticated, reset the application state
  if (action.type === UNAUTH_USER) {
    newState = undefined;
  }

  // Return the app's reducer with the newly reset application state
  return appReducer(newState, action);
};

export default rootReducer;
