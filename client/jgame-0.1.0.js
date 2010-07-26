// this is my first real attempt at a game engine so go easy on me.

var WKEY = 87;
var AKEY = 65;
var SKEY = 83;
var DKEY = 68;
var SPACE = 32;
var LEFT = 37;
var UP = 38;
var RIGHT = 39;
var DOWN = 40;

var FRAMERATE = 33;	// framerate in milliseconds (50=20fps, 33=30fps)
//var GRAVITY = 10;

var DEBUG = true;
var SHOWOBJECTNAMES = DEBUG;

// shortcut to save lookup time
var abs = Math.abs;

function jGame(rootElement, options) {
	this.scene = new jGame.Scene(rootElement, this);
	this.scene.rootGroup = new jGame.Group('root', {x:0, y:0, z:0, scene:this.scene});
	this.trackKeyPresses = options.trackKeyPresses;
	this.interval = null;
	this.states = {};
	
	this.addState = function(str, num) {
		this.states[num] = str;
	}
	
	this.start = function() {
		var game = this;
		this.interval = setInterval(function() {
			game.scene.doTick();
		}, FRAMERATE);
		if (DEBUG) $('body').addClass('debug');
	}
	
	this.pause = function() {
		clearInterval(this.interval);
	}
	
	//Add the keyTracker to the jGame object:
	this.keyTracker = {};
	// we only enable the real tracking if the users wants it
	if(options.trackKeyPresses){
		var game = this;
		$(document).keydown(function(event){
			game.keyTracker[event.keyCode] = true;
		});
		$(document).keyup(function(event){
			game.keyTracker[event.keyCode] = false;
		});
	}
	
	// handle mouse clicks and delegate them to corresponding entity
	var game = this;
	rootElement.click(function(event) {
		var sprite = game.scene.entities[$(event.target).attr('id')];
		if (sprite) sprite.doClick(event);
	});
	
}

jGame.inherits = function(childCtor, parentCtor) {
	/** @constructor */
	function tempCtor() {};
	tempCtor.prototype = parentCtor.prototype;
	childCtor._super = parentCtor.prototype;
	childCtor.prototype = new tempCtor();
	childCtor.prototype.constructor = childCtor;
};

jGame.log = function(str) {
	if (DEBUG) console.log(str);
}

var UNIT = 'px';
var TICK = 50;	// tick every 50 milliseconds (20 fps)

