/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///

function mkGalaxy(
    r: number, color: Color) {
    let canvas = createCanvas(r*2, r*2);
    let ctx = getEdgeyContext(canvas);
    let img = ctx.createImageData(r*2, r*2);
    let data = img.data;
    let i = 0;
    for (let dy = -r; dy < r; dy++) {
	let v = Math.random()-0.5;
	for (let dx = -r; dx < r; dx++) {
	    let d = Math.sqrt(dx*dx+dy*dy)/r+.1;
	    let a = Math.atan2(dy, dx)/Math.PI + 1.2; // 0..2
	    let prob = fmod(a, d)/d*(1.2-d);
	    if (Math.random() < prob) {
		data[i++] = color.r;
		data[i++] = color.g;
		data[i++] = color.b;
		data[i++] = 255;
	    } else {
		i += 4;
	    }
	}
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

function mkEarth(
    r: number, color1: Color, color2: Color, color3: Color) {
    let canvas = createCanvas(r*2, r*2);
    let ctx = getEdgeyContext(canvas);
    let img = ctx.createImageData(r*2, r*2);
    let data = img.data;
    let a = new Array(r*2);
    for (let x = 0; x < r*2; x++) {
	a[x] = Math.random()-0.5;
    }
    let i = 0;
    for (let dy = -r; dy < r; dy++) {
	let v = Math.random()-0.5;
	for (let dx = -r; dx < r; dx++) {
	    if (dx*dx+dy*dy < r*r) {
		let x = dx+r;
		v = (a[x]+v)/2.0 + (Math.random()-0.5)*0.1;
		v = clamp(-2, v, +1);
		a[x] = v;
		let color = (v < 0)? color1 : ((v < 0.1)? color2 : color3);
		data[i++] = color.r;
		data[i++] = color.g;
		data[i++] = color.b;
		data[i++] = 255;
	    } else {
		i += 4;
	    }
	}
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}


//  Initialize the resources.
let FONT: Font;
let SPRITES:ImageSpriteSheet;
addInitHook(() => {
    FONT = new Font(IMAGES['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	IMAGES['sprites'], new Vec2(16,16), new Vec2(8,8));
});


//  Player
//
class Player extends Entity {

    scene: Game;
    usermove: Vec2;

    constructor(scene: Game, pos: Vec2) {
	super(pos);
	this.scene = scene;
	this.sprite.imgsrc = SPRITES.get(0);
	this.collider = this.sprite.getBounds(new Vec2());
	this.usermove = new Vec2();
    }

    update() {
	super.update();
	this.moveIfPossible(this.usermove);
    }
    
    setMove(v: Vec2) {
	this.usermove = v.scale(4);
    }
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    scoreBox: TextBox;
    score: number;

    earth: HTMLCanvasElement = null;
    galaxy: HTMLCanvasElement = null;
    
    init() {
	super.init();
	this.scoreBox = new TextBox(this.screen.inflate(-8,-8), FONT);
	this.player = new Player(this, this.screen.center());
	this.add(this.player);
	this.score = 0;
	this.updateScore();
    }

    update() {
	super.update();
    }

    onDirChanged(v: Vec2) {
	this.player.setMove(v);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	
	if (this.earth === null) {
	    let color1 = new Color(0,0,255);
	    let color2 = new Color(0,255,0);
	    let color3 = new Color(255,255,255);
	    this.earth = mkEarth(20, color1, color2, color3);
	}
	ctx.drawImage(this.earth, 50, 50);
	if (this.galaxy === null) {
	    this.galaxy = mkGalaxy(60, new Color(255,255,255));
	}
	ctx.drawImage(this.galaxy, 100, 100);
	
	//super.render(ctx, bx, by);
	//this.scoreBox.render(ctx);
    }

    updateScore() {
	this.scoreBox.clear();
	this.scoreBox.putText(['SCORE: '+this.score]);
    }
}
