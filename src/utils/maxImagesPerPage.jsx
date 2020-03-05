export default function maxImagesPerPage() {
  const windowWidth = document.body.classList.contains('safari')
    ? document.getElementsByTagName('html')[0].clientWidth
    : window.innerWidth;

  // Max number of images on a page for phone-size devices is 7
  if (windowWidth < 767.5) {
    return 7;
  }

  // Max number of images on a page for tablet-size devices is 18
  if (windowWidth > 767.5 && windowWidth < 991.5) {
    return 18;
  }

  // Max number of images on a page for desktop-size devices is 24
  return 24;
}
