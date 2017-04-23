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
let THATGUY:HTMLImageSource;
let AREAS:SimpleSpriteSheet;
addInitHook(() => {
    FONT = new ShadowFont(IMAGES['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	IMAGES['sprites'], new Vec2(16,16), new Vec2(8,8));
    TILES = new ImageSpriteSheet(
	IMAGES['tiles'], new Vec2(16,16), new Vec2(0,0));
    SCENES = new ImageSpriteSheet(
	IMAGES['scenes'], new Vec2(200,120), new Vec2(100,0));
    THATGUY = new HTMLImageSource(
	IMAGES['scenes'], new Rect(60,46,80,60), new Rect(0,0,80,60));
    AREAS = new SimpleSpriteSheet([
	null,
	new RectImageSource('rgb(0,255,0, 0.3)', new Rect(0,0,16,16)),
	new RectImageSource('rgb(255,0,0, 0.3)', new Rect(0,0,16,16)),
    ]);
});

enum T {
    ROAD = 0,
    ROAD_V = 1,
    ROAD_H = 2,
    XING_V = 3,
    XING_H = 4,
    WALL = 5,
    SIDEWALK = 6,
    SIDEWALK_G = 7,
    SIDEWALK_F = 8,
};
enum A {
    NONE = 0,
    GOOD = 1,
    BAD = 2,
};

const GW = 10;
const GH = 10;
const COLOR_ROAD = new Color(100,100,100);
const COLOR_SIDEWALK = new Color(200,200,200);
const COLOR_BAD = new Color(255,0,0);
const COLOR_GOOD = new Color(0,255,0);
const COLOR_NONE = new Color(0,0,127);

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

function getDollar(x: number) {
    return (x < 0)? ('-$'+Math.abs(x)) : ('$'+x);
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
	let color1 = new Color(0,0,255);
	let color2 = new Color(0,255,0);
	let color3 = new Color(255,255,255);
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
	APP.setMusic(SOUNDS['intro'], MP3_GAP, 8.0);
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
	    'Every morning, I find the best parking spot for my food truck.\n');
	this.dialogBox.addDisplay(
	    'The city space is limited. It\'s packed with competitors.\n');
	let wait = this.dialogBox.addWait();
	wait.ended.subscribe(() => {
	    this.changeScene(new Game());
	});
    }
}


//  Kitty
//
class Kitty extends Entity {
    constructor(pos: Vec2) {
	super(pos);
	this.sprite.imgsrc = SPRITES.get(8, 1);
	this.collider = this.sprite.getBounds(new Vec2()).inflate(-4,-4);
    }
}


//  Car
//
class Car extends Entity {

    scene: Game;
    tilemap: TileMap;
    type: number;
    movement: Vec2 = new Vec2();
    braked: boolean = false;
    
    lastdir: Vec2 = new Vec2();

    constructor(scene: Game, tilemap: TileMap, pos: Vec2, type=0) {
	super(pos);
	this.scene = scene;
	this.tilemap = tilemap;
	this.type = type;
	this.sprite.imgsrc = SPRITES.get(0, this.type);
	this.collider = this.sprite.getBounds(new Vec2()).inflate(-1,-1);
    }

    update() {
	super.update();
	this.run();
	this.moveIfPossible(this.movement.scale(4));
	if (!this.movement.isZero()) {
	    this.lastdir = this.movement.copy();
	}
	let index = (this.braked)? 4 : 0;
	if (this.lastdir.y < 0) {
	    index += 0;
	} else if (0 < this.lastdir.x) {
	    index += 1;
	} else if (0 < this.lastdir.y) {
	    index += 2;
	} else if (this.lastdir.x < 0) {
	    index += 3;
	}
	this.sprite.imgsrc = SPRITES.get(index, this.type);
    }

    run() {
    }
    
    getObstaclesFor(range: Rect, v: Vec2, context=null as string): Rect[] {
	return this.tilemap.getTileRects(this.tilemap.isObstacle, range);
    }
    
    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	return [this.tilemap.bounds];
    }
}


//  Enemy
//
class Enemy extends Car {

    timeout = 0;
    
    constructor(scene: Game, tilemap: TileMap, pos: Vec2, movement: Vec2) {
	super(scene, tilemap, pos, 1);
	this.movement = movement;
    }

    update() {
	super.update();
	if (0 < this.timeout) {
	    this.timeout--;
	}
    }
    
