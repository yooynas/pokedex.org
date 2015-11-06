// animate between the list view and the detail view, using FLIP animations
// https://aerotwist.com/blog/flip-your-animations/

var $ = document.querySelector.bind(document);

// elements
var detailView;
var detailViewContainer;
var detailPanel;
var headerAppBar;
var monstersList;
var detailSprite;
var detailBackButton;
var spriteFacade;
var themeMeta;
var appTheme;

var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;

var dimensToSpriteRect = {};
var runningAnimationPartOne = false;
var queuedAnimation = false;

function getScrollTop() {
  // browsers seem to disagree on this
  return document.body.scrollTop || document.documentElement.scrollTop;
}

function computeBackgroundTransforms(nationalId, outAnimation) {
  console.time('computeBackgroundTransforms()');

  var sourceSprite = monstersList.querySelector(`.sprite-${nationalId}`);
  var sourceTitleSpan = sourceSprite.parentElement.querySelector('span');

  var sourceSpriteRect = sourceSprite.getBoundingClientRect();
  var detailSpriteRect = getDetailSpriteRect();
  var spanStyle = getComputedStyle(sourceTitleSpan);
  var sourceTitleSpanHeight = parseInt(spanStyle.height.replace('px', ''));

  var spriteChangeX = sourceSpriteRect.left - detailSpriteRect.left;
  var spriteChangeY = sourceSpriteRect.top - detailSpriteRect.top;

  var scaleX = sourceSpriteRect.width / screenWidth;
  var scaleY = (sourceSpriteRect.height - sourceTitleSpanHeight) / screenHeight;
  var toX = sourceSpriteRect.left;
  var toY = sourceSpriteRect.top;

  var bgTransform = `translate(${toX}px,${toY}px) scale(${scaleX},${scaleY})`;
  var spriteTransform = `translate(${spriteChangeX}px, ${spriteChangeY}px)`;

  console.timeEnd('computeBackgroundTransforms()');

  return {
    bgTransform,
    spriteTransform,
    spriteTop: detailSpriteRect.top + getScrollTop(),
    spriteLeft: detailSpriteRect.left
  };
}

function computePanelTransforms(nationalId, outAnimation) {
  console.time('computePanelTransforms()');

  // reeeaaally fling it away when animating out. looks better
  var slideInY = outAnimation ? screenHeight * 1.1 : screenHeight * 0.6;

  var fgTransform = `translateY(${slideInY}px)`;

  console.timeEnd('computePanelTransforms()');

  return {
    fgTransform
  };
}

function createSpriteFacade() {
  spriteFacade = document.createElement('div');
  spriteFacade.classList.add('monster-sprite');
  spriteFacade.classList.add('monster-sprite-facade');
  spriteFacade.classList.add('hidden');
  spriteFacade.style.top = `0px`;
  spriteFacade.style.left = `0px`;
  document.body.appendChild(spriteFacade);
  return spriteFacade;
}

function styleSpriteFacade(nationalId, top, left, transform) {
  for (var i = 0; i < spriteFacade.classList.length; i++) {
    var className = spriteFacade.classList[i];
    if (/^sprite-/.test(className)) {
      spriteFacade.classList.remove(className);
      break;
    }
  }
  spriteFacade.classList.add(`sprite-${nationalId}`);
  spriteFacade.style.top = `${top}px`;
  spriteFacade.style.left = `${left}px`;
  spriteFacade.style.transform = transform;
  return spriteFacade;
}

function doInAnimationPartOne(nationalId) {
  document.body.style.overflowY = 'hidden'; // disable scrolling
  detailViewContainer.classList.remove('hidden');
  var transforms = computeBackgroundTransforms(nationalId, false);
  var {bgTransform, spriteTransform, spriteTop, spriteLeft} = transforms;
  var targetBackground = detailView.querySelector('.detail-view-bg');
  var sourceSprite = monstersList.querySelector(`.sprite-${nationalId}`);
  targetBackground.style.background = sourceSprite.parentElement.style.background;
  var spriteFacade = styleSpriteFacade(nationalId, spriteTop, spriteLeft, spriteTransform);
  spriteFacade.classList.remove('hidden');
  detailBackButton.classList.remove('animating');
  detailBackButton.style.opacity = 0;
  targetBackground.style.transform = bgTransform;

  requestAnimationFrame(() => {
    // go go go!
    targetBackground.classList.add('animating');
    spriteFacade.classList.add('animating');
    targetBackground.style.transform = '';
    spriteFacade.style.transform = '';
  });

  function onAnimEnd() {
    console.log('done animating');
    targetBackground.classList.remove('animating');
    spriteFacade.classList.remove('animating');
    targetBackground.removeEventListener('transitionend', onAnimEnd);

    if (queuedAnimation) {
      queuedAnimation();
      queuedAnimation = null;
    }
    runningAnimationPartOne = false;
  }

  targetBackground.addEventListener('transitionend', onAnimEnd);

  detailPanel.classList.add('hidden');
}

