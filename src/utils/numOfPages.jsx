import { ceil } from 'lodash-es';
import maxImagesPerPage from './maxImagesPerPage';

export default function numOfPages(numOfImages) {
  // Return the number of pages
  return ceil(numOfImages / maxImagesPerPage());
}
