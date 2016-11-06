
//    Sarah's Garden
//    Joshua A. Lemli
//    2016

/*
http://sg-joshualemli886851.codeanyapp.com/index.html
*/

var SG = (function(){

  //  HTML DOM ELEMENTS AND APIS
  var canvas; // canvas element
  var context; // canvas context
  var info; // output messages
  var controls;
  var sg, gameplay;
  var belt, beltMode;
  var backpack, backpackMode;
  var mobiledevice, mobiledeviceMode;

  //  CONSTANTS AND GAME OPTIONS
  var _UID = 0;
  var MM_PER_PIXEL = 10;
  var BIN_DIMENSION = 100;
  var OPTIONS = {
    binds: {
      up:'ArrowUp',
      down:'ArrowDown',
      left:'ArrowLeft',
      right:'ArrowRight',
      mIncrease:'=',
      mDecrease:'-',
    },
    verbose:true
  };

  //  SUB-MODULES
  var Create; // object creation module
  var SpatialHash; // spatial culling module
  var View; // information needed for graphics
  var Input; // handle user keyboard & mouse input

  //  ***  HELPER FUNCTIONS  ***  //
  
  function _CL(msg) {if (OPTIONS.verbose) console.log(msg);}

  function resizeWindow() {
    context.canvas.width = canvas.offsetWidth;
    context.canvas.height = canvas.offsetHeight;
  }

  //  ***  GAME MECHANICS  ***  //

  var objects = {};

  var game = {
    mode: 'gameplay',
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

  function loopByMode() {
    switch(game.mode) {
      case 'gameplay': window.requestAnimationFrame(gameplay); break;
      case 'belt': window.requestAnimationFrame(beltMode); break;
      case 'backpack': window.requestAnimationFrame(backpackMode); break;
      case 'mobiledevice': window.requestAnimationFrame(mobiledeviceMode); break;
      default: return false;
    } return true;
  }

  beltMode = function() {
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    context.fillStyle = '#AAFF00';
    context.fillRect(400,500,100,100);
    loopByMode();
  }
  backpackMode = function() {
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    context.fillStyle = '#FF0000';
    context.fillRect(400,500,100,200);
    loopByMode();
  }
  mobiledeviceMode = function() {
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0,0,context.canvas.width,context.canvas.height);
    context.fillStyle = '#0000FF';
    context.fillRect(400,500,20,100);
    loopByMode();
  }
  gameplay = function(_t) {
    var loopStartTime = performance.now();
    game.iteration += 1;
    game._framecount += 1;
    var dt = _t - game.playtime;
    game.playtime = _t;
    game.date += dt;
    game._framerate += dt;
    //  Input
    //  Gameplay
    for (var uid in objects) objects[uid].step(dt);
    //  Graphics
    context.transform(1,0,0,1,0,0);
    context.fillStyle = '#00FF00';
    context.strokeStyle = '#FF0000';
    context.fillRect(100,100,100,100);
    for (uid in objects) {
      context.beginPath();
      context.arc(objects[uid].x,objects[uid].y,50,0,2*Math.PI);
      context.stroke();
    }
    //  Game clock calculations
    game._loopTime += performance.now() - loopStartTime;
    if (game._framecount === 30) {
      game.framerate = Math.round(game._framecount/game._framerate*1000);
      game.loopTime = (game._loopTime/game._framecount).toFixed(2);
      game._framecount = 0;
      game._framerate = 0;
      game._loopTime = 0;
      var infoMsg = 'world age: ' + game.dateInSeconds() + 's<br>' + game.iteration + ' loops<br>' +
                    game.framerate + 'fps<br>' + game.loopTime + 'ms/loop';
      info.innerHTML = infoMsg;
    }
    loopByMode();
  }
  

  //  ***  MODULES  ***  //
  
  Input = (function(){
    var keyState = {};
    function keyDown(event) {if (!keyState[event.key]) keyState[event.key] = true;}
    function keyUp(event) {if (keyState[event.key]) keyState[event.key] = false;}
    window.addEventListener('keydown',keyDown);
    window.addEventListener('keyup',keyUp);
    return {
      all:function(){return keyState;},
      getKeyState:function(a){return keyState[a];}
    };
  })();

  SpatialHash = (function(){

    var bin = {};

    function hash(a) {return Math.floor(a/BIN_DIMENSION);}
    function retrieve(x,y,radius,maskUID) {
    }
    function insert(X,Y,UID) {
      if (bin[X])
        if (bin[X][Y]) bin[X][Y].push(UID);
        else bin[X][Y] = [UID];
      else {
        bin[X] = {};
        bin[X][Y] = [UID];
      }
    }
    function remove(X,Y,UID) {
      var targetBin = bin[X][Y];
      for (var i = targetBin.length; i--;) if (targetBin[i]===UID) targetBin.splice(i,1);
      if (targetBin.length === 0) delete bin[X][Y];
      if (Object.keys(bin[X]).length === 0) delete bin[X];
    }
    function transfer(xI,yI,xF,yF,UID) {
      var Xi = hash(xI); var Yi = hash(yI);
      var Xf = hash(xF); var Yf = hash(yF);
      if (Xi !== Xf || Yi !== Yf) {
        remove(Xi,Yi,UID);
        insert(Xf,Yf,UID);
      }
    }
  
    return {
      retrieve:retrieve,
      insert:function(x,y,UID) {
        var X = hash(x); var Y = hash(y);
        insert(X,Y,UID);
      },
      remove:function(x,y,UID) {
        var X = hash(x); var Y = hash(y);
      },
      transfer:transfer,
      bin:function(){return bin}
    };

  })(); // end `SpatialHash` module

  Create = (function(){

    function Extend(source) {
      for (var key in source.prototype) this.prototype[key] = source.prototype[key];
      this.prototype.constructor = this;
    }

    var _BasicObject = function() {
      this.radius = 1; // "millimeters"
      this.age = 0; // <int> milliseconds
      this.x = 0;
      this.y = 0;
    };
    _BasicObject.prototype.step = function() {};
    
    var Player = function() {
      _BasicObject.call(this);
      this.level = 1;
      this.radius = 10;
    };
    Extend.call(Player,_BasicObject);

    //  ***  CREATURES  ***  //
    var Creature = {};
    Creature._Creature = function() {_BasicObject.call(this);};
    Extend.call(Creature._Creature,_BasicObject);

    Creature.Dog = function() {
      this.bark = 'woof!';
      this.radius = 5;
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
    Extend.call(Growth._Growth,_BasicObject);

    //  ***  ITEMS  ***  //
    var Item = {};
    Item._Item = function() {_BasicObject.call(this);};
    Extend.call(Item._Item,_BasicObject);

    function make(category,type,x,y) {
      var _object;
      switch(category) {
        case 'Player': _object = new Player(); break;
        case 'Creature': _object = new Creature[type](); break;
        case 'Growth': _object = new Growth[type](); break;
        case 'Item': _object = new Item[type](); break;
      }
      _object.uid =  ++_UID;
      _object.x = x;
      _object.y = y;
      objects[_object.uid] = _object;
      SpatialHash.insert(_object.x,_object.y,_object.uid);
    }

    return {
      player:function(x,y){make('Player',null,x,y);},
      creature:function(a,x,y){make('Creature',a,x,y);},
      growth:function(a,x,y){make('Growth',a,x,y);},
      item:function(a,x,y){make('Item',a,x,y);}
    };

  })(); // end `Create` module

  function init() {
    controls = document.getElementById('controls');
    sg = document.getElementById('sg');
    belt = document.getElementById('belt');
    backpack = document.getElementById('backpack');
    mobiledevice = document.getElementById('mobiledevice');
    info = document.getElementById('info');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.addEventListener('resize',resizeWindow);

    sg.addEventListener('click',function(){game.mode = 'sg';});
    belt.addEventListener('click',function(){game.mode = 'belt';});
    backpack.addEventListener('click',function(){game.mode = 'backpack';});
    mobiledevice.addEventListener('click',function(){game.mode = 'mobiledevice';});

    //  Make fake world for now...
    Create.player(0,0);
    Create.creature('Dog',200,200);

    window.requestAnimationFrame(gameplay);
  }

  return {
    init:init,
    peak: {
      bin:function(){return SpatialHash.bin();},
      Input:Input
    }
  };

})();

window.onload = SG.init;
