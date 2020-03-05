import React, { Component } from 'react';
import { connect } from 'react-redux';
import { HeadProvider, Style } from 'react-head';

import { serverErrorsInvisibleBackground } from '../utils';

import ServerErrorsPopup from './server_errors_popup';

class Loader extends Component {
  constructor(props) {
    super(props);

    this.state = {
      animationDisplayedInSafari: false,
      windowHeight: window.innerHeight
    };

    // Bound functions
    this.updateDimensions = this.updateDimensions.bind(this);

    // Event listeners
    window.addEventListener('resize', this.updateDimensions);

    // Store constant value to reflect whether or not the browser is safari
    // (value will be accessed by multiple methods in this component)
    this.browserIsSafari = document.body.classList.contains('safari');
  }

  componentDidMount() {
    // If the browser is safari, display the animation after 1 ms to
    // workaround the safari bug for newly rendered transform animations
    if (this.browserIsSafari) {
      setTimeout(() => {
        this.setState({ animationDisplayedInSafari: true });
      }, 1);
    }
  }

  componentWillUnmount() {
    // Component cleanup
    window.removeEventListener('resize', this.updateDimensions);
  }

  updateDimensions() {
    this.setState({ windowHeight: window.innerHeight });
  }

  renderLoadingAnimation() {
    const {
      animationWidth,
      maxHeight,
      maxWidth,
      relativePosition,
      renderNoLoadingText
    } = this.props;
    const { animationDisplayedInSafari, windowHeight } = this.state;

    // Initial variables' values are for the typical loading animation for a component
    let animationWidthStr = '200px';
    let itemWidth = '100px';
    let translationAmount = '100px';
    let animationMaxDimension = 'initial';
    let itemMaxDimension = 'initial';
    let verticalMargins = `${windowHeight / 2 - 100}px`;
    let textMargin = (windowHeight / 2) - 145;

    // Change the variables' values if an animation width has been specified or
    // no loading text is to be rendered
    if (animationWidth || renderNoLoadingText) {
      verticalMargins = 'auto';

      // Change variables' values if an animation width has been specified
      if (animationWidth) {
        const maxDimension = maxWidth < maxHeight ? maxWidth : maxHeight;
        animationWidthStr = animationWidth;
        itemWidth = '50%';
        translationAmount = '100%';
        animationMaxDimension = maxDimension;
        itemMaxDimension = maxDimension / 2;
      }
    }

    // Make the animation smaller than typical if a typical animation is to be
    // rendered, but the window height is too small
    else if (windowHeight < 285) {
      animationWidthStr = '150px';
      itemWidth = '75px';
      translationAmount = '75px';
      verticalMargins = `${windowHeight / 2 - 75}px`;
      textMargin = (windowHeight / 2) - 120;
    }

    // Render the loading animation
    return (
      <div>

        {/* Internal Styling for quicker load time for loader comp (first component user sees) */}
        <HeadProvider>
          <Style>
            {`
              .item {
                max-width: ${itemMaxDimension};
                max-height: ${itemMaxDimension};
                width: ${itemWidth};
                height: ${itemWidth};
                position: absolute;
              }
              @-webkit-keyframes item-1_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(0, ${translationAmount});transform: translate(0, ${translationAmount})} 
                50% {-webkit-transform: translate(${translationAmount}, ${translationAmount});transform: translate(${translationAmount}, ${translationAmount})} 
                75% {-webkit-transform: translate(${translationAmount}, 0);transform: translate(${translationAmount}, 0)} 
              }
              @keyframes item-1_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(0, ${translationAmount});transform: translate(0, ${translationAmount})} 
                50% {-webkit-transform: translate(${translationAmount}, ${translationAmount});transform: translate(${translationAmount}, ${translationAmount})} 
                75% {-webkit-transform: translate(${translationAmount}, 0);transform: translate(${translationAmount}, 0)} 
              }
              @-webkit-keyframes item-2_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(-${translationAmount}, 0);transform: translate(-${translationAmount}, 0)} 
                50% {-webkit-transform: translate(-${translationAmount}, ${translationAmount});transform: translate(-${translationAmount}, ${translationAmount})} 
                75% {-webkit-transform: translate(0, ${translationAmount});transform: translate(0, ${translationAmount})} 
              }
              @keyframes item-2_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(-${translationAmount}, 0);transform: translate(-${translationAmount}, 0)} 
                50% {-webkit-transform: translate(-${translationAmount}, ${translationAmount});transform: translate(-${translationAmount}, ${translationAmount})} 
                75% {-webkit-transform: translate(0, ${translationAmount});transform: translate(0, ${translationAmount})} 
              }
              @-webkit-keyframes item-3_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(0, -${translationAmount});transform: translate(0, -${translationAmount})} 
                50% {-webkit-transform: translate(-${translationAmount}, -${translationAmount});transform: translate(-${translationAmount}, -${translationAmount})} 
                75% {-webkit-transform: translate(-${translationAmount}, 0);transform: translate(-${translationAmount}, 0)} 
              }
              @keyframes item-3_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(0, -${translationAmount});transform: translate(0, -${translationAmount})} 
                50% {-webkit-transform: translate(-${translationAmount}, -${translationAmount});transform: translate(-${translationAmount}, -${translationAmount})} 
                75% {-webkit-transform: translate(-${translationAmount}, 0);transform: translate(-${translationAmount}, 0)} 
              }
              @-webkit-keyframes item-4_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(${translationAmount}, 0);transform: translate(${translationAmount}, 0)} 
                50% {-webkit-transform: translate(${translationAmount}, -${translationAmount});transform: translate(${translationAmount}, -${translationAmount})} 
                75% {-webkit-transform: translate(0, -${translationAmount});transform: translate(0, -${translationAmount})} 
              }
              @keyframes item-4_move {
                0%, 100% {-webkit-transform: translate(0, 0);transform: translate(0, 0)} 
                25% {-webkit-transform: translate(${translationAmount}, 0);transform: translate(${translationAmount}, 0)} 
                50% {-webkit-transform: translate(${translationAmount}, -${translationAmount});transform: translate(${translationAmount}, -${translationAmount})} 
                75% {-webkit-transform: translate(0, -${translationAmount});transform: translate(0, -${translationAmount})} 
              }
            `}
          </Style>
        </HeadProvider>

        {/* Component Body */}
        <div>

          {/* Render heading text unless otherwise specified by parent component */}
          {
            renderNoLoadingText
              ? null
              : (
                <h3
                  style={
                    {
                      textAlign: 'center',
                      fontFamily: 'Arial, sans-serif',
                      fontWeight: 700,
                      fontSize: '28px',
                      marginTop: textMargin
                    }
                  }
                >
                  Loading...
                </h3>
              )
        }

          {/* Animation body */}
          <div
            style={
              {
                // Safari transform animation bug workaround
                display: this.browserIsSafari
                  && !animationDisplayedInSafari ? 'none' : 'block',

                position: relativePosition ? 'relative' : 'absolute',
                maxHeight: animationMaxDimension,
                maxWidth: animationMaxDimension,
                width: animationWidthStr,
                height: animationWidthStr,
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                margin: `${verticalMargins} auto`
              }
            }
            aria-label="Loading animation"
          >

            {/* First colored square */}
            <div
              className="item"
              style={
                {
                  backgroundColor: '#FA5667',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                  WebkitAnimation: 'item-1_move 1.8s cubic-bezier(.6,.01,.4,1) infinite',
                  animation: 'item-1_move 1.8s cubic-bezier(.6,.01,.4,1) infinite'
                }
              }
            />

            {/* Second colored square */}
            <div
              className="item"
              style={
                {
                  backgroundColor: '#7A45E5',
                  top: 0,
                  right: 0,
                  WebkitAnimation: 'item-2_move 1.8s cubic-bezier(.6,.01,.4,1) infinite',
                  animation: 'item-2_move 1.8s cubic-bezier(.6,.01,.4,1) infinite'
                }
              }
            />

            {/* Third colored square */}
            <div
              className="item"
              style={
                {
                  backgroundColor: '#1B91F7',
                  bottom: 0,
                  right: 0,
                  zIndex: 1,
                  WebkitAnimation: 'item-3_move 1.8s cubic-bezier(.6,.01,.4,1) infinite',
                  animation: 'item-3_move 1.8s cubic-bezier(.6,.01,.4,1) infinite'
                }
              }
            />

            {/* Fourth colored square */}
            <div
              className="item"
              style={
                {
                  backgroundColor: '#FAC24C',
                  bottom: 0,
                  left: 0,
                  WebkitAnimation: 'item-4_move 1.8s cubic-bezier(.6,.01,.4,1) infinite',
                  animation: 'item-4_move 1.8s cubic-bezier(.6,.01,.4,1) infinite'
                }
              }
            />
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { inlineBlockDisplay, serverErrors } = this.props;
    const serverErrorInvisibleBackground = serverErrorsInvisibleBackground(serverErrors);

    return (
      <div style={inlineBlockDisplay ? { display: 'inline-block' } : {}}>

        {/* If there are server errors, render the server errors popup.
        Else render the loading animation. */}
        {
          serverErrors.length !== 0
            ? <ServerErrorsPopup invisibleBackground={serverErrorInvisibleBackground} />
            : this.renderLoadingAnimation()
        }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return { serverErrors: state.serverErrors };
}

export default connect(mapStateToProps)(Loader);
