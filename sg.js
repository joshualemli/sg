
//    Sarah's Garden
//    Joshua A. Lemli
//    2016

var SG = (function(){

  var canvas;
  var context;
  var info; // output messages
  var Make; // object creation module

  function resizeWindow() {
    context.canvas.width = canvas.offsetWidth;
    context.canvas.height = canvas.offsetHeight;
  }

  var objects = {};

  var game = {
    iteration: 0, // persistent loop counter
    date: 0, // milliseconds
    playtime: 0, // milliseconds
    formatDate: function(){return this.date/1000+'s';},
    framerate: 0, // last average
    _framerate: 0, // rolling total
    _framecount: 0, // frames in `_framerate`
  };

  function gameplay(_t) {
    game.iteration += 1;
    var dt = _t - game.playtime;
    game.playtime = _t;
    game.date += dt;
    if (game._framecount < 60) {
      game._framecount += 1;
      game._framerate += dt;
    }
    else {
      game.framerate = parseInt(game._framerate/game._framecount);
      game._framecount = 0;
      game._framerate = 0;
    }
    game._framecoun
    var msg = game.date + 's<br>i: ' + game.iteration + '<br>framerate: ' + game.framerate;
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    context.fillStyle = '#00FF00';
    context.fillRect(100,100,100,100);

    window.requestAnimationFrame(gameplay);
  }

  function init() {
    info = document.getElementById('info');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.requestAnimationFrame(gameplay);
  }

  return {
    init:init,
    resizeWindow:resizeWindow
  };

})();

window.onload = SG.init;
window.addEventListener('resize',SG.resizeWindow);
