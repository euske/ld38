/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///

//  Initialize the resources.
let FONT: Font;
let SPRITES:ImageSpriteSheet;
let TILES:ImageSpriteSheet;
let SCENES:ImageSpriteSheet;
addInitHook(() => {
    FONT = new ShadowFont(IMAGES['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	IMAGES['sprites'], new Vec2(16,16), new Vec2(8,8));
    TILES = new ImageSpriteSheet(
	IMAGES['tiles'], new Vec2(16,16), new Vec2(0,0));
    SCENES = new ImageSpriteSheet(
	IMAGES['scenes'], new Vec2(200,120), new Vec2(100,0));
});

enum T {
    EMPTY = 0,
    ROAD_V = 1,
    ROAD_H = 2,
    XING_V = 3,
    XING_H = 4,
    WALL = 5,
    SIDEWALK = 6,
    SIDEWALK_G = 7,
    SIDEWALK_F = 8,
};

function rndPt(w: number, h: number) {
    let n = rnd(w*2+h*2);
    if (n < w) {
	return new Vec2(n, 0);
    }
    n -= w;
    if (n < w) {
	return new Vec2(n, h-1);
    }
    n -= w;
    if (n < h) {
	return new Vec2(0, n);
    }
    n -= h;
    return new Vec2(w-1, n);
}

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
	    let x = dx*0.6+dy*0.4;
	    let y = dy*0.8+dx*0.2;
	    let d = Math.sqrt(x*x+y*y)/r*1.4+.1;
	    let a = Math.atan2(y, x)/Math.PI + 1.2; // 0..2
	    let prob = fmod(a, d)/d*(1.2-d);
	    if (Math.random() < prob) {
		data[i++] = color.r*255;
		data[i++] = color.g*255;
		data[i++] = color.b*255;
		data[i++] = color.a*255;
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
		data[i++] = color.r*255;
		data[i++] = color.g*255;
		data[i++] = color.b*255;
		data[i++] = color.a*255;
	    } else {
		i += 4;
	    }
	}
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

class Star2 {
    p: Vec2;
    z: number;
    s: number;
}

class ZoomStarsImageSource implements ImageSource {
    
    bounds: Rect;
    maxdepth: number;
    imgsrc: ImageSource;
    adding = true;
    
    private _stars: Star2[] = [];

    constructor(bounds: Rect, nstars: number, maxdepth=100) {
	this.bounds = bounds
	this.maxdepth = maxdepth;
	this.imgsrc = new RectImageSource('white', new Rect(0,0,1,1));
	for (let i = 0; i < nstars; i++) {
	    let star = new Star2();
	    star.p = new Vec2(
		(Math.random()-0.5)*this.bounds.width*8,
		(Math.random()-0.5)*this.bounds.height*8);
	    star.z = 1+rnd(30);
	    star.s = (Math.random()*20+10);
	    this._stars.push(star);
	}
    }

    getBounds(): Rect {
	return this.bounds;
    }

    render(ctx: CanvasRenderingContext2D) {
	ctx.save();
	ctx.translate(int(this.bounds.x), int(this.bounds.y));
	let c = this.bounds.center();
	for (let star of this._stars) {
	    ctx.save();
	    let z = star.z;
	    ctx.translate(c.x+star.p.x/z, c.y+star.p.y/z);
	    let s = star.s/z;
	    ctx.scale(s, s);
	    this.imgsrc.render(ctx);
	    ctx.restore();
	}
	ctx.restore();
    }
    
    update() {
	for (let star of this._stars) {
	    star.z += 0.5;
	    if (this.adding) {
		let s = star.s/star.z;
		if (s < 1) {
		    star.p = new Vec2(
			(Math.random()-0.5)*this.bounds.width*8,
			(Math.random()-0.5)*this.bounds.height*8);
		    star.z = 1;
		}
	    }
	}
    }
}


//  Ending
// 
class Ending extends Scene {

    earth: CanvasImageSource;
    galaxy: CanvasImageSource;
    stars: ZoomStarsImageSource;
    textBox: TextBox;
    startTime = 0;
    stage = 0;
    
    constructor() {
	super();
	let color1 = new Color(0,0,1);
	let color2 = new Color(0,1,0);
	let color3 = new Color(1,1,1);
	this.earth = new CanvasImageSource(mkEarth(20, color1, color2, color3));
	this.galaxy = new CanvasImageSource(mkGalaxy(60, color3));
	this.stars = new ZoomStarsImageSource(this.screen, 100);
	this.textBox = new TextBox(
	    new Rect(0, this.screen.height/2, this.screen.width, this.screen.height/2),
	    FONT);
	this.textBox.lineSpace = 8;
	this.textBox.putText([
	    'DOT',
	    'LUDUM DARE 38 "A SMALL WORLD"',
	    'THANKS FOR PLAYING'
	], 'center', 'center');
    }

    init() {
	super.init();
	this.startTime = getTime();
	this.stage = 0;
    }

    update() {
	super.update();
	this.stars.update();
	let dt = getTime() - this.startTime;
	switch (this.stage) {
	case 0:
	    playSound(SOUNDS['zoom']);
	    this.stage = 1;
	    break;
	case 1:
	    if (2.5 < dt) {
		this.stage = 2;
		playSound(SOUNDS['zoom']);
	    }
	    break;
	case 2:
	    if (5 < dt) {
		this.stage = 3;
	    }
	    break;
	case 3:
	    if (6 < dt) {
		this.stars.adding = false;
		this.stage = 4;
		APP.setMusic(SOUNDS['ending']);
	    }
	    break;
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);

	let dt = getTime() - this.startTime;
	if (0.5 < dt) {
	    this.stars.render(ctx);
	}
	ctx.save();
	ctx.translate(this.screen.width/2, this.screen.height/2);
	if (dt < 3.5) {
	    let s = 16/(dt*12+0.1);
	    ctx.save();
	    ctx.scale(s, s);
	    this.earth.render(ctx);
	    ctx.restore();
	} else {
	    ctx.fillStyle = 'blue';
	    ctx.fillRect(-2,-2,4,4);
	}
	if (2.0 < dt && dt < 7) {
	    let s = 16/((dt*dt-4.0)*4+0.1);
	    ctx.save();
	    ctx.scale(s, s);
	    this.galaxy.render(ctx);
	    ctx.restore();
	}
	ctx.restore();
	if (3 <= this.stage) {
	    this.textBox.render(ctx);
	}
    }
}


//  PictureScene
// 
class PictureScene extends GameScene {

    dialogBox: DialogBox;
    image0: ImageSource = null;
    image1: ImageSource = null;
    alpha: number = 0;

    constructor() {
	super();
	let lineHeight = 8;
	let lineSpace = 8;
	let padding = 10;
	let width = this.screen.width-16;
	let height = (lineHeight+lineSpace)*6-lineSpace+padding*2;
	let rect = this.screen.resize(width, height, 0, -1).move(0,-8);
	let textbox = new TextBox(rect, FONT);
	textbox.padding = padding;
	textbox.lineSpace = lineSpace;
	textbox.background = 'rgba(0,0,0,0.5)'
	this.dialogBox = new DialogBox(textbox);
    }

    init() {
	super.init();
	this.add(this.dialogBox);
    }

    update() {
	super.update();
	if (this.alpha < 1.0) {
	    this.alpha = upperbound(1.0, this.alpha+0.05);
	}
    }

    onKeyDown(key: number) {
	super.onKeyDown(key);
	this.dialogBox.onKeyDown(key);
    }    

    onMouseDown(p: Vec2, button: number) {
	super.onMouseDown(p, button);
	this.dialogBox.onMouseDown(p, button);
    }    

    onMouseUp(p: Vec2, button: number) {
	super.onMouseUp(p, button);
	this.dialogBox.onMouseUp(p, button);
    }    

    onMouseMove(p: Vec2) {
	super.onMouseMove(p);
	this.dialogBox.onMouseMove(p);
    }    

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	ctx.save();
	ctx.translate(bx, by);
	ctx.translate(this.screen.width/2, 0);
	if (this.image0 !== null) {
	    ctx.globalAlpha = 1.0-this.alpha;
	    this.image0.render(ctx);
	}
	if (this.image1 !== null) {
	    ctx.globalAlpha = this.alpha;
	    this.image1.render(ctx);
	}
	ctx.restore();
	super.render(ctx, bx, by);
	// draw a textbox border.
	let rect = this.dialogBox.textbox.frame.inflate(-2,-2);
	ctx.strokeStyle = 'white';
	ctx.lineWidth = 2;
	ctx.strokeRect(bx+rect.x, by+rect.y, rect.width, rect.height);
    }
    
    changeScene(scene: Scene) {
	if (scene instanceof PictureScene) {
	    scene.image0 = this.image1;
	}
	super.changeScene(scene);
    }
}


