import numOfPages from './numOfPages';

export default function defaultPageNumber(urlPageId, numOfImages) {
  // If there is no page number equal to the urlPageId, or there is no urlPageId,
  // the default page number is 1
  if (
    !(urlPageId >= 1 && urlPageId <= numOfPages(numOfImages))
  ) {
    return 1;
  }

  // Else the default page number is the urlPageId
  return urlPageId;
}
