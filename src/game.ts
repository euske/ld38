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
    FONT = new Font(IMAGES['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	IMAGES['sprites'], new Vec2(16,16), new Vec2(8,8));
    TILES = new ImageSpriteSheet(
	IMAGES['tiles'], new Vec2(16,16), new Vec2(0,0));
    SCENES = new ImageSpriteSheet(
	IMAGES['scenes'], new Vec2(200,120), new Vec2(100,0));
});


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


//  Scene1
// 
class Scene1 extends PictureScene {
    constructor() {
	super();
	this.image1 = SCENES.get(0);
    }
    init() {
	super.init();
	this.dialogBox.addDisplay(
	    'I am a real estate tycoon guy.\n', 10);
	this.dialogBox.addDisplay(
	    'I build things around.\n', 10);
	let wait = this.dialogBox.addWait();
	wait.ended.subscribe(() => {
	    this.changeScene(new Scene2());
	});
    }
}


//  Scene2
// 
class Scene2 extends PictureScene {
    constructor() {
	super();
	this.image1 = SCENES.get(1);
    }
    init() {
	super.init();
	this.dialogBox.addDisplay(
	    'From this vantage point, everything looks like a dot.\n', 10);
	this.dialogBox.addDisplay(
	    'The world looks very small.\n', 10);
    }
}


//  Player
//
class Player extends Entity {

    scene: Game;
    usermove: Vec2 = new Vec2();

    constructor(scene: Game, pos: Vec2) {
	super(pos);
	this.scene = scene;
	this.sprite.imgsrc = SPRITES.get(0);
	this.collider = this.sprite.getBounds(new Vec2());
    }

    update() {
	super.update();
	this.moveIfPossible(this.usermove);
    }
    
    setMove(v: Vec2) {
	this.usermove = v.scale(4);
    }
    
    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	// Restrict its position within the screen.
	return [this.scene.screen];
    }
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    tilemap: TileMap;
    
    score: number;
    scoreBox: TextBox;

    constructor() {
	super();
	this.scoreBox = new TextBox(this.screen.inflate(-2,-2), FONT);
    }
    
    init() {
	super.init();
	
	this.player = new Player(this, this.screen.center());
	this.add(this.player);

	this.score = 0;
	this.updateScore();
	//APP.setMusic(SOUNDS['music2'], 5.35, 26.55);
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
	super.render(ctx, bx, by);
	this.scoreBox.render(ctx);
    }

    updateScore() {
	this.scoreBox.clear();
	this.scoreBox.putText([this.score.toString()]);
    }
}