jGame.Scene = function(rootElement, game) {
	this.game = game;
	this.rootElement = rootElement;
	this.rootGroup = null;	// autocreated when jGame is instantiated
	this.callbacks = [];	// functions that run every "tick"
	this.entities = {};		// contains all sprites & nodes in an associative array by id
	this.entitiesByClass = {};	// contains lists of sprites & nodes by class name
	this.sprites = [];	// list of all sprite objects
	this.collisionMaps = {};
	this.gravity = 10;
	
	this.canvas = $('#canvas')[0];
	this.canvasContext = this.canvas.getContext('2d');	// used for creating pixel collision maps
	
	// function append callbacks to be called on every frame
	this.tick = function(fn) {
		this.callbacks.push(fn);
	};
	
	// called every frame
	this.doTick = function() {
		for (var i=0; i<this.callbacks.length; i++) {
			this.callbacks[i].call(this);
		}
		var count = this.sprites.length;
		for (var i=0; i<count; i++) {
			this.sprites[i].update();
		}
		//jGame.log('frame');
	};
	
	// not implemented yet
	this.buildFromDom = function() {
		jGame.log('buildFromDom');
	};
	
	// only called once to set everything up
	this.render = function() {
		var stack = this.rootGroup.render();
		var str = stack.join('');
		jGame.log(str);
		this.rootElement.html(str);
		this.renderCSS();
	};
	
	this.renderCSS = function() {
		// set up some basic styles
		var stack = {};
		stack['.sprite'] = [];
		stack['.group'] = [];
		stack['.sprite']['position'] = 'absolute';
		stack['.group']['position'] = 'absolute';
		
		// gather per-object styles from scene tree
		for (var key in this.entities) {
			stack = concat(stack, this.entities[key].renderCSS());
		}
		jGame.log(stack);
		this.addCSSRules(stack);
		
		/*var mysheet = document.styleSheets[0];
		var ruleCount = mysheet.cssRules ? mysheet.cssRules.length : mysheet.rules.length;
		if (mysheet.insertRule){ //if Firefox (webkit?)
			for (var key in stack) {
				var arr = [key, '{'];
				for (var prop in stack[key]) {
					arr = arr.concat([prop, ':', stack[key][prop], ';']);
				}
				arr.push('}');
				mysheet.insertRule(arr.join(''), ruleCount-1);
			}
		}*/
		/*else if (mysheet.addRule){ //else if IE
			mysheet.addRule("b", "background-color: lime");
		}*/

	};
	
	this.addCSSRules = function(stack) {
		var mysheet = document.styleSheets[0];
		var ruleCount = mysheet.cssRules ? mysheet.cssRules.length : mysheet.rules.length;
		if (mysheet.insertRule){ //if Firefox (webkit?)
			for (var key in stack) {
				var arr = [key, '{'];
				for (var prop in stack[key]) {
					arr = arr.concat([prop, ':', stack[key][prop], ';']);
				}
				arr.push('}');
				mysheet.insertRule(arr.join(''), ruleCount-1);
			}
		}
		/*else if (mysheet.addRule){ //else if IE
			mysheet.addRule("b", "background-color: lime");
		}*/
	};
	
	this.addGroup = function(id, options) {
		options.scene = this;
		var node = new jGame.Group(id, options);
		if (!node.parent) {	// if no parent is specified, parent it under the root node
			node.parent = this.rootGroup;
			this.rootGroup.children.push(node);
		}
		this.entities[id] = node;
		
		return node;
	};
	
	this.addSprite = function(id, options) {
		options.scene = this;
		var sprite = new jGame.Sprite(id, options);
		this.entities[id] = sprite;
		
		return sprite;
	};
	
	this.addToClass = function(entity, str) {
		if (!this.entitiesByClass[str]) this.entitiesByClass[str] = [];
		this.entitiesByClass[str].push(entity);
		if (str == 'sprite') this.sprites.push(entity);
	};
	
	this.find = function(q) {
		var parts = q.split(',');
		for (var i=0; i<parts.length; i++) {
			var subparts = parts[i].trim().split(' ');
			if (subparts.length == 1) {
				if (subparts[0].indexOf('#') == 0) return [ this.entities[subparts[0].substr(1)] ];
				else if (subparts[0].indexOf('.') == 0) return this.entitiesByClass[subparts[0].substr(1)];
			} else {
				// need to implement tree filtered searching
				// also need to implement multi-filtering (ie '.sprite.missile')
				jGame.log('tree filtering not implemented yet');
			}
		}
	};
	
	// add collision pixel map if browser supports canvas and perPixelCollide is true
	// note that using this feature will obviously be slower than rectangular collisions
	this.addCollisionMap = function(image, factor) {
		if (!this.collisionMaps[image]) {
			var can = this.canvas;
			var ctx = this.canvasContext;
			var img = new Image();
			var scene = this;
			img.onload = function(){
				var w = img.width,
					h = img.height;
			    can.width = w;
			    can.height = h;
			    ctx.drawImage(img, 0, 0, w, h);
			    
			    // Get the CanvasPixelArray from the given coordinates and dimensions.
				var imageData = ctx.getImageData(0, 0, w, h);
				var data = imageData.data;
				
				// build 2d array map for collision detection
				var map = [];
				var index;
				for (var i=0; i<h; i++) {
					for (var j=0; j<w; j++) {
						index = (i*4) * w + (j*4);
						
						// this switches to x/y order instead of y/x
						if (!map[j]) map[j] = [];
						map[j][i] = (data[index+3] > factor) ? true : false;
					}
				}
				scene.collisionMaps[image].addData(map);
			}
			scene.collisionMaps[image] = new jGame.PixelMap();
			img.src = image;
		}
	};
}

jGame.PixelMap = function() {
	this.data;	// 2-dimensional array of booleans
	this.ready = false;
	
	this.addData = function(data) {
		this.data = data;
		this.ready = true;
	};
	
	this.getRect = function(rect) {
		var x = rect.x,
			y = rect.y,
			h = rect.h,
			w = rect.w;
			
		var map = [];
		for (var i=x; i<x+w; i++) {
			for (var j=y; j<y+h; j++) {
				if (!map[i]) map[i] = [];
				map[i-x][j-y] = this.data[i][j];
			}
		}
		return map;
	};
	
	this.collide = function(r1, r2, pm2) {
		if (this.ready) {
			// 
			jGame.log('do these pixel maps collide?');
		} else {
			return true;
		}
	};
}

