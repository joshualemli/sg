
//    Sarah's Garden v4.0.0
//    Joshua A. Lemli
//    2016

"use strict";

var SG = (function(){

  //  HTML ELEMENTS & API
  var canvas; // canvas element
  var context; // canvas context element
  var info; // element to output game messages
  var debug; // element to output debug messages
  var controls; // element to contain UI
  var selectGameplay;
  var selectBelt;
  var selectBackpack;
  var selectMobiledevice;
  var selectStore;
  var selectAction;
  var selectItem;
  var belt;
  var backpack;
  var mobiledevice;
  var store;
  var actions;
  var items;
  var beltElements = {};
  var backpackElements = {};
  var mobiledeviceElements = {};
  var storeElements = {};
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
  var DOM; // manipulate DOM

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
    _playerUID: null, // player entity uid
    mode: 'gameplay', // controls loop function via `loopByMode` function
    clickMode: 'plant', // controls click action
    paused: false,
    iteration: 0, // persistent loop counter
    date: 0, // "minutes" (game time), 1min/17ms
    timeFactor: 1, // minutes (game time) per loop
    _currentElapsed_t: 0, // milliseconds (internal)
    framerate: 0, // last average
    _framerate: 0, // rolling total (internal)
    loopTime: 0, // last average
    _loopTime: 0, // rolling total (internal)
    _framecount: 0, // frames in `_framerate`
    hoursMinutes: function() {
      var hrs = Math.floor(this.date/60)%24;
      var min = Math.floor(this.date%60);
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
    magDecrease: function() {game.viewM = (game.viewM*0.99).toFixed(4);},
    plant: function(p) {
      entities[game.playerUID].queue.push({x:p.x,y:p.y,type:'plant',item:'Parsley'});
    }
  };

  function hideAllEquipment() {
    [belt,backpack,mobiledevice,store,actions,items].forEach(function(item) {
      if (!item.classList.contains('hide')) item.classList.add('hide');
    });
  }
  function buildActions() {
  }
  function buildItems() {
    DOM.empty(items);
    var _items = entities[game.playerUID].items;
    _items.forEach(function(item) {
      DOM.build('div',items,item.name,null,null);
    });
  }

  beltMode = function() {
  };
  backpackMode = function() {
  };
  mobiledeviceMode = function() {
    var player = entities[game.playerUID];
    mobiledeviceElements.clock.innerHTML = game.years()+'y '+game.days()+'d '+game.hoursMinutes();
  };
  gameplay = function(_t) {
    //  Time
    var loopStartTime = performance.now();
    var dt = Math.round(_t - game._currentElapsed_t);
    var dtGM = (game.timeFactor * dt/16.67); // time change in "Game Minutes"
    if (dtGM > 6) dtGM = 6; // hard limit to avoid irregular behavior
    game.date += dtGM;
    game._currentElapsed_t = _t;
    game._framerate += dt;
    game.iteration += 1;
    game._framecount += 1;
    //  Input
    var inputs = Input.gameplay();
    for (var command in inputs) if (inputs[command]) commands[command]();
    var click = Input.getClick(true);
    if (click) commands[game.clickMode](click);
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
    //  Draw player queue
    if (entities[game.playerUID].queue.length) {
      var _qLastX=0,_qLastY=0;
      context.strokeStyle = 'rgba(0,255,255,0.5)';
      context.lineWidth = 2;
      context.fillStyle = 'rgba(0,255,0,0.5)';
      entities[game.playerUID].queue.forEach(function(item,i){
        context.fillRect(item.x-2,item.y-2,5,5);
        context.beginPath();
        if (i === 0) context.moveTo(entities[game.playerUID].x,entities[game.playerUID].y);
        else context.moveTo(_qLastX,_qLastY);
        context.lineTo(item.x,item.y);
        context.stroke();
        _qLastX = item.x;
        _qLastY = item.y;
      });
    }
    /* draw spatial hash bins
    var _bin = SpatialHash.bin();
    var _spatialCellSize = SpatialHash.cellSize();
    context.fillStyle = '#0000FF';
    context.strokeStyle = '#FF0000';
    for (var _X in _bin) {
      for (var _Y in _bin[_X]) {
        context.strokeRect(_X*_spatialCellSize,_Y*_spatialCellSize,_spatialCellSize,_spatialCellSize);
      }
    }
    */
    //  Game clock calculations
    game._loopTime += performance.now() - loopStartTime;
    if (game._framecount%6 === 0) {
      game.framerate = Math.round(game._framecount/game._framerate*1000);
      game.loopTime = (game._loopTime/game._framecount).toFixed(2);
      game._framecount = 0;
      game._framerate = 0;
      game._loopTime = 0;
      var debugMsg =
        '<div class="dev_softpanel">' +
        '`iteration`: ' + game.iteration + '<br>' +
        game.viewX.toFixed(2) + 'x ' + game.viewY.toFixed(2) + 'y ' + game.viewM + 'mag' +
        '</div><div class="dev_softpanel">' +
        game.years() + 'y ' + game.days() + 'd ' + game.hoursMinutes() + '<br>' +
        game.month() + ' - ' + game.season() +
        '</div><div class="dev_softpanel">' +
        'sample `dtGM` per frame: ' + dtGM.toFixed(2) + 'min<sub>game</sub><br>' +
        'sample `dt` per frame: ' + dt + 'ms<sub>real</sub>' +
        '</div><div class="dev_softpanel">' +
        game.framerate + ' fps<br>' +
        game.loopTime + ' ms/loop' +
        '</div>';
      debug.innerHTML = debugMsg;
    }
    loopByMode();
  };

  //  ***  MODULES  ***  //
  
  DOM = (function(){
    function build(tagName,container,_innerHTML,cssId,cssClass) {
      var _element = document.createElement(tagName);
      if (cssId) _element.id = cssId;
      if (cssClass) _element.className = cssClass;
      container.appendChild(_element);
      if (_innerHTML) _element.innerHTML = _innerHTML;
      return _element;
    }
    function empty(_element) {
      while (_element.firstChild) {
        _element.removeChild(_element.firstChild);
      }
    }
    return {
      build:build,
      empty:empty,
    };
  })();

  Input = (function(){
    var keyState = {};
    var clickData = {};
    function keyDown(event) {if (!keyState[event.key]) keyState[event.key] = true;}
    function keyUp(event) {if (keyState[event.key]) keyState[event.key] = false;}
    function registerClick(event) {
      clickData.hot = true;
      clickData.x = event.clientX;
      clickData.y = event.clientY;
    }
    function mouseToWorldXY(p) {
      if (!p) p = clickData;
      var wx = game.viewX + ((p.x - context.canvas.width/2)/game.viewM);
      var wy = game.viewY - ((p.y - context.canvas.height/2)/game.viewM);
      return {x:wx,y:wy};
    }
    function getClick(convertToWorldXY) {
      if (clickData.hot) {
        clickData.hot = false;
        return convertToWorldXY ? mouseToWorldXY() : {x:clickData.x,y:clickData.y};
      }
      else return false;
    }
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
    function init() {
      window.addEventListener('keydown',keyDown);
      window.addEventListener('keyup',keyUp);
      canvas.addEventListener('click',registerClick);
    }
    return {
      all:function(){return keyState;},
      getKeyState:function(a){return keyState[a];},
      gameplay:getGameplayRelated,
      mouseToXY:mouseToWorldXY,
      getClick:getClick,
      init:init
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

    //  ***  "Uncoupled" prototypes  ***  //
    function getCollisions(neighbors) {
      var collisions = [];
      if (!neighbors) neighbors = SpatialHash.retrieve(this.x,this.y,this.uid);
      if (neighbors.length) {
        for (var i = neighbors.length; i--;) {
          var neighbor = entities[neighbors[i]];
          var dD = Math.sqrt((neighbor.x-this.x)*(neighbor.x-this.x)+(neighbor.y-this.y)*(neighbor.y-this.y));
          if (dD < this.radius+neighbor.radius) {
            collisions.push(neighbors[i]);
          }
        }
      }
      return collisions;
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
      this.speed = 1;
      this.level = 1;
      this.radius = 10;
      this.money = 0;
      this.items = [{}];
      this.queue = [];
    };
    Extend.call(Player,_BasicEntity);
    Player.prototype.getCollisions = getCollisions;
    Player.prototype.plant = function(name,x,y) {
      var pdx = x-this.x;
      var pdy = y-this.y;
      var dD = Math.sqrt(pdx*pdx+pdy*pdy);
      if (dD <= this.radius) {
        Create.growth(name,x,y);
        this.dx = 0;
        this.dy = 0;
        return true;
      }
      else {
        var scalar = dD*dD/(this.speed*this.speed);
        this.dx = Math.sqrt(pdx*pdx/scalar)*Math.sign(pdx);
        this.dy = Math.sqrt(pdy*pdy/scalar)*Math.sign(pdy);
        return false;
      }
    };
    Player.prototype.step = function() {
      if (this.queue.length) {
        var task = this.queue[0];
        if (this[task.type](task.item,task.x,task.y)) this.queue.shift();
      }
      if (this.dx || this.dy) {
        var xi = this.x;
        var yi = this.y;
        this.x += this.dx;
        this.y += this.dy;
        SpatialHash.transfer(xi,yi,this.x,this.y,this.uid);
      }
      var collisions = this.getCollisions();
    };

    //  ***  CREATURES  ***  //

    var Creature = {};
    //  Top-level creature pseudo-class
    Creature._Creature = function() {
      _BasicEntity.call(this);
      this.endurance = 1000;
      this.dx = 0;
      this.dy = 0;
    };
    Extend.call(Creature._Creature,_BasicEntity);
    Creature._Creature.prototype.getCollisions = getCollisions;
    Creature._Creature.prototype.step = function() {
      //this.radius -= 1/this.endurance;
      var xi = this.x;
      var yi = this.y;
      this.x += rI(-5,5)/10;
      this.y += rI(-5,5)/10;
      SpatialHash.transfer(xi,yi,this.x,this.y,this.uid);
      var collisions = this.getCollisions();
      if (collisions.length) this.color = '#F00';
      else this.color = '#0F0';
      if (this.radius < 0.5) {
        SpatialHash.remove(this.x,this.y,this.uid);
        delete entities[this.uid];
      }
    };

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
      var _entity;
      switch(category) {
        case 'Player': _entity = new Player(); break;
        case 'Creature': _entity = new Creature[type](); break;
        case 'Growth': _entity = new Growth[type](); break;
        case 'Item': _entity = new Item[type](); break;
        default: return null;
      }
      _entity.uid = transmogrifyUID(_UID);
      if (category === 'Player') game.playerUID = _entity.uid;
      _UID += 1;
      _entity.x = x;
      _entity.y = y;
      entities[_entity.uid] = _entity;
      SpatialHash.insert(_entity.x,_entity.y,_entity.uid);
      return _entity;
    }
    
    var Instances = {
      creature:{},
      growth:{},
      item:{}
    };
    (function(){
      var type;
      for (type in Creature) Instances.creature[type] = new Creature[type]();
      for (type in Growth) Instances.growth[type] = new Growth[type]();
      for (type in Item) Instances.item[type] = new Item[type]();
    })();
    console.log(Instances);

    return {
      player:function(x,y){return make('Player',null,x,y);},
      creature:function(a,x,y){return make('Creature',a,x,y);},
      growth:function(a,x,y){return make('Growth',a,x,y);},
      item:function(a,x,y){return make('Item',a,x,y);},
      clone:function(cat,type){return Instances[cat][type]();}
    };

  })(); // end `Create` module

  function init() {
    controls = document.getElementById('controls');
    selectGameplay = document.getElementById('selectGameplay');
    selectBelt = document.getElementById('selectBelt');
    selectBackpack = document.getElementById('selectBackpack');
    selectMobiledevice = document.getElementById('selectMobiledevice');
    selectStore = document.getElementById('selectStore');
    selectAction = document.getElementById('selectAction');
    selectItem = document.getElementById('selectItem');

    belt = document.getElementById('belt');
    backpack = document.getElementById('backpack');
    mobiledevice = document.getElementById('mobiledevice');
    store = document.getElementById('store');
    actions = document.getElementById('actions');
    items = document.getElementById('items');
    hideAllEquipment();

    mobiledeviceElements.clock = document.getElementById('md_clock');
    mobiledeviceElements.sleep = document.getElementById('md_sleep');
    mobiledeviceElements.money = document.getElementById('md_money');
    mobiledeviceElements.save = document.getElementById('md_saveGame');
    mobiledeviceElements.load = document.getElementById('md_loadGame');
    mobiledeviceElements.options = document.getElementById('md_options');
    
    info = document.getElementById('info');
    debug = document.getElementById('debug');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.addEventListener('resize',resizeWindow);

    selectGameplay.addEventListener('click',function(){
      game.mode = 'gameplay';
      hideAllEquipment();
      loopByMode();
    });
    selectBelt.addEventListener('click',function(){
      hideAllEquipment();
      belt.classList.remove('hide');
      game.mode = 'belt';
      loopByMode();
    });
    selectBackpack.addEventListener('click',function(){
      hideAllEquipment();
      backpack.classList.remove('hide');
      game.mode = 'backpack';
      loopByMode();
    });
    selectMobiledevice.addEventListener('click',function(){
      hideAllEquipment();
      mobiledevice.classList.remove('hide');
      game.mode = 'mobiledevice';
      loopByMode();
    });
    selectStore.addEventListener('click',function(){
      hideAllEquipment();
      store.classList.remove('hide');
      game.mode = 'store';
      loopByMode();
    });
    selectAction.addEventListener('click',function(){
      hideAllEquipment();
      buildActions();
      selectAction.classList.remove('hide');
    });
    selectItem.addEventListener('click',function(){
      hideAllEquipment();
      buildItems();
      selectItem.classList.remove('hide');
    });
    
    Input.init();

    //  Make fake world for now...
    Create.player(0,0);
    for (var _i_1 = 60; _i_1--;) Create.creature('Dog',rI(-400,400),rI(-200,200));
    for (_i_1 = 200; _i_1--;) Create.growth('Parsley',rI(-400,400),rI(-200,200));

      //DEBUG

//     window.addEventListener('mousemove',function(e){
//       var xy = Input.mouseToXY(e);
//       var _uidArray = SpatialHash.retrieve(xy[0],xy[1]);
//       debug.innerHTML = e.clientX+'x '+e.clientY+'y --> '+xy[0]+' '+xy[1]+' => '+_uidArray;
//     });
    
    
    window.requestAnimationFrame(gameplay);
  }

  return {
    init:init,
  };

})();

window.onload = SG.init;

/*

ideas:
 - plant on dead creatures to get growth bonus
 - dig up a magic worm

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
