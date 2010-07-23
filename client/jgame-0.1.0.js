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
var GRAVITY = 7;


function jGame(rootElement, options) {
	this.trackKeyPresses = options.trackKeyPresses;
	this.scene = new jGame.Scene(rootElement);
	this.scene.rootNode = new jGame.Node('root', {x:0, y:0, z:0, scene:this.scene});
	this.interval = null;
	
	this.start = function() {
		var game = this;
		this.interval = setInterval(function() {
			game.scene.tick();
		}, FRAMERATE);
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
}

jGame.inherits = function(childCtor, parentCtor) {
	/** @constructor */
	function tempCtor() {};
	tempCtor.prototype = parentCtor.prototype;
	childCtor._super = parentCtor.prototype;
	childCtor.prototype = new tempCtor();
	childCtor.prototype.constructor = childCtor;
};

var UNIT = 'px';
var TICK = 50;	// tick every 50 milliseconds (20 fps)

jGame.Scene = function(rootElement) {
	this.rootElement = rootElement;
	this.rootNode = null;	// autocreated when jGame is instantiated
	this.callbacks = [];	// functions that run every "tick"
	this.entities = [];		// contains all sprites & nodes in an associative array by id
	this.entitiesByClass = [];	// contains lists of sprites & nodes by class name
	this.sprites = [];	// list of all sprite objects
	this.collisionMaps = [];
	
	this.canvas = $('#canvas')[0];
	this.canvasContext = this.canvas.getContext('2d');	// used for creating pixel collision maps
	
	// function append callbacks to be called on every frame
	this.onTick = function(fn) {
		this.callbacks.push(fn);
	};
	
	// called every frame
	this.tick = function() {
		for (var i=0; i<this.callbacks.length; i++) {
			this.callbacks[i]();
		}
		var count = this.sprites.length;
		for (var i=0; i<count; i++) {
			this.sprites[i].update();
		}
	};
	
	// not implemented yet
	this.buildFromDom = function() {
		console.log('buildFromDom');
	};
	
	// only called once to set everything up
	this.render = function() {
		//var stack = [];
		/*for (var i=0; i<this.nodes.length; i++) {
			stack = stack.concat(this.nodes[i].render());
		}*/
		var stack = this.rootNode.render();
		var str = stack.join('');
		console.log(str);
		this.rootElement.html(str);
		this.renderCSS();
	};
	
	this.renderCSS = function() {
		// set up some basic styles
		var stack = [];
		stack['.sprite'] = [];
		stack['.node'] = [];
		stack['.sprite']['position'] = 'absolute';
		stack['.node']['position'] = 'absolute';
		
		// gather per-object styles from scene tree
		for (var key in this.entities) {
			stack = concat(stack, this.entities[key].renderCSS());
		}
		console.log(stack);
		
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
	
	this.addNode = function(id, options) {
		options.scene = this;
		var node = new jGame.Node(id, options);
		if (!node.parent) {	// if no parent is specified, parent it under the root node
			node.parent = this.rootNode;
			this.rootNode.children.push(node);
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
				if (subparts[0].indexOf('#') == 0) return this.entities[subparts[0].substr(1)];
				else if (subparts[0].indexOf('.') == 0) return this.entitiesByClass[subparts[0].substr(1)];
			} else {
				// need to implement tree filtered searching
				// also need to implement multi-filtering (ie '.sprite.missile')
				console.log('tree filtering not implemented yet');
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
			console.log('do these pixel maps collide?');
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

jGame.Entity = function(id, options) {
	this.id = id,
	this.x = options.x || 0,
	this.y = options.y || 0,
	this.z = options.z,
	this.parent = options.parent,
	this.element = options.element;
	this.scene = options.scene || this.parent.scene;
	this.classes = [];
	
	this.getIdStr = function() {
		return '#' + this.id;
	};
	
	this.move = function(x, y) {
		this.x += x,
		this.y += y;
		
		this.getElement().css({ top:this.y, left:this.x });
	};
	
	this.getElement = function() {
		if (!this.element) this.element = $('#' + this.id);
		return this.element;
	};
	
	this.addClass = function(str) {
		this.classes.push(str);
		this.scene.addToClass(this, str);
	};
	
	this.getLocGlobal = function() {
		if (this.parent) {
			var coords = this.parent.getLocGlobal();
			return { x: this.x+coords.x, y:this.y+coords.y }
		} else {
			return { x:this.x, y:this.y }
		}
	};
	
	if (options.classes) {
		for (var i=0; i<options.classes.length; i++) {
			this.addClass(options.classes[i]);;
		}
	}
}

jGame.Node = function(id, options) {
	jGame.Entity.call(this, id, options);
	
	this.children = [],
	this.sprites = [];
	this.addClass('node');
	
	this.addChild = function(id, options) {
		options.parent = this;
		var child = this.scene.addNode(id, options);
		//console.log(child);
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
		var arr = ['<div id="', this.id, '" class="', this.classes.join(' '), '">'];
		for (var i=0; i<this.children.length; i++) {
			arr = arr.concat(this.children[i].render());
		}
		for (var i=0; i<this.sprites.length; i++) {
			arr = arr.concat(this.sprites[i].render());
		}
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
};
jGame.inherits(jGame.Node, jGame.Entity);

jGame.Sprite = function(id, options) {
	jGame.Entity.call(this, id, options);
	
	this.pixelCollision = options.pixelCollision || false,
	this.pixelCollisionFactor = options.pixelCollisionFactor || 50,
	this.image = options.image,
	this.w = options.w,
	this.h = options.h,
	this.offsetX = options.offsetX || 0,
	this.offsetY = options.offsetY || 0,
	this.animation = options.animation;
	this.gravity = options.gravity || false;
	this.obstacles = options.obstacles || [];
	this.addClass('sprite');
	
	this.move = function(x, y) {
		this.x += x,
		this.y += y;
	};
	
	this.render = function() {
		return ['<div id="', id, '" class="', this.classes.join(' '), '"></div>'];
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
	
	this.update = function() {
		// gravity, falling & jumping
		if (this.gravity) {
			this.y += GRAVITY;
			var colliders = this.collide(this.obstacles);
			//console.log(this.obstacles);
			if (colliders) {
				var fac = 1;
				this.y -= GRAVITY;
				while (!this.collide(colliders)) {
					this.y += fac;
				}
			}
		}
		
		// update position
		this.getElement().css({ top:this.y, left:this.x });
		
		// update animation
		if (this.animation) {
			this.animation.update();
		}
	};
	
	this.collide = function(sprites) {
		var collided = [];
		var r1 = this.getRectGlobal();
		for (var i=0; i<sprites.length; i++) {
			// get rectangle
			var sprite = sprites[i];
			var r2 = sprite.getRectGlobal();
			
			// test collision
			if (r1.collide(r2)) {
				if (this.pixelCollision) {
					if (this.pixelCollide(r1, r2, sprite)) collided.push(sprite);
				} else {
					collided.push(sprite);
				}
			}
		}
		//return collided;
		if (collided.length) return collided;
		else return false;	// this makes if testing easier for the user
	};
	
	// the intersection function still needs to be finished
	this.pixelCollide = function(r1, r2, sprite) {
		//var intersect1 = r1.intersect(r2);
		//var intersect2 = r2.intersect(r1);
		return true;
	};
	
	this.getRectGlobal = function() {
		var coords = this.getLocGlobal();
		var rect = new jGame.Rectangle(coords.x, coords.y, this.w, this.h);
		//console.log(rect);
		return rect;
	};
	
	this.setObstacles = function(obstacles) {
		this.obstacles = obstacles;
	};
	
	if (this.pixelCollision && this.image) {
		this.scene.addCollisionMap(this.image, this.pixelCollisionFactor);
	}
	
};
jGame.inherits(jGame.Sprite, jGame.Entity);

jGame.Animation = function(sprite, options) {
	this.sprite = sprite,
	this.image = options.image,
	this.frames = options.frames,
	this.distance = options.distance,
	this.framerate = options.framerate;
	this.offsetX = this.sprite.offsetX;
	this.offsetY = this.sprite.offsetY;
	this.nextUpdate = 0;
	if (!this.image) this.image = this.sprite.image;
	
	this.update = function() {
		if (this.nextUpdate <=0) {
			var x = (this.offsetX + this.distance) % (this.distance * this.frames);
			this.offsetX = x;
			var y = this.offsetY;
			this.sprite.getElement().css('background-position', '-'+ x +'px -'+ y +'px');
			this.nextUpdate = this.framerate;
		} else {
			this.nextUpdate -= FRAMERATE;
		}
	};
	if (this.sprite.pixelCollision && this.image) {
		this.sprite.scene.addCollisionMap(this.image, this.sprite.pixelCollisionFactor);
	}
};

// associative array concatination
function concat(arr1, arr2) {
	for (key in arr2) {
		arr1[key] = arr2[key];
	}
	return arr1;
}

String.prototype.trim = function () {
	return this.replace(/^\s*/, "").replace(/\s*$/, "");
}