    run() {
	let ts = this.tilemap.tilesize;
	let v = this.movement;
	let dx = this.pos.x % ts;
	let dy = this.pos.y % ts;
	if (6 < dx && dx < 10 && 6 < dy && dy < 10 &&
	    this.timeout == 0 && rnd(2)) {
	    let x = Math.floor(this.pos.x/ts) % GW;
	    let y = Math.floor(this.pos.y/ts) % GH;
	    if (x == GW-2 && y == GH-2) {
		if (v.x == 0 && v.y != 0) {
		    v = new Vec2(-1,0); // down -> left
		} else if (v.x != 0 && v.y == 0) {
		    v = new Vec2(0,+1); // left -> down
		}
	    } else if (x == GW-1 && y == GH-2) {
		if (v.x != 0 && v.y == 0) {
		    v = new Vec2(0,-1); // left -> up
		} else if (v.x == 0 && v.y != 0) {
		    v = new Vec2(-1,0); // up -> left
		}
	    } else if (x == GW-2 && y == GH-1) {
		if (v.x != 0 && v.y == 0) {
		    v = new Vec2(0,+1); // right -> down
		} else if (v.x == 0 && v.y != 0) {
		    v = new Vec2(+1,0); // down -> right
		}
	    } else if (x == GW-1 && y == GH-1) {
		if (v.x == 0 && v.y != 0) {
		    v = new Vec2(+1,0); // up -> right
		} else if (v.x != 0 && v.y == 0) {
		    v = new Vec2(0,-1); // right -> up
		}
	    }
	    let v1 = v.scale(4);
	    if (this.getMove(this.pos, v1).equals(v1)) {
		this.timeout = 10;
		this.movement = v;
	    }
	} else {
	    let v1 = v.scale(4);
	    if (!this.getMove(this.pos, v1).equals(v1)) {
		this.movement = v.rot90(rnd(2)? +1 : -1);
	    }
	}
    }
    
}


//  MoneyParticle
//
class MoneyParticle extends Projectile {
    
    constructor(pos: Vec2, money: number) {
	super(pos);
	let textbox = new TextBox(new Rect(0,0,32,10), FONT);
	this.sprite.imgsrc = textbox;
	this.movement = new Vec2(0, (0 < money)? -4 : +4);
	this.lifetime = 0.5;
	textbox.putText([getDollar(money)], 'center', 'center');
    }
}


//  Player
//
class Player extends Car {

    scoring: number = 0;

    constructor(scene: Game, tilemap: TileMap, pos: Vec2) {
	super(scene, tilemap, pos, 0);
    }

    update() {
	super.update();
	if (this.scoring != 0 && rnd(10) == 0) {
	    let score = this.scoring * rnd(1,10);
	    this.scene.addScore(score);
	    this.scene.add(new MoneyParticle(this.pos, score));
	    playSound((0 < score)? SOUNDS['profit'] : SOUNDS['loss']);
	}
    }

    setMove(v: Vec2) {
	if ((v.x == this.movement.x && v.y == -this.movement.y) ||
	    (v.x == -this.movement.x && v.y == this.movement.y)) {
	    // brake
	    this.movement = new Vec2();
	    this.braked = true;
	    this.scoring = this.scene.checkScore(this.getCollider() as Rect);
	} else if ((v.x != 0 && v.y == 0) || (v.x == 0 && v.y != 0)) {
	    // steer
	    this.movement = v.copy();
	    this.braked = false;
	    this.scoring = 0;
	}
    }

    collidedWith(entity: Entity) {
	if (entity instanceof Enemy) {
	    let score = -rnd(10,100);
	    this.scene.addScore(score);
	    this.scene.add(new MoneyParticle(this.pos, score));
	    entity.stop();
	    playSound(SOUNDS['explosion']);
	} else if (entity instanceof Kitty) {
	    let score = -50;
	    this.scene.addScore(score);
	    this.scene.add(new MoneyParticle(this.pos, score));
	    entity.stop();
	    playSound(SOUNDS['kitty']);
	}
    }
}


