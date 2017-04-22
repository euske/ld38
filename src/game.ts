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
addInitHook(() => {
    FONT = new Font(IMAGES['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	IMAGES['sprites'], new Vec2(16,16), new Vec2(8,8));
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
	    let d = Math.sqrt(dx*dx+dy*dy)/r+.1;
	    let a = Math.atan2(dy, dx)/Math.PI + 1.2; // 0..2
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



//  Game
// 
class Game extends Scene {

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
	    'PALE BLUE DOT',
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
	if (dt < 2.5) {
	    let s = 16/(dt*12+0.1);
	    ctx.save();
	    ctx.scale(s, s);
	    this.earth.render(ctx);
	    ctx.restore();
	} else {
	    ctx.fillStyle = 'blue';
	    ctx.fillRect(-2,-2,4,4);
	}
	if (2.0 < dt && dt < 6) {
	    let s = 16/((dt*dt-4.0)*4+0.1);
	    ctx.save();
	    ctx.scale(s, s);
	    this.galaxy.render(ctx);
	    ctx.restore();
	}
	ctx.restore();
	if (this.stage == 3) {
	    this.textBox.render(ctx);
	}
    }
}
