import { forEach } from 'lodash-es';

export default function serverErrorsInvisibleBackground(serverErrors) {
  let invisibleBackground = false;

  // Determine if an invisible background is required
  forEach(serverErrors, (error) => {
    const errorText = error.text ? error.text : error;

    // If the request caused the app to fail, an invisible background is required
    if (errorText === 'Sorry! The request has caused the app to fail. Please refresh the page!') {
      invisibleBackground = true;
      return false;
    }

    return null;
  });

  // Return the value of invisibleBackground
  return invisibleBackground;
}
