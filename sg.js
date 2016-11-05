
//    Sarah's Garden
//    Joshua A. Lemli
//    2016

var SG = (function(){

  var canvas;
  var context;
  var info; // output messages
  var Create; // object creation module

  function resizeWindow() {
    context.canvas.width = canvas.offsetWidth;
    context.canvas.height = canvas.offsetHeight;
  }

  var objects = {};

  var game = {
    iteration: 0, // persistent loop counter
    date: 0, // milliseconds
    playtime: 0, // milliseconds
    dateInSeconds: function(){return Math.round(this.date/1000);},
    framerate: 0, // last average
    _framerate: 0, // rolling total
    loopTime: 0, // last average
    _loopTime: 0, // rolling total
    _framecount: 0, // frames in `_framerate`
  };

  function gameplay(_t) {
    var loopStartTime = performance.now();
    game.iteration += 1;
    game._framecount += 1;
    var dt = _t - game.playtime;
    game.playtime = _t;
    game.date += dt;
    game._framerate += dt;

    //  Gameplay
    
    
    //  Graphics
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    context.fillStyle = '#00FF00';
    context.fillRect(100,100,100,100);

    //  Game clock calculations
    game._loopTime += performance.now() - loopStartTime;
    if (game._framecount === 30) {
      game.framerate = Math.round(game._framecount/game._framerate*1000);
      game.loopTime = (game._loopTime/game._framecount).toFixed(2);
      game._framecount = 0;
      game._framerate = 0;
      game._loopTime = 0;
      var infoMsg = 'world age: ' + game.dateInSeconds() + 's<br>' + game.iteration + ' loops<br>' + game.framerate + 'fps<br>' + game.loopTime + 'ms/loop';
      info.innerHTML = infoMsg;
    }

    window.requestAnimationFrame(gameplay);
  }

  function init() {
    info = document.getElementById('info');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.requestAnimationFrame(gameplay);
  }

  Create = (function(){
    var Creature = {};
    var Growth = {};
    var Item = {};
    return {
      creature:function(a){return new Creature[a]();},
      growth:function(a){return new Growth[a]();},
      item:function(a){return new Item[a]();},
    };
  })();

  return {
    init:init,
    resizeWindow:resizeWindow
  };

})();

window.onload = SG.init;
window.addEventListener('resize',SG.resizeWindow);