// mkCityMap
function mkCityMap(hsize: number, vsize: number, nobjs=8) {
    let tilemap = new TileMap(16, hsize*GW, vsize*GH);
    for (let i = 0; i < vsize; i++) {
	let y = i*GH;
	for (let j = 0; j < hsize; j++) {
	    let x = j*GW;
	    tilemap.fill(T.SIDEWALK, new Rect(x,y,GW-2,GH-2));
	    tilemap.fill(T.WALL, new Rect(x+1,y+1,GW-4,GH-4));
	    tilemap.fill(T.ROAD_V, new Rect(x+GW-2,y+1,2,GH-4));
	    tilemap.fill(T.ROAD_H, new Rect(x+1,y+GH-2,GW-4,2));
	    tilemap.set(x+GW-2,y, T.XING_H);
	    tilemap.set(x+GW-1,y, T.XING_H);
	    tilemap.set(x+GW-2,y+GH-3, T.XING_H);
	    tilemap.set(x+GW-1,y+GH-3, T.XING_H);
	    tilemap.set(x,y+GH-2, T.XING_V);
	    tilemap.set(x,y+GH-1, T.XING_V);
	    tilemap.set(x+GW-3,y+GH-2, T.XING_V);
	    tilemap.set(x+GW-3,y+GH-1, T.XING_V);
	    let n = rnd(nobjs);
	    for (let k = 0; k < n; k++) {
		let p = rndPt(GW-2, GH-2);
		tilemap.set(x+p.x, y+p.y,
			    (rnd(2)==0)? T.SIDEWALK_G :  T.SIDEWALK_F);
	    }
	}
    }
    return tilemap;
}

