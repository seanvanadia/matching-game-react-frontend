import { AUTH_USER, UNAUTH_USER, AUTH_ERROR } from '../actions';

export default function (state = {}, action) {
  switch (action.type) {
    // If the user has been authenticated, update state to reflect that, and ensure no auth errors
    case AUTH_USER:
      return { ...state, error: null, authenticated: true };

    // If the user has been signed out or their account has been deleted, unauthenticate them
    case UNAUTH_USER:
      // If an error message is linked to the signout, include it in the updated state
      if (action.payload) {
        return { ...state, error: action.payload, authenticated: false };
      }

      // If no error message is linked to the signout, simply unauthenticate the user
      return { ...state, authenticated: false };

    // If there was an error while attempting to sign the user in, up, or out,
    // return the error and ensure that the user is not authenticated
    // (mostly occurs when user information is submitted that does not match any signed up
    // user when trying to sign in, or when a user attempting to sign up submits
    // information that has already been taken)
    case AUTH_ERROR:
      return { ...state, error: action.payload, authenticated: false };

    // By default, return the current auth state
    default:
      return state;
  }
}
