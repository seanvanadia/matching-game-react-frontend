import React from 'react';

import styles from '../../style/already_signed_in_or_out.css';

const AlreadySignedInOrOut = ({ parentComp, countdownSeconds, windowHeight }) => {
  const windowWidth = document.body.classList.contains('safari')
    ? document.getElementsByTagName('html')[0].clientWidth
    : window.innerWidth;

  // Initial variable's value is for user trying to sign in when already signed in
  let warningText = 'A user is already signed in!';

  // If user is trying to signout when already signed out, change variable's value
  if (parentComp === 'Signout') {
    warningText = 'You are already signed out!';
  }

  // If user is trying to sign up while another user is signed in on the
  // device, change the variable's value
  else if (parentComp === 'Signup') {
    warningText = 'You cannot sign up while another user is signed in!';
  }

  // Return Warning Markup
  return (
    <main className={`text-center ${windowWidth < 767.5 ? 'h2' : 'h1'} ${styles.container}`}>

      {/* Warning Text */}
      <div>
        {warningText}
      </div>

      {/* Redirecting Clock Image */}
      <img

        // Render next-gen image version if browser support exists
        src={
          document.body.classList.contains('webp')
            ? '../../images/next-gen/clock-face.webp'
            : '../../images/standard/clock-face.png'
        }
        alt="Clock face pointing finger"
        className={styles['clock-face']}
        style={{ maxHeight: windowHeight * 0.6 }}
      />

      {/* Redirecting Text */}
      <div>
        You will be redirected in&nbsp;
        {countdownSeconds}
        &hellip;
      </div>
    </main>
  );
};

export default AlreadySignedInOrOut;