jGame.Rectangle = function(x, y, w, h) {
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;

	this.collide = function(r2) {
		var r1 = this;
		var x1 = r1.x,
			y1 = r1.y,
			x2 = r2.x,
			y2 = r2.y;
			
		if (x1 > x2+r2.w || 	// left side of r1 is right of right side of r2
			x1+r1.w < x2 ||		// right side of r1 is left of left side of r2
			y1 > y2+r2.h || 	// top of r1 is below bottom of r2
			y1+r1.h < y2 ) {	// bottom of r1 is above top of r2
			 
			return false;
			
		} else {
			// add functionality to do per-pixel collision detection
			// if less than half of the object is overlapping (?)
			return true;
		}
	};
	
	// this method isn't working yet
	this.intersect = function(r2) {
		var r1 = this;
		var x = (r1.x<r2.x) ? r1.x-r2.x : r2.x-r1.x;
		var y = (r1.y<r2.y) ? r1.y-r2.y : r2.y-r1.y;
		var w = (r1.w<r2.w) ? r1.x-r2.x : r2.x-r1.x;
		var h = (r1.x<r2.x) ? r1.x-r2.x : r2.x-r1.x;
		return new jGame.Rectangle(x, y, w, h);
	}
};

// movement styles
jGame.move = {};
jGame.move.STATIC = 0;
jGame.move.DIRECTION = 1;
jGame.move.OSCILLATE = 2
jGame.move.RANDOM = 3;
jGame.move.TERRITORIAL = 4;
jGame.move.CALLBACK = 5;

// collision settings for sprites
jGame.collide = {};
jGame.collide.NONBLOCKING = 0;
jGame.collide.BLOCKING = 1;
jGame.collide.PLATFORM = 2;

// directions
var TOP = 0,
	RIGHT = 1,
	BOTTOM = 2,
	LEFT = 3;
	
/*jGame.Collision = function(side, sprite) {
	this.side = side;
	this.sprite = sprite;
};*/


jGame.Behavior = function(options) {
	this.gravity = options.gravity,
	this.speed = options.speed,
	this.jumpSpeed = options.jumpSpeed,
	this.jumpFalloff = options.jumpFalloff,
	this.shield = options.shield,
	this.damage = options.damage,
	this.collisions = options.collisions,
	this.movement = options.movement,
	this.movementOptions = options.movementOptions,
	this.movementCallback = options.movementCallback,
	this.territory = options.territory;
	this.floor = options.floor;
	
	this.change = function(newb) {
		/*var curb = this;
		jGame.log(newb);
		jGame.log(curb);
		return new jGame.Behavior({
			gravity: newb.gravity || curb.gravity,
			speed: newb.speed || curb.speed,
			jumpSpeed: newb.jumpSpeed || curb.jumpSpeed,
			jumpFalloff: newb.jumpFalloff || curb.jumpFalloff,
			shield: newb.shield || curb.shield,
			damage: newb.damage || curb.damage,
			collisions: newb.collisions || curb.collisions,
			movement: newb.movement || curb.movement,
			movementOptions: newb.movementOptions || curb.movementOptions,
			movementCallback: newb.movementCallback || curb.movementCallback,
			territory: newb.territory || curb.territory
		});*/
		
		if (newb.gravity) this.gravity = newb.gravity;
		if (newb.speed) this.speed = newb.speed;
		if (newb.jumpSpeed) this.jumpSpeed = newb.jumpSpeed;
		if (newb.jumpFalloff) this.jumpFalloff = newb.jumpFalloff;
		if (newb.shield) this.shield = newb.shield;
		if (newb.damage) this.damage = newb.damage;
		if (newb.collisions) this.collisions = newb.collisions;
		if (newb.movement) this.movement = newb.movement;
		if (newb.movementOptions) this.movementOptions = newb.movementOptions;
		if (newb.movementCallback) this.movementCallback = newb.movementCallback;
		if (newb.territory) this.territory = newb.territory;
		if (newb.floor) this.floor = newb.floor;
		
	};
	
	this.setMovementCallback = function(fn) {
		this.movementCallback = fn; 
	}
	
}

