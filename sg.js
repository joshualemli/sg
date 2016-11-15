
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
      return mo[Math.floor(game.date/43920)%12];
    },
    season: function() {
      var seas = ['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Autumn','Autumn','Autumn','Winter'];
      return seas[Math.floor(game.date/43920)%12];
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
    up: function() {game.viewY += 10/game.viewM;},
    down: function() {game.viewY -= 10/game.viewM;},
    left: function() {game.viewX -= 10/game.viewM;},
    right: function() {game.viewX += 10/game.viewM;},
    magIncrease: function() {game.viewM = (game.viewM*1.01).toFixed(4);},
    magDecrease: function() {game.viewM = (game.viewM*0.99).toFixed(4);}
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
    context.setTransform( game.viewM,0,0,-game.viewM,
                          context.canvas.width/2 - game.viewX*game.viewM,
                          context.canvas.height/2 + game.viewY*game.viewM );
    for (uid in entities) {
      var target = entities[uid];
      if (1){ //is in view?
        if (target.color) context.fillStyle = target.color;
        else context.fillStyle = 'rgb(0,255,0)';
        context.beginPath();
        context.arc(target.x,target.y,target.radius,0,2*Math.PI);
        context.fill();
      }
    }
    /*
    var _bin = SpatialHash.bin();
    var _spatialCellSize = SpatialHash.cellSize();
    context.fillStyle = '#0000FF';
    context.strokeStyle = '#FF0000';
    for (var _X in _bin) {
      for (var _Y in _bin[_X]) {
        context.strokeRect(_X*_spatialCellSize,_Y*_spatialCellSize,_spatialCellSize,_spatialCellSize);
        _bin[_X][_Y].forEach(function(_uid) {
          context.fillRect(entities[_uid].x,entities[_uid].y,3,3);
        });
      }
    }
    */
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
                    game.framerate + 'fps<br>' + game.loopTime + 'ms/loop' +
                    '<br>' + game.viewX + ' x , ' + game.viewY + ' y, ' + game.viewM + ' mag';
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
    function mouseToWorldXY(e) {
      var wx = game.viewX + ((e.clientX - context.canvas.width/2)/game.viewM);
      var wy = game.viewY - ((e.clientY - context.canvas.height/2)/game.viewM);
      return [wx,wy];
    }
    return {
      all:function(){return keyState;},
      getKeyState:function(a){return keyState[a];},
      getClick:getClick,
      gameplay:getGameplayRelated,
      mouseToXY:mouseToWorldXY
    };
  })();

  SpatialHash = (function(){
    var bin = {};
    var CELL_SIZE = 100;
    function hash(a) {return Math.floor(a/CELL_SIZE);}
    function retrieve(x,y,maskUID) {
      var X = hash(x); var Y = hash(y);
      var XLook = (x < 0 ? CELL_SIZE+x%CELL_SIZE : x%CELL_SIZE) > CELL_SIZE/2 ? X+1 : X-1;
      var YLook = (y < 0 ? CELL_SIZE+y%CELL_SIZE : y%CELL_SIZE) > CELL_SIZE/2 ? Y+1 : Y-1;
      var selectedUIDs = [];
      if (bin[X]) {
        if (bin[X][Y]) selectedUIDs = bin[X][Y].slice();
        if (bin[X][YLook]) bin[X][YLook].forEach(function(uid){selectedUIDs.push(uid);});
      }
      if (bin[XLook]) {
        if (bin[XLook][YLook]) bin[XLook][YLook].forEach(function(uid){selectedUIDs.push(uid);});
        if (bin[XLook][Y]) bin[XLook][Y].forEach(function(uid){selectedUIDs.push(uid);});
      }
      if (maskUID) selectedUIDs.splice(selectedUIDs.indexOf(maskUID),1);
      if (!maskUID) ;
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
    Creature.Dog.prototype.step = function() {
      this.radius -= 0.005;
      var xi = this.x;
      var yi = this.y;
      this.x += rI(-5,5)/10;
      this.y += rI(-5,5)/10;
      SpatialHash.transfer(xi,yi,this.x,this.y,this.uid);
      var neighbors = SpatialHash.retrieve(this.x,this.y,this.uid);
      if (neighbors.length) {
        for (var i = neighbors.length; i--;) {
          var neighbor = entities[neighbors[i]];
          var dD = Math.sqrt((neighbor.x-this.x)*(neighbor.x-this.x)+(neighbor.y-this.y)*(neighbor.y-this.y));
          if (dD < this.radius+neighbor.radius) {
            this.color='rgb(255,0,0)';
            this.radius += 0.01;
            i = 0;
          }
          else {
            this.color='rgb(0,255,0)';
          }
        }
      }
      if (this.radius < 0.5) {
        SpatialHash.remove(this.x,this.y,this.uid);
        delete entities[this.uid];
      }
    };

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
      var _entity;
      switch(category) {
        case 'Player': _entity = new Player(); break;
        case 'Creature': _entity = new Creature[type](); break;
        case 'Growth': _entity = new Growth[type](); break;
        case 'Item': _entity = new Item[type](); break;
        default: return null;
      }
      _entity.uid = transmogrifyUID(_UID);
      _UID += 1;
      _entity.x = x;
      _entity.y = y;
      entities[_entity.uid] = _entity;
      SpatialHash.insert(_entity.x,_entity.y,_entity.uid);
      return _entity;
    }

    return {
      player:function(x,y){return make('Player',null,x,y);},
      creature:function(a,x,y){return make('Creature',a,x,y);},
      growth:function(a,x,y){return make('Growth',a,x,y);},
      item:function(a,x,y){return make('Item',a,x,y);}
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
    Create.player(0,0);
    for (var _i_1 = 250; _i_1--;) Create.creature('Dog',rI(-450,450),rI(-300,300));

      //DEBUG
    
    window.addEventListener('mousemove',function(e){
      var xy = Input.mouseToXY(e);
      var _uidArray = SpatialHash.retrieve(xy[0],xy[1]);
      info.innerHTML = e.clientX+'x '+e.clientY+'y --> '+xy[0]+' '+xy[1]+' => '+_uidArray;
    });
    
    
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
