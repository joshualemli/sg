
//    Sarah's Garden
//    Joshua A. Lemli
//    2016

var SG = (function(){

  //  HTML DOM ELEMENTS AND APIS

  var canvas; // canvas element
  var context; // canvas context
  var info; // output messages

  //  CONSTANTS AND GAME OPTIONS

  var MM_PER_PIXEL = 10;
  var OPTIONS = {
    verbose:false
  };
  
  //  SUB-MODULES

  var Create; // object creation module

  //  HELPER FUNCTIONS
  
  function _CL(msg) {if (Options.verbose) console.log(msg);}

  function resizeWindow() {
    context.canvas.width = canvas.offsetWidth;
    context.canvas.height = canvas.offsetHeight;
  }

  //  GAME MECHANICS

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
    for (var key in objects) objects[key].step(dt);
    
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

  Create = (function(){

    function Extend(source) {
      for (var key in source.prototype) this.prototype[key] = source.prototype[key];
      this.prototype.constructor = this;
    }

    var _BasicObject = function() {
      this.radius = 1; // "millimeters"
      this.age = 0; // <int> milliseconds
    };
    
    var Player = function() {
      _BasicObject.call(this);
      this.level = 1;
    };

    //  ***  CREATURES  ***  //
    var Creature = {};
    Creature._Creature = function() {_BasicObject.call(this);};
    Extend(Creature._Creature,_BasicObject);

    Creature.Dog = function() {
      this.bark = 'woof!';
    };
    Creature.Dog.prototype.step = function() {
    };
    
    Creature.Labrador = function() {
      Creature.Dog.call(this);
    };
    Extend.call(Creature.Labrador,Creature.Dog);

    //  ***  GROWTHS  ***  //
    var Growth = {};
    Growth._Growth = function() {_BasicObject.call(this);};
    Extend(Growth._Growth,_BasicObject);

    //  ***  ITEMS  ***  //
    var Item = {};
    Item._Item = function() {_BasicObject.call(this);};
    Extend(Item._Item,_BasicObject);

    var _UID = 0;
    function make(category,type) {
      var _object;
      switch(category) {
        case 'Creature': _object = new Creature[type](); break;
        case 'Growth': _object = new Growth[type](); break;
        case 'Item': _object = new Item[type](); break;
      }
      _object.uid =  ++_UID;
      objects[_object.uid] = _object;
    }

    return {
      creature:function(a){make('Creature',a);},
      growth:function(a){make('Growth',a);},
      item:function(a){make('Item',a);}
    };

  })(); // end `Create` module

  function init() {
    info = document.getElementById('info');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.addEventListener('resize',resizeWindow);
    window.requestAnimationFrame(gameplay);
  }

  return {
    init:init,
  };

})();

window.onload = SG.init;
