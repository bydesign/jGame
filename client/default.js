console.log('js is running');

var PLAYER_SPEED = 7;
$(document).ready(function() {
	// set up scene, nodes and sprites
	var $root = $('#rootElement');
	var game = new jGame($root, {trackKeyPresses:true});
	var scene = game.scene;
	var obstacles = scene.addNode('obstacles', {});
	var collideSprite = obstacles.addSprite('collideSprite', {x:10, y:300, w:54, h:34, image:'assets/circle.png'});
	
	// add obstacles
	obstacles.addChild('subNode', {x:10, y:30});
	
	var screenWidth = $root.width();
	var screenHeight = $root.height();
	for (var i=0; i<12; i++) {
		var w = 100;
		var h = 25;
		var x = Math.round( Math.random() * (screenWidth - w) );
		var y = Math.round( Math.random() * (screenHeight - h) );
		var block = obstacles.addSprite('obstacle'+i, {x:x, y:y, w:w, h:h, classes:['obstacle']});
	}
	
	var spriteNode = scene.addNode('testingNode', {x:300, y:200});
	var player = spriteNode.addSprite('mySprite', {
		x:10, 
		y:30, 
		w:24, 
		h:24, 
		image:'assets/circle.png', 
		pixelCollision:true,
		gravity: true,
		obstacles: scene.find('.obstacle'),
	});
	player.addAnimation({ distance:24, frames:8, framerate:120 });
	player.addClass('player');
	
	// query the scene
	var nodes = scene.find('.sprite');
	
	// do initial render of html
	scene.render();
	
	// main player state
	var REST = 0
	var WALKE = 1;
	var WALKW = 2;
	var FALL = 3;
	var JUMP = 4;
	var CLIMB = 5;
	var RUNE = 6;
	var RUNW = 7;
	
	var JUMP_SPEED = 14;
	
	var STATE = REST;
	
	var obstacleSprites = scene.find('.obstacle');
	//console.log(obstacleSprites);
	
	// do this every frame
	scene.onTick(function() {
		/*if(game.keyTracker[WKEY]){ //this is up! (w)
			player.move(0, PLAYER_SPEED*-1)
		}
		if(game.keyTracker[SKEY]){ //this is down! (s)
			player.move(0, PLAYER_SPEED)
		}*/
		if(game.keyTracker[AKEY] || game.keyTracker[LEFT]){ //this is left! (a)
			player.move(PLAYER_SPEED*-1, 0);
		}
		if(game.keyTracker[DKEY] || game.keyTracker[RIGHT]){ //this is right! (d)
			player.move(PLAYER_SPEED, 0);
		}
		if(game.keyTracker[SPACE] || game.keyTracker[UP]){ //this is right! (space)
			player.move(0, -JUMP_SPEED);
		}
		
	});
	game.start();
	//game.pause();
});
