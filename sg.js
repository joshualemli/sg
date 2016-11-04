
var SG = (function(){

  function init() {
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
  }

  return {
    init:init
  };

})();

window.onload = SG.init;