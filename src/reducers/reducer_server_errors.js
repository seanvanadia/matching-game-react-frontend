import { SERVER_ERRORS, REMOVE_SERVER_ERRORS } from '../actions';

export default function (state = [], action) {
  switch (action.type) {
    // If server errors exist, return the array of server errors
    case SERVER_ERRORS:
      return action.payload;

    // If server errors are to be removed from the UI, return an empty array
    case REMOVE_SERVER_ERRORS:
      return [];

    // By default, return the current state of the server errors
    default:
      return state;
  }
}
