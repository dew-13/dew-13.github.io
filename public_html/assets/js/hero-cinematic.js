/* ==========================================================================
   hero-cinematic.js  —  playback for the keyed video hero
   --------------------------------------------------------------------------
   The key and the approach animation are both pure CSS (hero-cinematic.css).
   This file only handles what CSS cannot: getting autoplay to start, backing
   off when the user or the connection asks, and not decoding video that has
   scrolled out of sight.

   Deliberately dependency-free and ES5, so it does not care that jQuery
   loads ahead of it.
   ========================================================================== */

(function () {
    'use strict';

    var header = document.querySelector('.header');
    if (!header) { return; }

    var video = header.querySelector('.hero-subject .hero-video');
    if (!video) { return; }

    /* frame held when motion is suppressed; any frame does, since the clip is
       a static hold, but 1.2s is safely past the opening keyframe */
    var HELD_FRAME_S = 1.2;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var saveData = !!(conn && conn.saveData);

    var onScreen = true;

    function shouldPlay() {
        return !reduceMotion.matches && !saveData && onScreen;
    }

    function play() {
        var p = video.play();
        /* autoplay can be refused even when muted. The current frame stays on
           screen and the CSS key still composites it, so a refusal degrades to
           a still cutout rather than to a hole in the layout. */
        if (p && typeof p.catch === 'function') { p.catch(function () {}); }
    }

    function holdStill() {
        /* seek before pausing: pausing at 0 renders nothing in some browsers */
        if (video.currentTime < 0.05) { video.currentTime = HELD_FRAME_S; }
        video.pause();
    }

    function apply() {
        if (shouldPlay()) { play(); } else { holdStill(); }
    }

    /* the attribute alone is not always enough for autoplay to be allowed */
    video.muted = true;
    video.setAttribute('muted', '');

    function onReady() {
        header.classList.add('hero--loaded');
        apply();
    }

    if (video.readyState >= 3) {
        onReady();
    } else {
        video.addEventListener('canplay', onReady, { once: true });
        /* a decode failure must not leave the entrance animations gated */
        video.addEventListener('error', onReady, { once: true });
    }

    /* Safari below 14 only has the deprecated form */
    function listen(mq, fn) {
        if (mq.addEventListener) { mq.addEventListener('change', fn); }
        else if (mq.addListener) { mq.addListener(fn); }
    }

    listen(reduceMotion, apply);

    /* decoding video that nobody is looking at is the easy win here */
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                onScreen = entry.isIntersecting;
                apply();
            });
        }, { threshold: 0.01 }).observe(header);
    }
}());