//  Intro
// 
class Intro1 extends PictureScene {
    constructor() {
	super();
	this.image1 = SCENES.get(0);
    }
    init() {
	super.init();
	this.dialogBox.addDisplay(
	    'I am a real estate tycoon guy.\n');
	this.dialogBox.addDisplay(
	    'I build things around.\n');
	let wait = this.dialogBox.addWait();
	wait.ended.subscribe(() => {
	    this.changeScene(new Intro2());
	});
    }
}

class Intro2 extends PictureScene {
    constructor() {
	super();
	this.image1 = SCENES.get(1);
    }
    init() {
	super.init();
	this.dialogBox.addDisplay(
	    'From this vantage point, everything looks like a dot.\n');
	this.dialogBox.addDisplay(
	    'The world looks very small.\n');
	let wait = this.dialogBox.addWait();
	wait.ended.subscribe(() => {
	    this.changeScene(new Intro3());
	});
    }
}

class Intro3 extends PictureScene {
    constructor() {
	super();
	this.image1 = SCENES.get(2);
    }
    init() {
	super.init();
	this.dialogBox.addDisplay(
	    'I\'m a food vendor guy.\n');
	this.dialogBox.addDisplay(
	    'This entire city is my battlefield.\n');
	this.dialogBox.addDisplay(
	    'Every morning, I find the best parking spot for my food truck.\n');
	let wait = this.dialogBox.addWait();
	wait.ended.subscribe(() => {
	    this.changeScene(new Game());
	});
    }
}


