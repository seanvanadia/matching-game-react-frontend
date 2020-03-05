import React, { Component } from 'react';
import { connect } from 'react-redux';

import { fetchCategoryImage, fetchImage } from '../actions';
import Loader from './loader';
import styles from '../style/image.css';

class Image extends Component {
  constructor(props) {
    super(props);

    const {
      category,
      imagePathname,
      images,
      imgIndex,
      isCatPageImage,
      isNonCatImage
    } = this.props;

    // Define the initial image src value based on the src set in the redux state
    let imgSrc = null;
    if (isCatPageImage) {
      // Define by categories redux state
      imgSrc = isNonCatImage
        ? category.nonCatImages[imgIndex].image
        : category.images[imgIndex].image;
    } else {
      // Define by images redux state
      imgSrc = images[imgIndex].image;
    }

    // If the src set in the redux state begins with 'https' (and not blob),
    // the image file has not yet been fetched and updated in the images state, so...
    if (/^https/.test(imgSrc)) {
      // If the imagePathname passed into this component begins with 'https' (and not blob),
      // the image file has not yet been fetched inside the app at all, so set it as null.
      // Else, the image file has been fetched and updated in the categories state,
      // and passed in as the imagePathname, so set the imgSrc as the imagePathname
      imgSrc = /^https/.test(imagePathname) ? null : imagePathname;
    }

    this.state = {
      componentIsLoading: !/^blob:/.test(imgSrc), // Image is loading unless the imgSrc starts with 'blob:'
      imgSrc
    };
  }

  componentDidMount() {
    const {
      categories,
      categoryIndex,
      fetchCategoryImage,
      fetchImage,
      imageId,
      imagePathname,
      imgIndex,
      isCatPageImage,
      isNonCatImage
    } = this.props;
    const { imgSrc } = this.state;

    // If the image file has not yet been fetched...
    if (imgSrc === null) {
      // If it's a cat image, fetch cat image file
      if (isCatPageImage) {
        fetchCategoryImage(
          imageId,
          imagePathname,
          categoryIndex,
          // Then define the newImgSrc and set the state to reflect this
          () => {
            const newImgSrc = isNonCatImage
              ? categories[categoryIndex].nonCatImages[imgIndex].image
              : categories[categoryIndex].images[imgIndex].image;

            this.setState({
              imgSrc: newImgSrc,
              componentIsLoading: false
            });
          },
          isNonCatImage
        );
      }

      // If it's not a cat image, fetch the non-cat image file...
      else {
        fetchImage(
          imageId,
          imgIndex,

          // Then set the state to load the fetched non-cat image file
          () => {
            const { images, imgIndex } = this.props;

            this.setState({ imgSrc: images[imgIndex].image, componentIsLoading: false });
          }
        );
      }
    }
  }

  render() {
    const {
      categories,
      categoryIndex,
      imageMaxHeight,
      images,
      imgIndex,
      isCatPageImage,
      isNonCatImage
    } = this.props;
    const { componentIsLoading, imgSrc } = this.state;
    const windowWidth = document.body.classList.contains('safari')
      ? document.getElementsByTagName('html')[0].clientWidth
      : window.innerWidth;

    // Define the imageFileName
    let imageFileName = null;
    // Define the imageFileName for catPageImages
    if (isCatPageImage) {
      const img = isNonCatImage
        ? categories[categoryIndex].nonCatImages[imgIndex]
        : categories[categoryIndex].images[imgIndex];

      if (img) {
        imageFileName = img.image_file_name;
      }
    }

    // Define the imageFileName for images page images
    else {
      imageFileName = images[imgIndex].image_file_name;
    }

    // Extract image alt text from image filename (get rid of filename extension)
    const imageAltText = imageFileName ? imageFileName.slice(0, imageFileName.lastIndexOf('.')) : null;

    // Store the image element as a constant
    const imageElement = (
      <img
        src={imgSrc}
        alt={imageAltText}
        className={styles.image}
        style={
          {
            display: componentIsLoading ? 'none' : 'initial',
            maxHeight: imageMaxHeight
          }
        }
      />
    );

    // If the device is phone-size and the component is not loading, return the image element
    if (windowWidth < 767.5 && !componentIsLoading) {
      return imageElement;
    }

    // Else, return the image element (or loader element) in a container for optimal spacing
    return (
      // Container
      <div
        className={styles.container}
        style={{ height: imageMaxHeight }}
      >

        {/* Render the loader component if the image component is loading */}
        { componentIsLoading ? <Loader renderNoLoadingText /> : null }

        {/* Image Element */}
        { imageElement }

      </div>
    );
  }
}

function mapStateToProps(state) {
  const { categories, images } = state;

  return { categories, images };
}

export default connect(mapStateToProps, { fetchCategoryImage, fetchImage })(Image);