jGame.Entity = function(id, options) {
	this.id = id,
	this.x = options.x || 0,
	this.y = options.y || 0,
	this.z = options.z,
	this.parent = options.parent,
	this.element = options.element;
	this.scene = options.scene || this.parent.scene;
	this.classes = [];
	this.prevLoc = { x:this.x, y:this.y };
	this.hasMoved = false;
	
	this.getIdStr = function() {
		return '#' + this.id;
	};
	
	/*this.move = function(x, y) {
		this.prevLoc = { x:this.x, y:this.y };
		this.x += x,
		this.y += y;
		
		this.getElement().css({ top:this.y, left:this.x });
	};*/
	
	this.getElement = function() {
		if (!this.element || this.element.length == 0) this.element = $('#' + this.id);
		return this.element;
	};
	
	this.addClass = function(str) {
		this.classes.push(str);
		this.scene.addToClass(this, str);
		this.updateClasses();
	};
	
	this.getClasses = function() {
		var classes = this.classes;
		if (this.state && this.scene.game.states[this.state]) {
			classes.push(this.scene.game.states[this.state]);
		}
		return classes;
	};
	
	this.updateClasses = function() {
		this.getElement().attr('class', this.getClasses().join(' '));
	};
	
	this.move = function(loc) {
		if (loc.x) this.x += loc.x;
		if (loc.y) this.y += loc.y;
		if (loc.z) this.z += loc.z;
		this.hasMoved = true;
	};
	
	this.getLocGlobal = function() {
		if (this.parent) {
			var coords = this.parent.getLocGlobal();
			return { x: this.x+coords.x, y:this.y+coords.y }
		} else {
			return { x:this.x, y:this.y }
		}
	};
	
	// jquery effects functions
	// is there a way to do this automatically?
	this.show = function(duration, callback) {
		this.getElement().show(duration, callback);
	};
	
	this.hide = function(duration, callback) {
		this.getElement().hide(duration, callback);
	};
	
	this.fadeIn = function(duration, callback) {
		this.getElement().fadeIn(duration, callback);
	};
	
	this.fadeOut = function(duration, callback) {
		this.getElement().fadeOut(duration, callback);
	};
	
	this.slideDown = function(duration, callback) {
		this.getElement().slideDown(duration, callback);
	};
	
	this.slideUp = function(duration, callback) {
		this.getElement().slideUp(duration, callback);
	};
	
	this.slideToggle = function(duration, callback) {
		this.getElement().slideToggle(duration, callback);
	};
	
	this.toggle = function(handler1, handler2, handler3) {
		this.getElement().toggle(handler1, handler2, handler3);
	};
	
	this.animate = function(properties, duration, easing, callback) {
		this.getElement().animate(properties, duration, easing, callback);
	};
	
	this.stop = function(clearQueue, jumpToEnd) {
		this.getElement().stop(clearQueue, jumpToEnd);
	};
	
	// classes options
	if (options.classes) {
		for (var i=0; i<options.classes.length; i++) {
			this.addClass(options.classes[i]);;
		}
	}
}

jGame.Group = function(id, options) {
	jGame.Entity.call(this, id, options);
	
	this.children = [],
	this.sprites = [];
	this.addClass('group');
	
	this.addChild = function(id, options) {
		options.parent = this;
		var child = this.scene.addGroup(id, options);
		//jGame.log(child);
		this.children.push(child);
		
		return child;
	};
	
	this.addSprite = function(id, options) {
		options.parent = this;
		var sprite = this.scene.addSprite(id, options);
		this.sprites.push(sprite);
		
		return sprite;
	};
	
	this.render = function() {
		var arr = ['<div id="', this.id, '" class="', this.getClasses().join(' '), '">'];
		for (var i=0; i<this.children.length; i++) {
			arr = arr.concat(this.children[i].render());
		}
		for (var i=0; i<this.sprites.length; i++) {
			arr = arr.concat(this.sprites[i].render());
		}
		if (SHOWOBJECTNAMES) arr.push(this.id);
		arr.push('</div>');
		return arr;
	};
	
	this.renderCSS = function() {
		var id = this.getIdStr();
		var css = [];
		css[id] = [];
		css[id]['top'] = this.y+UNIT;
		css[id]['left'] = this.x+UNIT;
		if (this.z) css[id]['z-index'] = this.z; 
		
		for (var i=0; i<this.sprites.length; i++) {
			concat(css, this.sprites[i].renderCSS());
		}
		for (var i=0; i<this.children.length; i++) {
			concat(css, this.children[i].renderCSS());
		}
		return css;
	};
	
	this.update = function() {
		var css;
		if (this.hasMoved) {
			css = {};
			css.left = this.x;
			css.top = this.y;
		}
		
		// update position
		if (css) this.getElement().css(css);
		
		this.hasMoved = false;
	};
};
jGame.inherits(jGame.Group, jGame.Entity);

