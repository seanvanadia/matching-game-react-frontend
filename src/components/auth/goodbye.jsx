import React from 'react';

import styles from '../../style/goodbye.css';

const Goodbye = ({ parentCompIsDeleteAccount }) => {
  const windowWidth = document.body.classList.contains('safari')
    ? document.getElementsByTagName('html')[0].clientWidth
    : window.innerWidth;

  // Initial variables' values are for signout page
  let goodbyeStr = 'Come back soon...';
  let goodbyeImgSrc = '../../../images/standard/see-you-soon.png';
  let altText = 'Smiling face';
  let className = 'signout-face';

  // If the user is on the delete account page, change the variables' values
  if (parentCompIsDeleteAccount) {
    goodbyeStr = 'Sorry to see you go...';
    goodbyeImgSrc = '../../../images/standard/sad-face.png';
    altText = 'Sad face';
    className = 'delete-acc-face';
  }

  // If next-gen image browser support exists, change the goodbye image src
  // to the next-gen image version
  if (document.body.classList.contains('webp')) {
    goodbyeImgSrc = goodbyeImgSrc.replace('standard', 'next-gen').replace('.png', '.webp');
  }

  // Return Goodbye Markup
  return (
    <main className="text-center">

      {/* Goodbye Text */}
      <div className={`${windowWidth < 767.5 ? 'h2' : 'h1'} ${styles.text}`}>
        {goodbyeStr}
      </div>

      {/* Goodbye Image */}
      <img
        src={goodbyeImgSrc}
        alt={altText}
        className={styles[className]}
        style={{ maxHeight: window.innerHeight * 0.65 }}
      />
    </main>
  );
};

export default Goodbye;
