export default function preventSpaceFirst(inputValue, keyPressed, preventDefault) {
  // Prevent the user from entering a space first in an input field
  if (inputValue === '' && keyPressed === ' ') {
    preventDefault();
  }
}
