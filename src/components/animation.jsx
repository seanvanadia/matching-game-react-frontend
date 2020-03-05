import React, { Component } from 'react';

import styles from '../style/animation.css';

class Animation extends Component {
  constructor(props) {
    super(props);

    this.state = {
      animationIsFading: false
    };
  }

  componentDidMount() {
    // Begin fading the animation 625 ms after it is first rendered
    setTimeout(() => {
      this.setState({ animationIsFading: true });
    }, 625);
  }

  render() {
    const { somethingWasDeleted } = this.props;
    const { animationIsFading } = this.state;
    const animationTransitionClassName = animationIsFading ? 'fading-animation' : '';

    // Variables' initial values are for saved animation
    let alertClassNamePortion = 'success';
    let message = 'Saved!';

    // Change values if deleted animation is to be rendered
    if (somethingWasDeleted) {
      alertClassNamePortion = 'danger';
      message = 'Deleted!';
    }

    // Render animation markup
    return (
      // Overlay
      <div className="overlay">

        {/* Animation Pop Up */}
        <div
          className={`
            alert
            alert-${alertClassNamePortion}
            pop-up
            ${styles['animation-popup']}
            ${styles[animationTransitionClassName]}
          `}
          aria-label="Temporary response animation"
        >

          {/* Message Text */}
          <div className="text-center">
            <h1>{message}</h1>
          </div>

        </div>
      </div>
    );
  }
}

export default Animation;