//  Car
//
class Car extends Entity {

    scene: Game;
    tilemap: TileMap;
    type: number;
    movement: Vec2 = new Vec2(0,-1);

    constructor(scene: Game, tilemap: TileMap, pos: Vec2, type=0) {
	super(pos);
	this.scene = scene;
	this.tilemap = tilemap;
	this.type = type;
	this.sprite.imgsrc = SPRITES.get(0, this.type);
	this.collider = this.sprite.getBounds(new Vec2());
    }

    update() {
	super.update();
	this.moveIfPossible(this.movement.scale(8));
	if (this.movement.y < 0) {
	    this.sprite.imgsrc = SPRITES.get(0, this.type);
	} else if (0 < this.movement.x) {
	    this.sprite.imgsrc = SPRITES.get(1, this.type);
	} else if (0 < this.movement.y) {
	    this.sprite.imgsrc = SPRITES.get(2, this.type);
	} else if (this.movement.x < 0) {
	    this.sprite.imgsrc = SPRITES.get(3, this.type);
	}
    }
    
    getObstaclesFor(range: Rect, v: Vec2, context=null as string): Rect[] {
	return this.tilemap.getTileRects(this.tilemap.isObstacle, range);
    }
    
    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	return [this.tilemap.bounds];
    }
}


//  Player
//
class Player extends Car {
    