jGame.Sprite = function(id, options) {
	jGame.Entity.call(this, id, options);
	
	this.pixelCollision = options.pixelCollision || false,
	this.pixelCollisionFactor = options.pixelCollisionFactor || 50,
	this.image = options.image,
	this.w = options.w,
	this.h = options.h,
	this.halfWidth;
	this.halfHeight;
	this.heightWidthRatio;
	this.widthHeightRatio;
	this.offsetX = options.offsetX || 0,
	this.offsetY = options.offsetY || 0,
	this.animation = options.animation;
	this.gravity = options.gravity || false;
	//this.obstacles = options.obstacles || [];
	this.behavior = new jGame.Behavior(options.behavior || {});
	this.state = options.state;
	this.stateChangeCallbacks = [];
	this.clickCallbacks = [];
	this.collideCallbacks = {};
	this.prevCollided = [];
	this.addClass('sprite');
	this.hasResized = false;
	this.rectGlobal;
	
	this.addBehavior = function(options) {
		this.behavior = new jGame.Behavior(options)
		jGame.log('add behavior');
		jGame.log(this.behavior);
	};
	
	this.changeBehavior = function(behavior) {
		this.behavior = this.behavior.change(behavior);
		jGame.log('add behavior');
		jGame.log(this.behavior);
	};
	
	this.setMovementCallback = function(fn) {
		this.behavior.setMovementCallback(fn);
	};
	
	this.stateChange = function(fn) {
		this.stateChangeCallbacks.push(fn);
	};
	
	this.changeState = function(state) {
		var callbacks = this.stateChangeCallbacks;
		var count = callbacks.length;
		var prevState = this.state;
		this.state = state;
		for (var i=0; i<count; i++) {
			callbacks[i].call(this, prevState);
		}
		this.updateClasses();
	};
	
	this.click = function(fn) {
		this.clickCallbacks.push(fn);
	};
	
	this.doClick = function(event) {
		var callbacks = this.clickCallbacks;
		var count = callbacks.length;
		for (var i=0; i<count; i++) {
			callbacks[i].call(this, event);
		}
	};
	
	this.resize = function(size) {
		if (size.width)	this.w = size.width;
		if (size.height) this.h = size.height;
		this.recalcSizeValues();
		this.hasResized = true;
	};
	
	this.recalcSizeValues = function() {
		this.halfHeight = Math.round(this.w / 2);
		this.halfHeight = Math.round(this.w / 2);
		
		// size ratio
		this.heightWidthRatio = this.h / this.w;
		this.widthHeightRatio = 1.0 - this.heightWidthRatio || 1.0;
	};
	this.recalcSizeValues();
	
	this.recalcCenter = function(x, y) {
		if (!x) x = this.x;
		if (!y) y = this.y;
		this.centerX = x + (this.w/2);
		this.centerY = y + (this.h/2);
		
		return {x:this.centerX, y:this.centerY};
	};
	
	this.getCenterGlobal = function() {
		var coords = this.getLocGlobal();
		return this.recalcCenter(coords.x, coords.y);
	};
	
	this.render = function() {
		return ['<div id="', this.id, '" class="', this.getClasses().join(' '), '">'+ (SHOWOBJECTNAMES ? this.id : '') +'</div>'];
	};
	
	this.renderCSS = function() {
		var id = this.getIdStr();
		var css = [];
		css[id] = [];
		css[id]['top'] = this.y+UNIT;
		css[id]['left'] = this.x+UNIT;
		if (this.z) css[id]['z-index'] = this.z;
		css[id]['width'] = this.w+UNIT;
		css[id]['height'] = this.h+UNIT;
		css[id]['background-image'] = 'url('+this.image+')';
		if (this.offsetX || this.offsetY)
			css[id]['background-position'] = '-'+this.offsetX+'px -'+this.offsetY+'px';
		
		return css;
	};
	
	this.addAnimation = function(options) {
		this.animation = new jGame.Animation(this, options);
		
		return this.animation;
	};
	
	this.changeAnimation = function(animation) {
		this.animation = animation;
		this.animation.addToSprite(this);
	};
	
	this.update = function() {
		// handle default behaviors here
		this.doBehaviors();
		
		var behavior = this.behavior;
		// make custom movement callbacks
		// should these return a css object for dom transform?
		// should these update object properties themselves?
		if (behavior.movement = jGame.move.CALLBACK && behavior.movementCallback) {
			behavior.movementCallback.call(this);
		}
		
		if (this.collideCallbacks) this.doCollide();
		
		// has sprite moved?
		var css;
		if (this.hasMoved) {
			css = {};
			css.left = this.x;
			css.top = this.y;
		}
		
		// has sprite changed size?
		if (this.hasResized) {
			if (!css) css = {};
			css.width = this.w;
			css.height = this.h;
		}
		
		// has animation frame advanced?
		var animation;
		if (this.animation) {
			var bpos = this.animation.update();
			if (bpos) {
				if (!css) css = {};
				css.backgroundPosition = bpos;
			}
		}
		
		// update any changed dom properties
		if (css) this.getElement().css(css);
		
		// get ready for next frame
		this.hasMoved = false;
		this.hasResized = false;
		this.prevLoc = { x:this.x, y:this.y, z:this.z };
		this.rectGlobal = null;
	};
	
	this.doBehaviors = function() {
		var behavior = this.behavior;
		// handle gravity effects
		if (behavior.gravity) {
			//jGame.log(Math.round(this.scene.gravity * behavior.gravity));
			var rect = this.getRectGlobal();
			var bot = rect.y + rect.h;
			var change = Math.round(this.scene.gravity * behavior.gravity);
			if (bot + change < behavior.floor) {
				this.move({ y:change } );
			}
		}
		
		// handle movement effects
		//jGame.log(behavior.movement);
		/*if (behavior.movement === jGame.move.OSCILLATE) {
			jGame.log('do oscillate');
			var loop = behavior.movementOptions.loop;
			var locs = behavior.movementOptions.locations;
		}*/
		
		// handle collision effects
		var collisions = behavior.collisions;
		for (var key in collisions) {
			var sprites = this.scene.find(key);
			if (collisions[key] === jGame.collide.PLATFORM && this.y > this.prevLoc.y) {
				var colliding = false;
				var goalY = this.y;
				this.y = this.prevLoc.y;
				while (!colliding && this.y < goalY) {
					this.y += 1;
					var collided = this.testCollide(sprites, {top:0, right:0, bottom:0, left:0});
					for (var i=0, len=collided.length; i<len; i++) {
						if (this.getCollideDirection(collided[i]) === TOP) {
							colliding = true;
							this.y -= 1;
							break;
						}
					}
				}
			}
		}
	};
	
	// uses same code as collide because it's basically the same logic
	// need to add circular radius for near test (rectangular rigth now)
	this.near = function(str, dist, fn) {
		this.collideCallbacks[str] = {fn: fn, dist:dist};
	};
	
	this.collide = function(str, fn) {
		this.collideCallbacks[str] = {fn:fn, dist:{top:0, right:0, bottom:0, left:0} };
	};
	
	// maybe I could cache the results of all collisions globally in case there's a request for a duplicate
	// not sure if that would be more efficient or not
	// need to figure out how to make collision direction (top, right, bottom, left) be passed through to callbacks
	// need to add uncollide capabilities!
	this.doCollide = function() {
		var prevCollided = this.prevCollided;
		this.prevCollided = [];
		var callbacks = this.collideCallbacks;
		for (var key in callbacks) {
			var callback = callbacks[key];
			var sprites = this.scene.find(key);
			var curCollided = this.testCollide(sprites, callback.dist);
			
			// find first collided
			var firstCollided = subArray(curCollided, prevCollided);
			firstCollided = firstCollided.length ? firstCollided : false;
			
			// find uncollided
			var uncollided = subArray(prevCollided, curCollided);
			uncollided = uncollided.length ? uncollided : false;
			
			// rest are collided
			var collided = subArray(curCollided, firstCollided);
			collided = collided.length ? collided : false;
			
			if (firstCollided || collided || uncollided) {
				callback.fn.call(this, firstCollided, collided, uncollided);
			}
			if (curCollided) this.prevCollided = concat(this.prevCollided, curCollided);
		}
	}
	
	this.testCollide = function(sprites, dist) {
		var collided = [];
		var r1 = this.getRectGlobal();
		r1.x -= dist.left;
		r1.y -= dist.top;
		r1.w += dist.right + dist.left;
		r1.h += dist.bottom + dist.top;
		for (var i=0, len=sprites.length; i<len; i++) {
			// get rectangle
			var sprite = sprites[i];
			var r2 = sprite.getRectGlobal();
			
			// test collision
			if (r1.collide(r2)) {
				collided.push(sprite);
				// re-enable this once pixel collision is working again
				/*if (this.pixelCollision) {
					if (this.pixelCollide(r1, r2, sprite)) collided.push(sprite);
				} else {
					collided.push(sprite);
				}*/
			}
		}
		//return collided;
		if (collided.length) return collided;
		else return false;	// this makes if testing easier for the user
	};
	
	this.getCollideDirection = function(sprite) {
		var center = this.getCenterGlobal();
		var spriteCenter = sprite.getCenterGlobal();
		
		var x1 = center.x,
			y1 = center.y,
			x2 = spriteCenter.x,
			y2 = spriteCenter.y;
			
		// scale x/y difference based on h/w ratio
		var diff = {
			x: (center.x-spriteCenter.x) * this.heightWidthRatio * sprite.heightWidthRatio,
			y: (center.y-spriteCenter.y) * this.widthHeightRatio * sprite.widthHeightRatio
		};
		
		var xDir = (diff.x > 0) ? RIGHT : LEFT;
		var yDir = (diff.y > 0) ? BOTTOM : TOP;
		var direction = (abs(diff.x) > abs(diff.y)) ? xDir : yDir;
		
		return direction;
	};
	
	// the intersection function still needs to be finished
	this.pixelCollide = function(r1, r2, sprite) {
		//var intersect1 = r1.intersect(r2);
		//var intersect2 = r2.intersect(r1);
		return true;
	};
	
	this.getRectGlobal = function() {
		//if (!this.rectGlobal) {
			var coords = this.getLocGlobal();
			this.rectGlobal = new jGame.Rectangle(coords.x, coords.y, this.w, this.h);
		//}
		return this.rectGlobal;
	};
	
	this.setObstacles = function(obstacles) {
		this.obstacles = obstacles;
	};
	
	if (this.pixelCollision && this.image) {
		this.scene.addCollisionMap(this.image, this.pixelCollisionFactor);
	}
	
};
jGame.inherits(jGame.Sprite, jGame.Entity);

