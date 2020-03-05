import {
  VISITED_HOME,
  VISITED_IMAGES,
  NOT_ENOUGH_IMAGES,
  CLEAR_NAVIGATION_ALERT,
  DISABLE_WARNINGS
} from '../actions';

export default function (state = null, action) {
  switch (action.type) {
    // When a user visits the home page without enough categories to play
    // the game, return a state that results in rendering an alert that notifies the user
    case VISITED_HOME:
      return 'visited-home';

    // When a user visits the images page without having at least one
    // category, return a state that results in rendering an alert that notifies the user
    case VISITED_IMAGES:
      return 'visited-images';

    // When a user visits the home page without enough images to play
    // the game, return a state that results in rendering an alert that notifies the user
    case NOT_ENOUGH_IMAGES:
      return 'not-enough-images';

    // Return a state of null when a navigation alert is to be cleared
    case CLEAR_NAVIGATION_ALERT:
      return null;

    // When navigation warnings are disabled, return 'warnings-disabled'
    case DISABLE_WARNINGS:
      return 'warnings-disabled';

    // By default, return the current state of the navigation alert
    default:
      return state;
  }
}