function doInAnimationPartTwo(nationalId, themeColor) {
  detailPanel.style.overflowY = 'auto'; // re-enable overflow on the panel
  document.body.style.overflowY = 'hidden'; // disable scrolling

  detailPanel.classList.remove('hidden');
  detailSprite.style.opacity = 0;
  var {fgTransform} = computePanelTransforms(nationalId, false);

  detailPanel.style.transform = fgTransform;

  requestAnimationFrame(() => {
    // go go go!
    detailPanel.classList.add('animating');
    detailPanel.style.transform = '';
  });

  function onAnimEnd() {
    console.log('done animating part two');
    detailPanel.classList.remove('animating');
    themeMeta.content = themeColor;

    spriteFacade.classList.add('hidden');

    detailBackButton.classList.add('animating');
    detailBackButton.style.opacity = 1;
    detailSprite.style.opacity = 1;
    // this peeks out on android, looks less weird with the right color
    headerAppBar.style.backgroundColor = themeColor;

    detailPanel.removeEventListener('transitionend', onAnimEnd);
  }

  detailPanel.addEventListener('transitionend', onAnimEnd);
}

function doOutAnimation(nationalId) {
  detailPanel.scrollTop = 0; // scroll panel to top, disable scrolling during animation
  detailPanel.style.overflowY = 'visible';
  document.body.style.overflowY = 'visible'; // re-enable scrolling
  headerAppBar.style.backgroundColor = appTheme;
  var {bgTransform, spriteTransform, spriteTop, spriteLeft} =
    computeBackgroundTransforms(nationalId, true);
  var {fgTransform} = computePanelTransforms(nationalId, true);

  var targetBackground = detailView.querySelector('.detail-view-bg');
  var detailSprite = detailView.querySelector('.detail-sprite');
  var spriteFacade = styleSpriteFacade(nationalId, spriteTop, spriteLeft, '');
  spriteFacade.classList.remove('hidden');
  detailSprite.style.opacity = 0;
  targetBackground.style.transform = '';
  detailPanel.style.transform = '';
  detailBackButton.classList.add('animating');
  detailBackButton.style.opacity = 0;


  requestAnimationFrame(() => {
    // go go go!
    detailPanel.classList.add('animating');
    targetBackground.classList.add('animating');
    spriteFacade.classList.add('animating');
    spriteFacade.style.transform = spriteTransform;
    targetBackground.style.transform = bgTransform;
    detailPanel.style.transform = fgTransform;
  });

  function onAnimEnd() {
    console.log('done animating part one');
    detailPanel.classList.remove('animating');
    targetBackground.classList.remove('animating');
    spriteFacade.classList.remove('animating');
    targetBackground.style.transform = '';
    detailPanel.style.transform = '';
    detailViewContainer.classList.add('hidden');
    spriteFacade.classList.add('hidden');
    detailSprite.style.opacity = 1;
    themeMeta.content = appTheme;
    targetBackground.removeEventListener('transitionend', onAnimEnd);
  }

  targetBackground.addEventListener('transitionend', onAnimEnd);
}

function init() {
  detailView = $('#detail-view');
  detailViewContainer = $('#detail-view-container');
  monstersList = $('#monsters-list');
  detailPanel = $('.detail-panel');
  headerAppBar = $('.mui-appbar');
  detailSprite = detailView.querySelector('.detail-sprite');
  detailBackButton = detailView.querySelector('.detail-back-button');
  themeMeta = document.head.querySelector('meta[name="theme-color"]');
  spriteFacade = createSpriteFacade();
  appTheme = themeMeta.content;
}

function onResize() {
  // these are expensive to compute, so only compute when the window is resized
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
}

function getCachedDetailSpriteRect() {
  var dimens = screenWidth + '_' + screenHeight;
  return dimensToSpriteRect[dimens];
}

function getDetailSpriteRect() {
  // the size/location of the target sprite is fixed given the window size,
  // so we can just cache it and avoid the expensive getBoundingClientRect()
  var result = getCachedDetailSpriteRect();
  if (result) {
    return result;
  }
  var dimens = screenWidth + '_' + screenHeight;
  result = dimensToSpriteRect[dimens] = detailSprite.getBoundingClientRect();
  return result;
}

document.addEventListener('DOMContentLoaded', init);

window.addEventListener('resize', onResize);

function animateInPartOne(nationalId) {
  runningAnimationPartOne = true;
  // artificial delay to let the material animation play
  setTimeout(() => {
    requestAnimationFrame(() => doInAnimationPartOne(nationalId));
  }, 20);
}

function animateInPartTwo(nationalId, themeColor) {
  var runPartTwoAnimation = () => {
    requestAnimationFrame(() => doInAnimationPartTwo(nationalId, themeColor));
  };
  if (runningAnimationPartOne) {
    console.log('waiting for part one animation to finish');
    queuedAnimation = runPartTwoAnimation;
  } else {
    console.log('running part two animation immediately');
    runPartTwoAnimation();
  }
}

function animateOut(nationalId, themeColor) {
  requestAnimationFrame(() => doOutAnimation(nationalId, themeColor));
}

module.exports = {
  animateInPartOne,
  animateInPartTwo,
  animateOut
};