jGame.Animation = function(options) {
	this.sprite = options.sprite,
	this.class = options.class,
	this.image = options.image,
	this.frames = options.frames,
	this.distance = options.distance,
	this.framerate = options.framerate;
	this.offsetX = options.offsetX || 0;
	this.offsetY = options.offsetY || 0;
	this.nextUpdate = 0;
	if (!this.image) this.image = this.sprite.image;
	
	// maybe make this use css rules later?
	this.addToSprite = function(sprite) {
		this.sprite = sprite;
		this.sprite.getElement().css({
			'background-position': '-'+ this.offsetX +'px -'+ this.offsetY +'px',
			'background-image': this.image
		});
	};
	
	this.update = function() {
		if (this.nextUpdate <=0) {
			var x = (this.offsetX + this.distance) % (this.distance * this.frames);
			this.offsetX = x;
			var y = this.offsetY;
			//this.sprite.getElement().css('background-position', '-'+ x +'px -'+ y +'px');
			this.nextUpdate = this.framerate;
			return '-'+ x +'px -'+ y +'px';
		} else {
			this.nextUpdate -= FRAMERATE;
			return false;
		}
	};
	/*if (this.sprite.pixelCollision && this.image) {
		this.sprite.scene.addCollisionMap(this.image, this.sprite.pixelCollisionFactor);
	}*/
};

// associative array concatination
function concat(arr1, arr2) {
	for (key in arr2) {
		arr1[key] = arr2[key];
	}
	return arr1;
}

// subtract arr2 from arr1
function subArray(arr1, arr2) {
	var sub = [];
	var count1 = arr1.length;
	var count2 = arr2.length;
	for (var i=0; i<count1; i++) {
		var item = arr1[i];
		if (!inArray(item, arr2)) sub.push(item);
	}
	return sub;
}

function inArray(item, array) {
	var count = array.length;
	for (var i=0; i<count; i++) {
		if (item === array[i]) {
			return true;
		}
	}
	return false;
}

String.prototype.trim = function () {
	return this.replace(/^\s*/, "").replace(/\s*$/, "");
}