function mkCityImage(citymap: TileMap, areamap: TileMap, pos: Vec2) {
    let canvas = createCanvas(citymap.width, citymap.height);
    let ctx = getEdgeyContext(canvas);
    let img = ctx.createImageData(canvas.width, canvas.height);
    let data = img.data;
    let i = 0;
    for (let y = 0; y < citymap.height; y++) {
	for (let x = 0; x < citymap.width; x++) {
	    let c = citymap.get(x, y);
	    let a = areamap.get(x, y);
	    let color: Color;
	    switch (c) {
	    case T.WALL:
		switch (a) {
		case A.GOOD:
		    color = COLOR_GOOD;
		    break;
		case A.BAD:
		    color = COLOR_BAD;
		    break;
		default:
		    color = COLOR_NONE;
		    break;
		}
		break;
	    case T.SIDEWALK:
	    case T.SIDEWALK_G:
	    case T.SIDEWALK_F:
		color = COLOR_SIDEWALK;
		break;
	    default:
		color = COLOR_ROAD;
		break;
	    }
	    data[i++] = color.r;
	    data[i++] = color.g;
	    data[i++] = color.b;
	    data[i++] = 255;
	}
    }
    ctx.putImageData(img, 0, 0);
    let rect = citymap.coord2map(pos);
    ctx.fillStyle = 'yellow';
    ctx.fillRect(rect.x-1, rect.y-1, rect.width+2, rect.height+2);
    return canvas;
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    citymap: TileMap;
    areamap: TileMap;
    
    cityimg: CanvasImageSource;

    t0: number;
    ending: boolean;
    scale: number;
    transition: boolean;
    mapalpha: number;
    
    score: number;
    scoreBox: TextBox;
    scoreLimit: number;

    constructor() {
	super();
	this.scoreBox = new TextBox(new Rect(4,4,64,16), FONT);
	this.scoreBox.background = 'rgba(0,0,0,0.7)';
	this.scoreBox.padding = 4;
    }
    
    init() {
	super.init();

	this.citymap = mkCityMap(10, 10);
	this.citymap.isObstacle = ((c:number) => {
	    return (c < 0 || c == T.WALL || T.SIDEWALK <= c);
	});
	this.areamap = new TileMap(16, this.citymap.width, this.citymap.height);
	
	let p = new Vec2(8, 8);
	this.player = new Player(
	    this, this.citymap, 
	    this.citymap.map2coord(p).center());
	this.add(this.player);

	for (let i = 0; i < 100; i++) {
	    let x = rnd(10);
	    let y = rnd(10);
	    let v;
	    let side = rnd(2);
	    if (rnd(2) == 0) {
		p = new Vec2(x*10+8+side, y*10+rnd(8));
		v = new Vec2(0, side? -1 : +1);
	    } else {
		p = new Vec2(x*10+rnd(8), y*10+8+side);
		v = new Vec2(side? +1 : -1, 0);
	    }
	    let enemy = new Enemy(
		this, this.citymap,
		this.citymap.map2coord(p).center(), v);
	    this.add(enemy);
	}

	for (let i = 0; i < 20; i++) {
	    let x = rnd(10);
	    let y = rnd(10);
	    if (rnd(2) == 0) {
		p = new Vec2(x*10+8+rnd(2), y*10+rnd(8));
	    } else {
		p = new Vec2(x*10+rnd(8), y*10+8+rnd(2));
	    }
	    let kitty = new Kitty(this.citymap.map2coord(p).center());
	    this.add(kitty);
	}

	this.score = 0;
	this.updateScore();
	this.updateMap();
	
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

	if (this.transition) {
	    let dt = getTime()-this.t0;
	    if (dt < 1.0) {
		this.mapalpha = dt;
	    } else if (dt < 2.0) {
		if (this.scoreLimit <= 0) {
		    this.updateMap();
		    playSound(SOUNDS['change']);
		}
	    } else if (dt < 3.0) {
		this.mapalpha = 3.0-dt;		
	    } else {
		this.endTransition();
	    }
	}
    }

    onDirChanged(v: Vec2) {
	this.player.setMove(v);
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);

	if (this.ending && 0 < this.scale) {
	    ctx.save();
	    ctx.translate(
		this.screen.width*(1-this.scale)/2,
		this.screen.height*(1-this.scale)/2);
	    ctx.scale(this.scale, this.scale);
	}
	if (this.transition) {
	    ctx.save();
	    ctx.globalAlpha = 1.0-this.mapalpha;
	}
	let window = this.player.pos.expand(160, 120);
	this.layer.setCenter(this.citymap.bounds, window);
	this.citymap.renderWindowFromBottomLeft(
	    ctx, bx, by, this.layer.window,
	    (x,y,c) => { return TILES.get((0 <= c)? c : T.WALL); });
	this.citymap.renderWindowFromBottomLeft(
	    ctx, bx, by, this.layer.window,
	    (x,y,c) => {
		let a = this.areamap.get(x,y);
		if (c <= T.XING_H) {
		    return AREAS.get(a);
		}
		return null;
	    });
	super.render(ctx, bx, by);
	this.scoreBox.render(ctx);
	if (this.transition) {
	    ctx.restore();
	}
	if (this.ending && 0 < this.scale) {
	    ctx.restore();
	}

	if (this.transition) {
	    ctx.save();
	    ctx.globalAlpha = this.mapalpha;
	    ctx.save();
	    ctx.translate(this.screen.width/2+32, this.screen.height/2);
	    this.cityimg.render(ctx);
	    ctx.restore();
	    ctx.translate(4, 4);
	    THATGUY.render(ctx);
	    ctx.restore();
	}
    }

    updateMap() {
	this.areamap.fill(A.NONE);
	for (let i = 0; i < 10; i++) {
	    let x = rnd(10)*GW;
	    let y = rnd(10)*GH;
	    for (let dy = -1; dy < GH-1; dy++) {
		for (let dx = -1; dx < GW-1; dx++) {
		    this.areamap.set(x+dx, y+dy, A.GOOD);
		}
	    }
	}
	for (let i = 0; i < 10; i++) {
	    let x = rnd(10)*GW;
	    let y = rnd(10)*GH;
	    for (let dy = -1; dy < GH-1; dy++) {
		for (let dx = -1; dx < GW-1; dx++) {
		    this.areamap.set(x+dx, y+dy, A.BAD);
		}
	    }
	}
	this.cityimg = new CanvasImageSource(
	    mkCityImage(this.citymap, this.areamap, this.player.pos),
	    new Rect(-this.citymap.width, -this.citymap.height,
		     this.citymap.width*2, this.citymap.height*2));
	this.scoreLimit = 10;//rnd(100)+50;
    }

    checkScore(rect: Rect) {
	if (this.areamap.findTileByCoord((a:number) => { return a == A.GOOD; }, rect)) {
	    return +1;
	} else if (this.areamap.findTileByCoord((a:number) => { return a == A.BAD; }, rect)) {
	    return -1;
	} else {
	    return 0;
	}
    }

    addScore(score: number) {
	this.score += score;
	this.updateScore();
	this.scoreLimit -= Math.max(0, score);
	if (this.scoreLimit <= 0) {
	    this.startTransition();
	}
    }

    updateScore() {
	this.scoreBox.clear();
	this.scoreBox.putText([getDollar(this.score)], 'right');
    }

    startEnding() {
	this.t0 = getTime();
	this.ending = true;
	this.transition = false;
	playSound(SOUNDS['zoom']);
    }

    startTransition() {
	this.t0 = getTime();
	this.tasklist.suspended = true;
	this.transition = true;
	this.mapalpha = 0;
    }

    endTransition() {
	this.tasklist.suspended = false;
	this.transition = false;
    }
}
