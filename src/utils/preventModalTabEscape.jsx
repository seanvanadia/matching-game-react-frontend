export default function preventModalTabEscape(
  keyPressed, preventDefault, focusOnModalsFirstElement
) {
  // If tab is pressed when the user is focused on a modal's final focusable
  // element, focus on the modal's first focusable element
  if (keyPressed === 'Tab') {
    preventDefault();
    focusOnModalsFirstElement();
  }
}
