
//    Sarah's Garden v4
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
  var panel = {
    gameplay:{},
    belt:{},
    backpack:{},
    mobiledevice:{},
    store:{},
    actions:{},
    seeds:{},
    constructables:{}
  };
  //  SUB-MODULES
  var gameplay; // primary gameplay loop function
  var game; // game parameters
  var commands; // use input actionables
  var entities; // all dynamic objects in the world
  var drawBins; // objects to be drawn (for draw order)
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
  drawBins = {};

  game = {
    viewX:0, // center-point
    viewY:0, // center-point
    viewXMax: 0, // save comp time
    viewYMax: 0, //      "
    viewXMin: 0, //      "
    viewYMin: 0, //      "
    viewM:1, // scalar (magnification)
    _playerUID: null, // player entity uid
    mode: 'foo', // controls loop function via `loopByMode` function
    actionMode: 'foo', // controls click action (move,repel,plant,inspect,build,harvest);
    seedSelection: 'foo',
    buildSelection: 'foo',
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

  commands = {
    up: function() {game.viewY += 10/game.viewM;},
    down: function() {game.viewY -= 10/game.viewM;},
    left: function() {game.viewX -= 10/game.viewM;},
    right: function() {game.viewX += 10/game.viewM;},
    magIncrease: function() {game.viewM = (game.viewM*1.01).toFixed(4);},
    magDecrease: function() {game.viewM = (game.viewM*0.99).toFixed(4);},
    move: function(p) {
      entities[game.playerUID].queue.push({x:p.x,y:p.y,action:'move'});
    },
    plant: function(p) {
      var player = entities[game.playerUID];
      player.seeds.forEach(function(seed){
        if (seed.growth === game.seedSelection && seed.quantity > 0) {
          player.queue.push({x:p.x,y:p.y,action:'plant',growth:game.seedSelection});
          return true;
        }
      });
      return false;
    },
    harvest: function(p) {
      var uidsBatch = SpatialHash.retrieve(p.x,p.y);
      uidsBatch.forEach(function(uid){
        var _entity = entities[uid];
        if (Math.sqrt((p.x-_entity.x)*(p.x-_entity.x)+(p.y-_entity.y)*(p.y-_entity.y)) <= _entity.radius) {
          entities[game.playerUID].queue.push({x:p.x,y:p.y,action:'harvest',uid:_entity.uid});
        }
      });
    },
    deter: function(p) {},
    inspect: function(p) {
      var uidsBatch = SpatialHash.retrieve(p.x,p.y);
      uidsBatch.forEach(function(uid){
        var _entity = entities[uid];
        if (Math.sqrt((p.x-_entity.x)*(p.x-_entity.x)+(p.y-_entity.y)*(p.y-_entity.y)) <= _entity.radius) {
          entities[game.playerUID].queue.push({x:p.x,y:p.y,action:'inspect',uid:_entity.uid});
        }
      });
    },
    build: function(p) {}
  };

  function hideAllPanels() {
    ['belt','backpack','mobiledevice','store','actions','seeds','constructables'].forEach(function(item) {
      if (!panel[item].container.classList.contains('hide')) panel[item].container.classList.add('hide');
    });
  }
  function changeActionMode(a) {
    if (panel.actions[game.actionMode]) panel.actions[game.actionMode].classList.remove('action-selected');
    panel.actions[a].classList.add('action-selected');
    if (a==='move') panel.actions.selector.style.background = 'url("images/wearable/sneakers_1.png") no-repeat center/40px';
    else panel.actions.selector.style.background = null;
    game.actionMode = a;
  }
  function buildActions() {
    var player = entities[game.playerUID];
    
  }
  function buildSeeds() {
    DOM.empty(panel.seeds.container);
    var _seeds = [];
    _seeds = entities[game.playerUID].seeds;
    _seeds.sort(function(a,b){return a.plantInfo.cost > b.plantInfo.cost ? 1 : a.plantInfo.cost < b.plantInfo.cost ? -1 : 0;});
    _seeds.forEach(function(seed){
      var _id = 'seeds-seed-'+seed.growth;
      DOM.build('div',panel.seeds.container,seed.growth+' - '+seed.quantity,_id,'seeds-seed'+(seed.growth===game.seedSelection?' seeds-seed-selected':''));
      document.getElementById(_id).addEventListener('click',function(e){
        var _selected = document.getElementById('seeds-seed-'+game.seedSelection);
        if (_selected) _selected.classList.remove('seeds-seed-selected');
        this.classList.add('seeds-seed-selected');
        game.seedSelection = seed.growth;
      });
    });
  }
  function buildStoreSeeds() {
    var seeds = ['Dandelion','Parsley','Rhubarb','GreenBeans'];
    var player = entities[game.playerUID];
    seeds.forEach(function(seed){
      var clone = Create.clone('growth',seed);
      var html =
        '<img class="store-seed-image flipVertical" src="images/growths/'+(seed).toLowerCase()+'_1.png">'+
        '<div id="store-seed-owned-'+seed+'" class="store-seed-owned"></div>'+
        '<div class="store-seed-text">'+clone.commonName+'<br><i>'+clone.binomialNomenclature+'</i><br>'+
        '<span class="store-seed-cost">Cost per seed: $'+clone.cost.toFixed(2)+'</span>'+
        '</div><div class="store-seed-purchase">'+
        '<span id="store-seed-quant-'+seed+'" class="store-purchase-quantity">1</span>'+
        '<span class="store-purchase-incrementer"><div class="store-purchase-quantityIncrease" onclick="'+
        "var i=document.getElementById('store-seed-quant-"+seed+"');i.innerHTML=parseInt(i.innerHTML)+1;"+'"></div>'+
        '<div class="store-purchase-quantityDecrease" onclick="'+
        "var i=document.getElementById('store-seed-quant-"+seed+"');i.innerHTML=(parseInt(i.innerHTML)-1)||1;"+'"></div></span>'+
        '<span id="purchase-seed-'+seed+'" class="store-purchase-button">PURCHASE</span></div>';
      var _seedElement = DOM.build('div',panel.store.inventory,html,null,'store-seed');
      document.getElementById('purchase-seed-'+seed).addEventListener('click',function(event){
        var i = player.seeds.length-1;
        var searching = true;
        while (searching) {
          if (player.seeds[i].growth === seed) {
            searching = false;
            var qElem = document.getElementById('store-seed-quant-'+seed);
            var purchaseQuantity = parseInt(qElem.innerHTML);
            if (purchaseQuantity*clone.cost > player.money) {
              purchaseQuantity = Math.floor(player.money/clone.cost);
              qElem.innerHTML = purchaseQuantity;
            }
            player.money -= clone.cost*purchaseQuantity;
            player.seeds[i].quantity += purchaseQuantity;
            panel.store.playersMoney.innerHTML = '$'+player.money.toFixed(2);
            document.getElementById('store-seed-owned-'+seed).innerHTML = player.seeds[i].quantity;
          }
          else i -= 1;
        }
      });
    });
    player.seeds.forEach(function(_seed){
      document.getElementById('store-seed-owned-'+_seed.growth).innerHTML = _seed.quantity;
    });
  }

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
    if (click) commands[game.actionMode](click);
    //  Gameplay
    drawBins.base = [];
    drawBins.ground = [];
    drawBins.middle = [];
    drawBins.sky = [];
    for (var uid in entities) {
      entities[uid].step(dt);
      if (entities[uid].isInView) entities[uid].addToDrawBin();
    }
    //  Setup canvas for new frame
    game.viewXMax = game.viewX + context.canvas.width/2/game.viewM;
    game.viewYMax = game.viewY + context.canvas.height/2/game.viewM;
    game.viewXMin = game.viewX - context.canvas.width/2/game.viewM;
    game.viewYMin = game.viewY - context.canvas.height/2/game.viewM;
    context.setTransform(1,0,0,1,0,0);
    context.fillStyle = 'rgb(50,35,35)';
    context.fillRect(0,0,context.canvas.width,context.canvas.height);
    context.setTransform( game.viewM,0,0,-game.viewM,
                          context.canvas.width/2 - game.viewX*game.viewM,
                          context.canvas.height/2 + game.viewY*game.viewM );
    //  Draw `entities`
    var _entities = drawBins.base;
    drawBins.ground.forEach(function(uid){_entities.push(uid);});
    drawBins.middle.forEach(function(uid){_entities.push(uid);});
    drawBins.sky.forEach(function(uid){_entities.push(uid);});
    _entities.forEach(function(uid) {
      var target = entities[uid];
      if (1){ //is in view?
        if (target.image) {
          var _offset = target.radius;
          var _dim = target.radius*2;
          context.drawImage(target.image,target.x-_offset,target.y-_offset,_dim,_dim);
        }
        else {
          if (target.color) context.strokeStyle = target.color;
          else context.strokeStyle = 'rgb(0,255,0)';
          context.beginPath();
          context.arc(target.x,target.y,target.radius,0,2*Math.PI);
          context.stroke();
        }
      }
    });
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
    if (game.mode === 'gameplay') window.requestAnimationFrame(gameplay);
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
    function addListener(_element,trigger,callback,paramObject) {
      if (paramObject) _element.addEventListener(trigger,function(e){callback(e,paramObject);});
      else _element.addEventListener(trigger,callback);
    }
    return {
      build:build,
      empty:empty,
      addListener:addListener
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
    function Name(common,binomial) {
      this.prototype.commonName = common;
      this.prototype.binomialNomenclature = binomial;
    }
    function AddPrototypes(props) {
      for (var pName in props) {
        this.prototype[pName] = props[pName];
      }
    }
    function EntityImage(dir,src) {
      var _img = new Image();
      _img.src = 'images/'+dir+'/'+src;
      this.prototype.image = _img;
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
    _BasicEntity.prototype.isInView = function() {
      if ( this.x+this.radius > game.viewXMin && this.x-this.radius < game.viewXMax &&
           this.y+this.radius > game.viewYMin && this.y-this.radius < game.viewYMax) return true;
      return false;
    };

    //  ***  PLAYER  ***  //

    var Player = function() {
      _BasicEntity.call(this);
      this.movement = {
        _ready: false,
        _recalcTrajectoryCounter: 0,
        active: false,
        dx: 0,
        dy: 0,
        speed: 1,
        destination: [0,0], // as [x,y]
        targetUID: 'str'
      };
      this.level = 1;
      this.radius = 7;
      this.money = 10;
      this.belt = {
        slotCount:3,
        inspect:[],
        plant:[],
        harvest:[],
        build:[],
        repel:[]
      };
      this.seeds = [];
      this.constructables = [];
      this.equipment = {
        inspect:['BotanistsFriend'],
        plant:['Trowel'],
        harvest:['WickerBasket'],
        build:[],
        repel:[],
        wearable:[]
      };
      this.queue = [];
    };
    Extend.call(Player,_BasicEntity);
    Player.prototype.getCollisions = getCollisions;
    Player.prototype.trimQueue = function(key,value) {
      for (var i = this.queue.length; i--;) {
        if (this.queue[i][key] === value) this.queue.splice(i,1);
      }
    };
    Player.prototype.setDestination = function(x,y) {
      if (this.movement.destination[0] === x && this.movement.destination[1] === y) {
        if (this.movement._recalcTrajectoryCounter > 0) {
          this.movement._recalcTrajectoryCounter -= 1;
          return true;
        }
      }
      else {
        this.movement.destination[0] = x; this.movement.destination[1] = y;
      }
      var pdx = x-this.x;
      var pdy = y-this.y;
      var dD = Math.sqrt(pdx*pdx+pdy*pdy);
      if (dD > this.radius) {
        this.movement.active = true;
        var scalar = dD*dD/(this.movement.speed*this.movement.speed);
        this.movement.dx = Math.sqrt(pdx*pdx/scalar)*Math.sign(pdx);
        this.movement.dy = Math.sqrt(pdy*pdy/scalar)*Math.sign(pdy);
        if (dD > this.movement.speed*9+this.radius) {
          this.movement._recalcTrajectoryCounter = 8;
        }
        return true;
      }
      else {
        this.movement.active = false;
        return false;
      }
    };
    Player.prototype.setTargetUID = function(uid) {
      if (this.movement.targetUID === uid) {
        if (this.movement._recalcTrajectoryCounter > 0) {
          this.movement._recalcTrajectoryCounter -= 1;
          return true;
        }
      }
      else this.movement.targetUID = uid;
      var target = entities[uid];
      var pdx = target.x-this.x;
      var pdy = target.y-this.y;
      var dD = Math.sqrt(pdx*pdx+pdy*pdy);
      if (dD > this.radius+target.radius) {
        this.movement.active = true;
        var scalar = dD*dD/(this.movement.speed*this.movement.speed);
        this.movement.dx = Math.sqrt(pdx*pdx/scalar)*Math.sign(pdx);
        this.movement.dy = Math.sqrt(pdy*pdy/scalar)*Math.sign(pdy);
        if (dD > this.movement.speed*6+this.radius+target.radius) {
          this.movement._recalcTrajectoryCounter = 3;
        }
        return true;
      }
      else {
        this.movement.active = false;
        return false;
      }
    };
    Player.prototype.plant = function(task) {
      if (!this.setDestination(task.x,task.y)) {
        Create.growth(task.growth,task.x,task.y);
        var _seed,_index;
        for (var i = this.seeds.length; i--;) if (this.seeds[i].growth === task.growth) {
          _seed = this.seeds[i];
          _index = i;
          break;
        }
        _seed.quantity -= 1;
        if (_seed.quantity === 0) {
          this.trimQueue('growth',_seed.growth);
          this.seeds.slice(_index,1);
        }
        buildSeeds();
        return true;
      }
      else return false;
    };
    Player.prototype.move = function(task) {
      if (!this.setDestination(task.x,task.y)) return true;
      else return false;
    };
    Player.prototype.inspect = function(task) {
      if (!this.setTargetUID(task.uid)) {
        console.log(entities[task.uid]);
        return true;
      }
      else {
        task.x = entities[task.uid].x;
        task.y = entities[task.uid].y;
        return false;
      }
    };
    Player.prototype.harvest = function(task) {
      if (!this.setTargetUID(task.uid)) {
        var target = entities[task.uid];
        entities[game.playerUID].money += target.value*target.radius*target.radius/(target.maxRadius*target.maxRadius);
        SpatialHash.remove(target.x,target.y,target.uid);
        delete entities[task.uid];
        console.log(entities[game.playerUID].money);
        return true;
      }
      else {
        return false;
      }
    };
    Player.prototype.traverseWorld = function() {
      var xi = this.x;
      var yi = this.y;
      this.x += this.movement.dx;
      this.y += this.movement.dy;
      SpatialHash.transfer(xi,yi,this.x,this.y,this.uid);
    };
    Player.prototype.step = function() {
      if (this.queue.length) {
        var task = this.queue[0];
        if (this[task.action](task)) this.queue.shift();
      }
      if (this.movement.active) this.traverseWorld();
      var collisions = this.getCollisions();
    };
    Player.prototype.addToDrawBin = function() {drawBins.middle.push(this.uid);};

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
    Name.call(Creature._Creature,'Creature','Animus anonymous');
    Creature._Creature.prototype.getCollisions = getCollisions;
    Creature._Creature.prototype.step = function() {
      //this.radius -= 1/this.endurance;
      if (rI(1,40)===10) {
        if (rI(0,3)===3) {
          this.dx = 0;
          this.dy = 0;
        }
        else {
          this.dx = rI(0,5)/10 * rI(-1,1);
          this.dy = rI(0,5)/10 * rI(-1,1);
        }
      }
      var xi = this.x;
      var yi = this.y;
      this.x += this.dx;
      this.y += this.dy;
      SpatialHash.transfer(xi,yi,this.x,this.y,this.uid);
      var collisions = this.getCollisions();
      if (collisions.length) this.color = '#F00';
      else this.color = '#0F0';
      if (this.radius < 0.5) {
        SpatialHash.remove(this.x,this.y,this.uid);
        delete entities[this.uid];
      }
    };
    Creature._Creature.prototype.addToDrawBin = function() {drawBins.middle.push(this.uid);};

    //  Dogs
    
    Creature.Dog = function() {
      Creature._Creature.call(this);
      this.bark = 'woof!';
      this.radius = 5;
    };
    Extend.call(Creature.Dog,Creature._Creature);
    Name.call(Creature.Dog,'Dog','Canus lupus familiaris');
    EntityImage.call(Creature.Dog,'creatures','dog_1.png');

    //  Labrador, Mutt, etc...    
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
    };
    Extend.call(Growth._Growth,_BasicEntity);
    Growth._Growth.prototype.step = function() {
      if (this.radius < this.maxRadius) this.radius += this.growthRate;
    };
    Growth._Growth.prototype.addToDrawBin = function() {drawBins.ground.push(this.uid);};
    
    Growth.Dandelion = function() {
      Growth._Growth.call(this);
    };
    Extend.call(Growth.Dandelion,Growth._Growth);
    Name.call(Growth.Dandelion,'Dandelion','Taraxacum officinale');
    AddPrototypes.call(Growth.Dandelion,{
      maxRadius: 3,
      value: 0.03,
      cost: 0.01,
      growthRate: 2e-4
    });
    EntityImage.call(Growth.Dandelion,'growths','dandelion_1.png');
    
    Growth.Parsley = function() {
      Growth._Growth.call(this);
    };
    Extend.call(Growth.Parsley,Growth._Growth);
    Name.call(Growth.Parsley,'Parsley','Petroselinum crispum');
    AddPrototypes.call(Growth.Parsley,{
      maxRadius: 3,
      value: 0.06,
      cost: 0.03,
      growthRate: 1e-4
    });
    EntityImage.call(Growth.Parsley,'growths','parsley_1.png');

    Growth.Rhubarb = function() {
      Growth._Growth.call(this);
    }
    Extend.call(Growth.Rhubarb,Growth._Growth);
    Name.call(Growth.Rhubarb,'Rhubarb','Rheum rhabarbarum');
    AddPrototypes.call(Growth.Rhubarb,{
      maxRadius: 4.2,
      value: 0.25,
      cost: 0.1,
      growthRate: 7e-5
    });
    EntityImage.call(Growth.Rhubarb,'growths','rhubarb_1.png');
    
    Growth.GreenBeans = function() {
      Growth._Growth.call(this);
    };
    Extend.call(Growth.GreenBeans,Growth._Growth);
    Name.call(Growth.GreenBeans,'Green Beans','Phaseolus vulgaris');
    AddPrototypes.call(Growth.GreenBeans,{
      maxRadius: 6.5,
      value: 0.45,
      cost: 0.15,
      growthRate: 8e-5
    });
    EntityImage.call(Growth.GreenBeans,'growths','greenbeans_1.png');


    //  ***  "INSTANCES"  ***  //

    var Instances = {
      creature:{},
      growth:{},
    };
    (function(){ var type;
      for (type in Creature) Instances.creature[type] = new Creature[type]();
      for (type in Growth) Instances.growth[type] = new Growth[type]();
    })();


    //  ***  ITEMS  ***  //

    var Equipment = {};

    Equipment._Item = function() {
      this.name = '';
      this.cost = 0;
      this.slot = ''; // corresponds to beltslot (`game.actionMode` domain)
    };

    var Seed = function(growthName) {
      this.growth = growthName;
      this.name = 'seed';
      this.quantity = 0;
    };

    function transmogrifyUID(n,exp) {
      if (!exp) exp = 0;
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

    function make(category,type,params) {
      var _entity;
      switch(category) {
        case 'Player': _entity = new Player(); break;
        case 'Creature': _entity = new Creature[type](); break;
        case 'Growth': _entity = new Growth[type](); break;
        case 'Equipment': _entity = new Equipment[type](); break;
        case 'Seed': _entity = new Seed(); break;
        default: return null;
      }
      for (var key in params) _entity[key] = params[key];
      if (category === 'Equipment') {
      }
      else if (category === 'Seed') {
        _entity.plantInfo = Instances.growth[_entity.growth];
      }
      else {
        _entity.uid = transmogrifyUID(_UID);
        _UID += 1;
        if (category === 'Player') game.playerUID = _entity.uid;
        entities[_entity.uid] = _entity;
        SpatialHash.insert(_entity.x,_entity.y,_entity.uid);
      }
      return _entity;
    }

    return {
      player:function(x,y){return make('Player',null,{x:x,y:y});},
      creature:function(a,x,y){return make('Creature',a,{x:x,y:y});},
      growth:function(a,x,y){return make('Growth',a,{x:x,y:y});},
      equipment:function(a,p){return make('Equipment',a,p);},
      seed:function(p){return make('Seed',null,p);},
      clone:function(cat,type){return Instances[cat][type];}
    };

  })(); // end `Create` module

  function init() {
    controls = document.getElementById('controls');
    panel.gameplay.selector = document.getElementById('selectGameplay');
    panel.belt.selector = document.getElementById('selectBelt');
    panel.backpack.selector = document.getElementById('selectBackpack');
    panel.mobiledevice.selector = document.getElementById('selectMobiledevice');
    panel.store.selector = document.getElementById('selectStore');
    panel.actions.selector = document.getElementById('selectAction');
    panel.seeds.selector = document.getElementById('selectSeed');
    panel.constructables.selector = document.getElementById('selectConstructable');

    panel.belt.container = document.getElementById('belt');
    panel.backpack.container = document.getElementById('backpack');
    panel.mobiledevice.container = document.getElementById('mobiledevice');
    panel.store.container = document.getElementById('store');
    panel.actions.container = document.getElementById('actions');
    panel.seeds.container = document.getElementById('seeds');
    panel.constructables.container = document.getElementById('constructables');
    hideAllPanels();

    panel.mobiledevice.clock = document.getElementById('md-clock');
    panel.mobiledevice.sleep = document.getElementById('md-sleep');
    panel.mobiledevice.money = document.getElementById('md-money');
    panel.mobiledevice.save = document.getElementById('md-saveGame');
    panel.mobiledevice.load = document.getElementById('md-loadGame');
    panel.mobiledevice.options = document.getElementById('md-options');

    panel.store.playersMoney = document.getElementById('store-playersMoney');
    panel.store.categorySelect = document.getElementById('store-categorySelect');
    panel.store.inventory = document.getElementById('store-inventory');

    panel.actions.move = document.getElementById('action-move');
    panel.actions.inspect = document.getElementById('action-inspect');
    panel.actions.plant = document.getElementById('action-plant');
    panel.actions.harvest = document.getElementById('action-harvest');
    panel.actions.build = document.getElementById('action-build');
    panel.actions.repel = document.getElementById('action-repel');
    (function(actionModes){
      actionModes.forEach(function(a) { // for each mode
        panel.actions[a].addEventListener('click',function(e) { // create event listener
          changeActionMode(a);
        });
      });
    })(['move','inspect','plant','harvest','build','repel']);

    info = document.getElementById('info');
    debug = document.getElementById('debug');
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    resizeWindow();
    window.addEventListener('resize',resizeWindow);
    
    //  (macro function)
    function basicPanelHandler(a) {
      if (panel[a].container.classList.contains('hide')) {
        hideAllPanels();
        panel[a].container.classList.remove('hide');
        panel[a].selector.classList.add('control-selector-selected');
        panel[game.mode].selector.classList.remove('control-selector-selected');
        game.mode = a;
        return true;
      }
      else {
        panel[a].container.classList.add('hide');
        panel[a].selector.classList.remove('control-selector-selected');
        panel.gameplay.selector.classList.add('control-selector-selected');
        game.mode = 'gameplay';
        window.requestAnimationFrame(gameplay);
        return false;
      }
    }

    //  Controls - selectors
    panel.gameplay.selector.addEventListener('click',function() {
      hideAllPanels();
      if (game.mode !== 'gameplay') {
        panel[game.mode].selector.classList.remove('control-selector-selected');
        panel.gameplay.selector.classList.add('control-selector-selected');
        game.mode = 'gameplay';
        window.requestAnimationFrame(gameplay);
      }
    });
    panel.belt.selector.addEventListener('click',function(){
      if (basicPanelHandler('belt')) ;
    });
    panel.backpack.selector.addEventListener('click',function(){
      if (basicPanelHandler('backpack')) ;
    });
    panel.mobiledevice.selector.addEventListener('click',function(){
      if (basicPanelHandler('mobiledevice')) ;
    });
    panel.store.selector.addEventListener('click',function(){
      if (basicPanelHandler('store')) {
        panel.store.playersMoney.innerHTML = '$'+(Math.floor(entities[game.playerUID].money*100)/100).toFixed(2);
        DOM.empty(panel.store.inventory);
        buildStoreSeeds();
      }
    });
    function selectorActionsOrItems(target) {
      if (!panel[target].selector.classList.contains('opaque')) {
        ['actions','seeds','constructables'].forEach(function(a){
          if (!panel[a].container.classList.contains('hide')) panel[a].container.classList.add('hide');
          panel[a].selector.classList.remove('opaque');
        });
        panel[target].selector.classList.add('opaque');
        panel[target].container.classList.remove('hide');
      }
      else {
        panel[target].selector.classList.remove('opaque');
        panel[target].container.classList.add('hide');
      }
    }
    panel.actions.selector.addEventListener('click',function() {
      selectorActionsOrItems('actions');
      buildActions();
    });
    panel.seeds.selector.addEventListener('click',function() {
      selectorActionsOrItems('seeds');
      buildSeeds();
    });
    panel.constructables.selector.addEventListener('click',function() {
      selectorActionsOrItems('constructables');
      //buildConstructables();
    });
    //  Make fake world for now...
    var _player = Create.player(0,0);
    _player.seeds.push(Create.seed({growth:'Dandelion',quantity:2}));
    _player.seeds.push(Create.seed({growth:'Parsley',quantity:2}));
    _player.seeds.push(Create.seed({growth:'Rhubarb',quantity:1}));
    _player.seeds.push(Create.seed({growth:'GreenBeans',quantity:1}));
    for (var _i_1 = 1; _i_1--;) Create.creature('Dog',rI(-400,400),rI(-200,200));
    for (_i_1 = 2; _i_1--;) Create.growth('Parsley',rI(-400,400),rI(-200,200));
    for (_i_1 = 2; _i_1--;) Create.growth('Dandelion',rI(-400,400),rI(-200,200));

    //DEBUG
//     window.addEventListener('mousemove',function(e){
//       var xy = Input.mouseToXY(e);
//       var _uidArray = SpatialHash.retrieve(xy[0],xy[1]);
//       debug.innerHTML = e.clientX+'x '+e.clientY+'y --> '+xy[0]+' '+xy[1]+' => '+_uidArray;
//     });
    game.mode='gameplay'; // so the loop happens
    panel[game.mode].selector.classList.add('control-selector-selected');
    changeActionMode('move'); // set starting `actionMode`
    Input.init(); // start listening for keyboard input
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