    setMove(v: Vec2) {
	if ((v.x == this.movement.x && v.y == -this.movement.y) ||
	    (v.x == -this.movement.x && v.y == this.movement.y)) {
	    // brake
	    this.movement = new Vec2();
	} else if ((v.x != 0 && v.y == 0) || (v.x == 0 && v.y != 0)) {
	    // steer
	    this.movement = v.copy();
	}
    }
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    tilemap: TileMap;

    t0: number;
    ending: boolean;
    scale: number;
    
    score: number;
    scoreBox: TextBox;

    constructor() {
	super();
	this.scoreBox = new TextBox(new Rect(4,4,80,16), FONT);
	this.scoreBox.background = 'rgba(0,0,0,0.7)';
	this.scoreBox.padding = 4;
    }
    
    init() {
	super.init();

	this.tilemap = new TileMap(16, 100, 100);
	this.tilemap.isObstacle = ((c:number) => {
	    return (c < 0 || c == T.WALL || T.SIDEWALK <= c);
	});
	for (let i = 0; i < 10; i++) {
	    let y = i*10;
	    for (let j = 0; j < 10; j++) {
		let x = j*10;
		this.tilemap.fill(T.SIDEWALK, new Rect(x,y,8,8));
		this.tilemap.fill(T.WALL, new Rect(x+1,y+1,6,6));
		this.tilemap.fill(T.ROAD_V, new Rect(x+8,y+1,2,6));
		this.tilemap.fill(T.ROAD_H, new Rect(x+1,y+8,6,2));
		this.tilemap.set(x+8,y, T.XING_H);
		this.tilemap.set(x+9,y, T.XING_H);
		this.tilemap.set(x+8,y+7, T.XING_H);
		this.tilemap.set(x+9,y+7, T.XING_H);
		this.tilemap.set(x,y+8, T.XING_V);
		this.tilemap.set(x,y+9, T.XING_V);
		this.tilemap.set(x+7,y+8, T.XING_V);
		this.tilemap.set(x+7,y+9, T.XING_V);
		let n = rnd(8);
		for (let k = 0; k < n; k++) {
		    let p = rndPt(8, 8);
		    this.tilemap.set(x+p.x, y+p.y,
				     (rnd(2)==0)? T.SIDEWALK_G :  T.SIDEWALK_F);
		}
	    }
	}

	let p = new Vec2(8, 8);
	this.player = new Player(
	    this, this.tilemap, 
	    this.tilemap.map2coord(p).center());
	this.add(this.player);

	this.score = 0;
	this.updateScore();
	//APP.setMusic(SOUNDS['music2'], 5.35, 26.55);

	this.t0 = 0;
	this.ending = false;
	this.scale = 0;
    }

    update() {
	super.update();
	
	if (this.ending) {
	    let dt = getTime()-this.t0;
	    this.scale = 1.0/(dt*dt+1);
	    if (this.scale < 0.05) {
		this.changeScene(new Ending());
	    }
	}
    }

    onDirChanged(v: Vec2) {
	this.player.setMove(v);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);

	if (0 < this.scale) {
	    ctx.save();
	    ctx.translate(
		this.screen.width*(1-this.scale)/2,
		this.screen.height*(1-this.scale)/2);
	    ctx.scale(this.scale, this.scale);
	}
	let window = this.player.pos.expand(160, 120);
	this.layer.setCenter(this.tilemap.bounds, window);
	this.tilemap.renderWindowFromBottomLeft(
	    ctx, bx, by, this.layer.window,
	    (x,y,c) => { return TILES.get((0 <= c)? c : T.WALL); });
	super.render(ctx, bx, by);
	this.scoreBox.render(ctx);
	if (0 < this.scale) {
	    ctx.restore();
	}
    }

    updateScore() {
	this.scoreBox.clear();
	this.scoreBox.putText([this.score.toString()]);
    }

    startEnding() {
	this.t0 = getTime();
	this.ending = true;
	playSound(SOUNDS['zoom']);
    }
}
