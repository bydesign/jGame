
var PLAYER_SPEED = 7;

$(document).ready(function() {
	// set up scene, nodes and sprites
	var $root = $('#rootElement');
	var game = new jGame($root, {trackKeyPresses:true});
	var scene = game.scene;
	var obstacles = scene.addGroup('obstacles', {});
	var collideSprite = obstacles.addSprite('collideSprite', {x:10, y:300, w:54, h:34, image:'assets/circle.png'});
	
	// add obstacles
	obstacles.addChild('subGroup', {x:10, y:30});
	
	var screenWidth = $root.width();
	var screenHeight = $root.height();
	for (var i=0; i<12; i++) {
		var w = 100;
		var h = 25;
		var x = Math.round( Math.random() * (screenWidth - w) );
		var y = Math.round( Math.random() * (screenHeight - h) );
		var block = obstacles.addSprite('obstacle'+i, {x:x, y:y, w:w, h:h, classes:['obstacle']});
	}
	
	var oscillate = scene.find('#obstacle7')[0];
	oscillate.behavior.change({
		movement: jGame.move.OSCILLATE,
		movementOptions: {
			loop:true,
			locations: [
				{ y:25 },
				{ y:250 } ]
		},
		speed: 7
	});
	
	// main player state
	var REST = 0;
	var WALKE = 1;
	var WALKW = 2;
	var FALL = 3;
	var JUMP = 4;
	var CLIMB = 5;
	var RUNE = 6;
	var RUNW = 7;
	// this adds css class support for states
	game.addState('rest', REST);
	game.addState('walke', WALKE);
	game.addState('walkw', WALKW);
	game.addState('fall', FALL);
	game.addState('jump', JUMP);
	game.addState('climb', CLIMB);
	game.addState('rune', RUNE);
	game.addState('runw', RUNW);
	
	var spriteGroup = scene.addGroup('testingGroup', {x:300, y:200});
	var player = spriteGroup.addSprite('mySprite', {
		x:10, 
		y:30, 
		w:24, 
		h:24, 
		state:REST, 
		pixelCollision:false,
		image:'assets/circle.png',
		//gravity: true,
		//obstacles: scene.find('.obstacle'),
		behavior: {
			gravity: 0.7,	// multiplied by the overall gravity strength of scene
			speed: 7, // number of pixels per frame (not a good method)
			jumpSpeed: 7,	// not implemented
			jumpFalloff: 0.75,	// not implemented
			shield: 1.0,	// not implemented
			damage: 1.0,	// not implemented
			collisions: { '.obstacle':jGame.collide.PLATFORM },
			movement: jGame.move.STATIC,
			floor: $root.height(),
			//movementCallback: ,
			//territory: 
		}
	});
	
	var blueAnimation = new jGame.Animation({
		image:'assets/circle.png',
		class:'blue',
		distance:24,
		frames:8,
		framerate:120,
	});
	var redAnimation = new jGame.Animation({
		image:'assets/circle.png',
		class:'red',
		distance:24,
		frames:8,
		framerate:120,
		offsetY:24,
	});
	player.collide('.obstacle', function(firstCollided, colliding, uncollided) {
		// handle uncollided first in case it uncollides and firstcollides on the same frame
		if (uncollided) {
			console.log('uncollided');
			this.changeAnimation(blueAnimation);
		}
		/*if (colliding) {
			console.log('continuing collision');
		}*/
		if (firstCollided) {
			console.log('first collided');
			this.changeAnimation(redAnimation);
			
			// TOP = 0, RIGHT = 1, BOTTOM = 2, LEFT = 3;
			this.getCollideDirection(firstCollided[0]);
		}
	});
	player.near('#collideSprite', {top:50, right:50, bottom:50, left:50}, function(near, stillNear, notNear) {
		if (near) {
			console.log('entering the neighborhood');
			near[0].fadeOut('slow');
		}
		//if (stillNear) console.log('still hangin out');
		if (notNear) {
			console.log('out of here!');
			notNear[0].fadeIn('slow');
		}
	});
	player.click(function(event) {
		console.log(this);
		console.log(event);
		this.changeState(15);
	});
	player.stateChange(function(prevState) {
		console.log('state change');
	});
	player.changeAnimation(blueAnimation);
	player.addClass('player');
	
	// query the scene
	var nodes = scene.find('.sprite');
	
	// do initial render of html
	scene.render();
	
	player.changeState(FALL);
	
	//var obstacleSprites = scene.find('.obstacle');
	//console.log(obstacleSprites);
	
	// do this every frame
	// called before behavior logic, sprite updates, and dom changes
	scene.tick(function() {
		if(game.keyTracker[WKEY] || game.keyTracker[UP]){ //this is up! (w)
			player.move({y:PLAYER_SPEED*-1.7})
		}
		if(game.keyTracker[SKEY] || game.keyTracker[DOWN]){ //this is down! (s)
			player.move({y:PLAYER_SPEED})
		}
		if(game.keyTracker[AKEY] || game.keyTracker[LEFT]){ //this is left! (a)
			player.move({x:PLAYER_SPEED*-1});
		}
		if(game.keyTracker[DKEY] || game.keyTracker[RIGHT]){ //this is right! (d)
			player.move({x:PLAYER_SPEED});
		}
		/*if(game.keyTracker[SPACE]){// || game.keyTracker[UP]){ //this is right! (space)
			player.move({x:0, y:-JUMP_SPEED});
		}*/
		//console.log('tick');
	});
	game.start();
	//game.pause();
});
