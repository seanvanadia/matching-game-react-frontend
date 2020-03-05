export default function manageKeyboardAccessibility(
  keyPressed, preventDefault, waitPeriod
) {
  if (
    // If a request to the backend is pending, or an animation is on screen,
    // or there is a mid-game wait period, and a keyboard "click" occurs or the user presses tab...
    waitPeriod
    && (keyPressed === 'Enter' || keyPressed === ' ' || keyPressed === 'Tab')
  ) {
    // Prevent the default function of the key pressed
    preventDefault();
  }
}
