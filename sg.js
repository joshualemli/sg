
//    Sarah's Garden
//    Joshua A. Lemli
//    2016

var SG = (function(){

  var canvas;
  var context;
  var debug;//for printing msg to html dom element
  
  function resizeWindow() {
    context.canvas.width = canvas.offsetWidth;
    context.canvas.height = canvas.offsetHeight;
    console.log(context.canvas.height);
  }
  
  var gamedata = {
    
  };
  var iteration = 0;
  
  function gameplay() {
    iteration += 1;
    debug.innerHTML = iteration;
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    
    context.fillStyle = '#00FF00';
    context.fillRect(100,100,100,100);
    
    window.requestAnimationFrame(gameplay);
  }

  function init() {
    debug = document.getElementById('debug');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.requestAnimationFrame(gameplay);
  }

  return {
    init:init
  };

})();

window.onload = SG.init;