
//    Sarah's Garden
//    Joshua A. Lemli
//    2016

var SG = (function(){

  //  HTML ELEMENTS & API, ASSOCIATED LOOP FUNCTIONS
  var canvas; // canvas element
  var context; // canvas context element
  var info; // element to output messages
  var controls; // element to contain UI
  var sg; // --> `gameplay`
  var belt;
  var backpack;
  var mobiledevice;
  //  LOOP FUNCTIONS
  var gameplay;
  var beltMode;
  var backpackMode;
  var mobiledeviceMode;
  //  SUB-MODULES
  var game; // game parameters
  var commands; // use input actionables
  var entities; // all dynamic objects in the world
  var Create; // object creation module
  var SpatialHash; // spatial culling module
  var Input; // handle user keyboard & mouse input

  //  CONSTANTS AND GAME OPTIONS
  var _UID = 0; // next UID to be created
  var OPTIONS = {
    verbose:true
  };

  //  ***  HELPER FUNCTIONS  ***  //
  
  function _CL(msg) {if (OPTIONS.verbose) console.log(msg);}

  function rI(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function resizeWindow() {
    context.canvas.width = canvas.offsetWidth;
    context.canvas.height = canvas.offsetHeight;
  }

  //  ***  GAME MECHANICS  ***  //

  entities = {};

  game = {
    viewX:0, // center-point
    viewY:0, // center-point
    viewM:1, // scalar (magnification)
    mode: 'gameplay', // controls loop function via `loopByMode` function
    iteration: 0, // persistent loop counter
    date: 0, // "seconds" (game time)
    currentPlaytime: 0, // milliseconds
    framerate: 0, // last average
    _framerate: 0, // rolling total
    loopTime: 0, // last average
    _loopTime: 0, // rolling total
    _framecount: 0, // frames in `_framerate`
    hoursMinutes: function() {
      var hrs = Math.floor(this.date/60)%24;
      var min = this.date%60;
      return (hrs>=10?hrs:'0'+hrs) + ':' + (min>=10?min:'0'+min);
    },
    days: function() {return Math.floor(this.date/1440%365);},
    years: function() {return Math.floor(this.date/525600);},
    month: function() {
      var mo = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return mo[Math.floor(game.date/263520000)%12];
    },
    season: function() {
      var seas = ['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Autumn','Autumn','Autumn','Winter'];
      return seas[Math.floor(game.date/263520000)%12];
    }
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
  
  commands = {
    up: function() {game.viewY+=1;},
    down: function() {game.viewY-=1;},
    left: function() {game.viewX-=1;},
    right: function() {game.viewX+=1;}
  };

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
    var dt = Math.round((_t - game.currentPlaytime)/17)*3;
    game.currentPlaytime = _t;
    game.date += dt;
    game._framerate += dt;
    //  Input
    var inputs = Input.gameplay();
    for (var command in inputs) if (inputs[command]) commands[command]();
    //  Gameplay
    for (var uid in entities) entities[uid].step(dt);
    //  Graphics
    context.setTransform(1,0,0,1,0,0);
    context.fillStyle = 'rgb(50,35,35)';
    context.fillRect(0,0,context.canvas.width,context.canvas.height);
    context.setTransform(1,0,0,-1,context.canvas.width/2-game.viewX,context.canvas.height/2+game.viewY);
    context.fillStyle = '#00FF00';
    context.strokeStyle = '#FF0000';
    var _bin = SpatialHash.bin();
    var _spatialCellSize = SpatialHash.cellSize();
    for (var _X in _bin) {
      for (var _Y in _bin[_X]) {
        context.strokeRect(_X*_spatialCellSize,_Y*_spatialCellSize,_spatialCellSize,_spatialCellSize);
      }
    }
    for (uid in entities) {
      var target = entities[uid];
      if (1){ //is in view?
        context.beginPath();
        context.arc(target.x,target.y,target.radius,0,2*Math.PI);
        context.fill();
      }
    }
    //  Game clock calculations
    game._loopTime += performance.now() - loopStartTime;
    if (game._framecount%3 === 0) {
      game.framerate = Math.round(game._framecount/game._framerate*1000);
      game.loopTime = (game._loopTime/game._framecount).toFixed(2);
      game._framecount = 0;
      game._framerate = 0;
      game._loopTime = 0;
      var infoMsg = game.years() + 'y ' + game.days() + 'd ' + game.hoursMinutes() + '<br>' +
                    game.month() + ' - ' + game.season() + '<br>' +
                    '`dt`: ' + dt + '<br>' +
                    game.iteration + ' loops<br>' +
                    game.framerate + 'fps<br>' + game.loopTime + 'ms/loop';
      info.innerHTML = infoMsg;
    }
    loopByMode();
  }

  //  ***  MODULES  ***  //

  Input = (function(){
    var keyState = {};
    var clickData = {};
    function keyDown(event) {if (!keyState[event.key]) keyState[event.key] = true;}
    function keyUp(event) {if (keyState[event.key]) keyState[event.key] = false;}
    function registerClick(event) {
      clickData.x = event.clientX;
      clickData.y = event.clientY;
    }
    function getClick(clearData) {
      if (clearData) {
        //return {x:_x,y:_y};
      }
      return {x:clickData.x,y:clickData.y}
    }
    window.addEventListener('keydown',keyDown);
    window.addEventListener('keyup',keyUp);
    window.addEventListener('click',registerClick);
    var binds = {
      up:'ArrowUp',
      down:'ArrowDown',
      left:'ArrowLeft',
      right:'ArrowRight',
      magIncrease:'=',
      magDecrease:'-'
    }; (function(){for (var i in binds) keyState[binds[i]]=false;})(); // make bind keys in `keyState`
    function getGameplayRelated() {
      var inputs = {};
      for (var i in binds) {
        inputs[i] = keyState[binds[i]];
      }
      return inputs;
    }
    return {
      all:function(){return keyState;},
      getKeyState:function(a){return keyState[a];},
      getClick:getClick,
      gameplay:getGameplayRelated
    };
  })();

  SpatialHash = (function(){
    var bin = {};
    var CELL_SIZE = 100;
    function hash(a) {return Math.floor(a/CELL_SIZE);}
    function retrieve(x,y,maskUID) {
      var X = hash(x); var Y = hash(y);
      var XLook = x%CELL_SIZE > CELL_SIZE/2 ? X+1 : X-1;
      var YLook = y%CELL_SIZE > CELL_SIZE/2 ? Y+1 : Y-1;
      var selectedUIDs = bin[X][Y].slice();
      if (bin[X][YLook]) bin[X][YLook].forEach(function(uid){selectedUIDs.push(uid);});
      if (bin[XLook]) {
        if (bin[XLook][YLook]) bin[XLook][YLook].forEach(function(uid){selectedUIDs.push(uid);});
        if (bin[XLook][Y]) bin[XLook][Y].forEach(function(uid){selectedUIDs.push(uid);});
      }
      if (maskUID) selectedUIDs.splice(selectedUIDs.indexOf(maskUID),1);
      return selectedUIDs;
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
      insert:function(x,y,UID) {insert(hash(x),hash(y),UID);},
      remove:function(x,y,UID) {remove(hash(x),hash(y),UID);},
      transfer:transfer,
      bin:function(){return bin;},
      cellSize:function(){return CELL_SIZE;},
    };
  })(); // end `SpatialHash` module

  Create = (function(){

    function Extend(source) {
      for (var key in source.prototype) this.prototype[key] = source.prototype[key];
      this.prototype.constructor = this;
    }

    var _BasicEntity = function() {
      this.radius = 1;
      this.age = 0; // <int> milliseconds
      this.x = 0;
      this.y = 0;
    };
    _BasicEntity.prototype.step = function() {};

    //  ***  PLAYER  ***  //

    var Player = function() {
      _BasicEntity.call(this);
      this.level = 1;
      this.radius = 10;
      this.items = [];
    };
    Extend.call(Player,_BasicEntity);
    Player.prototype.step = function() {
      var neighbors = SpatialHash.retrieve(this.x,this.y,this.uid);
    }

    //  ***  CREATURES  ***  //

    var Creature = {};
    //  Top-level creature pseudo-class
    Creature._Creature = function() {_BasicEntity.call(this);};
    Extend.call(Creature._Creature,_BasicEntity);

    //  Dogs
    
    Creature.Dog = function() {
      Creature._Creature.call(this);
      this.bark = 'woof!';
      this.radius = 5;
    };
    Extend.call(Creature.Dog,Creature._Creature);

    Creature.Labrador = function() {
      Creature.Dog.call(this);
    };
    Extend.call(Creature.Labrador,Creature.Dog);
    
    Creature.Mutt = function(){};
    
    //  Horses
    
    //  Llamas
    
    //  Cows
    
    //  Chickens
    
    //  Cats
    
    //  Rabbits
    
    //  Mice

    //  ***  GROWTHS  ***  //

    var Growth = {};
    Growth._Growth = function() {
      _BasicEntity.call(this);
      this.maxRadius = 1;
      this.growthRate = 1e-4;
    };
    Extend.call(Growth._Growth,_BasicEntity);
    Growth._Growth.prototype.step = function() {
      if (this.radius < this.maxRadius) this.radius += this.growthRate;
    };
    
    Growth.Parsley = function() {
      Growth._Growth.call(this);
      this.maxRadius = 4;
      this.value = 1;
    };
    Extend.call(Growth.Parsley,Growth._Growth);

    //  ***  ITEMS  ***  //

    var Item = {};
    Item._Item = function() {_BasicEntity.call(this);};
    Extend.call(Item._Item,_BasicEntity);

    function transmogrifyUID(n,exp) {
      exp = exp || 0;
      var _value = Math.pow(52,exp);
      var R = n % (_value*52);
      var char = R/_value;
      if (char === 52) char = 97;
      else if (char < 26) char = 97 + char;
      else char = 39 + char;
      var str = String.fromCharCode(char);
      if (n > _value*52-1) str = (transmogrifyUID(n-(R||_value-1),exp+1)) + str;
      return str;
    }

    function make(category,type,x,y) {
      var _enitity;
      switch(category) {
        case 'Player': _enitity = new Player(); break;
        case 'Creature': _enitity = new Creature[type](); break;
        case 'Growth': _enitity = new Growth[type](); break;
        case 'Item': _enitity = new Item[type](); break;
      }
      _enitity.uid = transmogrifyUID(_UID);
      _UID += 1;
      _enitity.x = x;
      _enitity.y = y;
      entities[_enitity.uid] = _enitity;
      SpatialHash.insert(_enitity.x,_enitity.y,_enitity.uid);
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

    sg.addEventListener('click',function(){game.mode = 'gameplay';});
    belt.addEventListener('click',function(){game.mode = 'belt';});
    backpack.addEventListener('click',function(){game.mode = 'backpack';});
    mobiledevice.addEventListener('click',function(){game.mode = 'mobiledevice';});

    //  Make fake world for now...
    Create.player(10,20);
    Create.creature('Dog',220,250);
    Create.creature('Dog',-100,250);
    Create.creature('Dog',-290,-117);

    window.requestAnimationFrame(gameplay);
  }

  return {
    init:init,
  };

})();

window.onload = SG.init;

/*

mobiledevice (upgrades affect: dilator range, sleep range, dog collar?)
-------------
^ time dilator
v [*****....]
!sleep! (x) months (y) years

options

save
load
exit

*/
