import React, { Component } from 'react';

import Header from './header';
import styles from '../style/catch_all.css';

class CatchAll extends Component {
  constructor(props) {
    super(props);

    this.state = {
      windowHeight: window.innerHeight
    };

    // Bound functions and event listeners
    this.updateDimensions = this.updateDimensions.bind(this);
    window.addEventListener('resize', this.updateDimensions);
  }

  componentWillUnmount() {
    // Component cleanup
    window.removeEventListener('resize', this.updateDimensions);
  }

  updateDimensions() {
    this.setState({ windowHeight: window.innerHeight });
  }

  render() {
    const { windowHeight } = this.state;
    const windowWidth = document.body.classList.contains('safari')
      ? document.getElementsByTagName('html')[0].clientWidth
      : window.innerWidth;

    return (
      <div className="page-container">

        {/* Special catch-all header */}
        <Header isCatchAllPage />

        {/* Main section */}
        <main>
          <div
            className={`${windowWidth < 767.5 ? 'h2' : 'h1'} text-center`}
          >
            <div className={styles.text}>
              Sorry! That page could not be found!
            </div>

            {/* Render next-gen image version if browser support exists */}
            <img
              src={
                document.body.classList.contains('webp')
                  ? '../../images/next-gen/catch-all-emoji.webp'
                  : '../../images/standard/catch-all-emoji.png'
              }
              alt="Sorry face"
              className={styles.emoji}
              style={{ maxHeight: windowHeight * 0.52 }}
            />
            <div className={styles.text}>
              Try navigating with the navbar above
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default CatchAll;
