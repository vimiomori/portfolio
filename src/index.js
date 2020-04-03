import { ResizeSensor } from 'css-element-queries'
// forked from https://codepen.io/hexapode/pen/EapgoZ
// Lib.js
class Engine {
  constructor(el) {
    // container infos
    this.el = el;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.deltaTop = this.el.offsetTop;
    this.deltaLeft = this.el.offsetLeft;
    // an Array of inputs
    this.inputs = [];
    // background canvas
    this.background = null;
    this.bgCtx = null;
    // paint canvas
    this.canvas = null;
    this.ctx = null;
    // The current Date
    this.startTime = new Date().getTime();
    this.now = 0;
    // // Device capture Time
    // this.captureTime = 0;
    // this.lastCapture = 0;
    this.mouseIsDown = 0;
    this.mouseId = 0;
    this.animationId = undefined;
  };

  start() {
    this.initCanvas();
    this.initInputListener();
    this.initInk();
    this.initResizeListener();
    this.initClearListener();
    this.run();
  };

  run() {
    const run = () => {
      this.animationId = requestAnimationFrame(run)
      this.now = new Date().getTime();
      if (this.now - this.startTime < 60000) {
        this.ink.run()
      } else {
        cancelAnimationFrame(this.animationId)
      }
    }
    this.animationId = requestAnimationFrame(run)
  }

  reset() {
    // we call game object reseter
    cancelAnimationFrame(this.animationId)
    this.ink = null;
    this.initInk()
  };

  // getImage() {
  //   return this.canvas.toDataURL();
  // };
    /**
     * Private Methods
     */
  initCanvas() {
    // create The Canvas
    this.background = document.createElement('canvas');
    this.background.width = this.width;
    this.background.height = this.height;
    this.background.classList.add('background')
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.classList.add('paint')
    // we clean the DOM
    this.el.innerHTML = '';
    // append canvas to DOM
    this.el.appendChild(this.background);
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.bgCtx = this.background.getContext('2d');
  }

  initResizeListener() {
    window.addEventListener('resize', () => {
      console.log('resize')
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.width;
      this.background.width = this.width;
      this.background.height = this.height;
      this.reset()
      this.run();
    })
  }

  initClearListener() {
    this.canvas.addEventListener('mousedown', () => {
      cancelAnimationFrame(this.animationId)
      this.clear();
    })
  }

  clear() {
    this.ink.initClear();
    const clear = () => {
      this.animationId = requestAnimationFrame(clear)
      this.ink.clear()
    }
    this.animationId = requestAnimationFrame(clear)
  }

  initInputListener() {
    // Multitouch Events!
    this.manageMouseOver();
    this.canvas.addEventListener('touchstart', (event) => this.manageTouch(event));
    this.canvas.addEventListener('touchmove', (event) => this.manageTouch(event));
    this.canvas.addEventListener('touchend', (event) => this.manageTouch(event));
    this.canvas.addEventListener('touchleave', (event) => this.manageTouch(event));
    this.canvas.addEventListener('touchcancel', (event) => this.manageTouch(event));
    this.canvas.addEventListener('touchenter', (event) => this.manageTouch(event));
    this.canvas.addEventListener('mousemove', (event) => this.mouseMove(event));
  }

  initInk() {
    this.ink = new Ink(this);
    this.ink.init();
  }

  /**
   * Inputs methods
   */

  manageMouseOver() {
    let interval = null
    let event = null
    this.canvas.addEventListener('mouseover', (e) => {
      event = e
      this.mouseDown(event)
      interval = setInterval(() => {
        this.mouseMove(event)
      }, 100000)
    });
    this.canvas.addEventListener('mouseout', (e) => {
      clearInterval(interval)
      this.mouseUp(e)
    })
  }
  
  manageTouch(event) {
    const inputs = [];
    const type = event.type;
    for (let i = 0; i < event.targetTouches.length; ++i) {
      if (type === 'touchstart') {
        type = 'start';
        this.lastCapture = 0;
      }
      else if (type === 'touchmove') {
        type = 'move';
        const now = new Date().getTime();
        if (this.lastCapture) {
          this.captureTime = this.lastCapture - now;
        }
        this.lastCapture = now;
      }
      else {
        type = 'up';
        this.lastCapture = 0;
      }
      targetTouches = event.targetTouches[i];
      inputs.push({
        x: targetTouches.clientX - this.deltaLeft - window.scrollX,
        y: targetTouches.clientY - this.deltaTop + window.scrollY,
        id: targetTouches.identifier,
        type: type
      });
    }
    event.preventDefault();
    event.stopPropagation();
    this.inputs = inputs;
  }
  mouseDown(event) {
    this.mouseIsDown = 1;
    this.lastCapture = 0;
    this.inputs = [{
      x: event.clientX - this.deltaLeft - window.scrollX,
      y: event.clientY - this.deltaTop + window.scrollY,
      id: ++this.mouseId,
      type: 'down'
    }];
  }
  mouseMove(event) {
    if (this.mouseIsDown) {
      this.inputs = [{
        x: event.clientX - this.deltaLeft - window.scrollX,
        y: event.clientY - this.deltaTop + window.scrollY,
        id: this.mouseId,
        type: 'move'
      }];
    }
  }
  mouseUp(event) {
    this.mouseIsDown = 0;
    this.lastCapture = 0;
    this.inputs = [{
      x: event.clientX - this.deltaLeft - window.scrollX,
      y: event.clientY - this.deltaTop + window.scrollY,
      id: this.mouseId,
      type: 'up'
    }];
  }

}

const colorPalette = {
  space: '#1D2951',
  yale: '#0E4D92',
  egyption: '#1034A6',
  // azure: '#0080FF',
  // sapphire: '#0F52BA',
  olympic: '#008ECC',
  maya: '#73C2FB',
  // steel: '#4682B4',
  tiffany: '#81D8D0',
  babyBlue: '#89CFF0'
}

class Ink {
  constructor(engine) {
    this.engine = engine
    this.bg_colors = this.gradient(colorPalette.space, colorPalette.tiffany, 500);
    this.round = 0;
    this.darken = false;
    this.colors = Object.values(colorPalette);
    // ideal to fine tune your brush!
    this.parameters = {
      squareSize: 10
    };
    this.fluidmap = [];
    this.particles = [];
    // this.oldParticles = [];
    this.width = this.engine.width / 20 | 0;
    this.height = this.engine.height / 20 | 0;
    this.inputsDelta = {};
    this.getInput = false;
    this.hasParticles = false;
    this.topParticles = {};
    this.fallParticles = [];

  }
    /**
     * This function is called after we created your pobject
     */
  init() {
    // Init your experience here
    // example : we paint canvas with blue color
    // Call the initers
    for (let x = 0; x <= this.width; ++x) {
      this.fluidmap[x] = [];
      for (let y = 0; y <= this.height; ++y) {
        this.fluidmap[x][y] = {
          x: null,
          y: null
        };
      }
    }
  };

  run() {
    this.input();
    this.animate();
    this.changeBg();
    this.render();
  }

  input() {
    for (let i = 0; i < this.engine.inputs.length; ++i) {
      let input = this.engine.inputs[i];
      if (!this.getInput && input.type === 'down') {
        this.getInput = true;
      }
      if (input.type === 'up') {
        continue;
      }
      if (this.inputsDelta[input.id]) {
        const oldInput = this.inputsDelta[input.id];
        const x = input.x / 20 | 0;
        if (x >= this.fluidmap.length) { continue; }
        const y = input.y / 20 | 0;
        let dx = input.x - oldInput.x;
        let dy = input.y - oldInput.y;
        if (dx > 1.2) { dx = 1.2; }
        if (dx < -1.2) { dx = -1.2; }
        if (dy > 1) { dy = 1; }
        if (dy < -1) { dy = -1; }
        this.fluidmap[x][y].x = dx;
        this.fluidmap[x][y].y = dy;
      }
      this.inputsDelta[input.id] = input;
      const color = this.colors[Math.random() * this.colors.length | 0];
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 10;
      const x = input.x - Math.sin(a) * d
      const y = input.y + Math.cos(a) * d
      if (this.particles.length > 0) {
        const prevParticle = this.particles[this.particles.length - 1]
        if (Math.abs(prevParticle.x - x) > 3) {
          this.fillGap(prevParticle, x, y, color)
        }
      }
      [1, 2, 3].forEach(() => {this.particles.push({
        x: x,
        y: y,
        xs: 0,
        ys: 0,
        c: color
      })});
    }
  }

  // prepClear() {
  //   this.oldParticles.push(...this.particles)
  //   if (!this.oldParticles) { return; }
  //   this.oldParticles.reverse();
  //   this.engine.ctx.strokeStyle = this.bg_color;
  //   this.engine.ctx.fillStyle = this.bg_color;
  //   this.engine.ctx.globalAlpha = 1;
  // }

  // clear() {
  //   this.prepClear();
  //   for (var i = 0; i < this.oldParticles.length; ++i) {
  //     const p = this.oldParticles[i];
  //     // this.engine.ctx.fillStyle = p.c;
  //     this.engine.ctx.fillRect(p.x, p.y, 1, 1);
  //   }
  // }

  fillGap(pp, x , y, c) {
    const dx = x - pp.x
    const dy = y - pp.y
    if (!dx) { return; }
    if (dx > 0) {
      const step = dy ? dx / Math.abs(dy) | 0 : 0
      for (let i = 0; i < dx; ++i) {
        if (i % step === 0) {
          dy > 0 ? y += 1 : y -= 1
        }
        this.particles.push({
          x: pp.x + i,
          y: y,
          xs: 0,
          ys: 0,
          c: c
        });
      };
    } else {
      const step = dy ? -dx / Math.abs(dy) | 0 : 0
      for (let i = 0; i > dx; --i) {
        if (Math.abs(i % step) === 0) {
          dy > 0 ? y += 1 : y -= 1
        }
        this.particles.push({
          x: pp.x + i,
          y: y,
          xs: 0,
          ys: 0,
          c: c
        });
      };
    }
  }

  animate() {
    const newFluid = [];
    for (let x = 0; x < this.width; ++x) {
      newFluid[x] = [];
      for (let y = 0; y < this.height; ++y) {
        let dx = this.fluidmap[x][y].x * .8;
        let dy = this.fluidmap[x][y].y * .8;
        if (x > 0) {
          dx += this.fluidmap[x - 1][y].x * .05;
          dy += this.fluidmap[x - 1][y].y * .05;
        }
        if (x < this.width - 1) {
          dx += this.fluidmap[x + 1][y].x * .05;
          dy += this.fluidmap[x + 1][y].y * .05;
        }
        if (y > 0) {
          dx += this.fluidmap[x][y - 1].x * .05;
          dy += this.fluidmap[x][y - 1].y * .05;
        }
        if (y < this.height - 1) {
          dx += this.fluidmap[x][y + 1].x * .05;
          dy += this.fluidmap[x][y + 1].y * .05;
        }
        newFluid[x][y] = {
          x: dx,
          y: dy
        };
      }
    }
    this.fluidmap = newFluid;
    for (let i = 0; i < this.particles.length; ++i) {
      const p = this.particles[i];
      p.xs -= p.xs / 15;
      p.ys -= p.ys / 5;
      if (p.x >= 0 && (p.x / 20 | 0) < this.width && p.y >= 0 && (p.y / 20 | 0) < this.height) {
        p.xs += this.fluidmap[p.x / 20 | 0][p.y / 20 | 0].x;
        p.ys += this.fluidmap[p.x / 20 | 0][p.y / 20 | 0].y;
      }
      p.x += p.xs;
      p.y += p.ys;
      if (p.x < 0 || p.x > this.engine.width) {
        p.xs = -p.xs;
      }
      if (p.y < 0 || p.y > this.engine.height) {
        p.xs = -p.xs;
      }
    }
    if (this.particles.length > 2000) {
      this.particles.splice(0, this.particles.length - 2000)
    }
  };

  changeBg() {
    this.engine.bgCtx.strokeStyle = this.bg_colors[this.round];
    this.engine.bgCtx.fillStyle = this.bg_colors[this.round];
    this.engine.bgCtx.globalAlpha = 1.0;
    this.engine.bgCtx.fillRect(0, 0, this.engine.width, this.engine.height);
    if (this.round < 500) {
      ++this.round
    } else {
      this.bg_colors = this.gradient(
        this.engine.bgCtx.fillStyle,
        this.colors[Math.random() * this.colors.length | 0],
        500
      );
      this.round = 0;
    }
  }

  render() {
    this.engine.ctx.strokeStyle = this.bg_color;
    this.engine.ctx.fillStyle = this.bg_color;
    this.engine.ctx.globalAlpha = .4;
    for (var i = 0; i < this.particles.length; ++i) {
      while (this.engine.ctx.globalAlphal < 1) {
        this.engine.ctx.globalAlpha = this.engine.ctx.globalAlpha * 1.05;
      }
      const p = this.particles[i];
      this.engine.ctx.fillStyle = p.c;
      this.engine.ctx.fillRect(p.x, p.y, 1, 1);
      this.updateTopParticles(p)
    }
    this.engine.ctx.globalAlpha = 1.0;
    if (!this.hasParticles) {
      this.hasParticles = true;
    }
    // console.log(this.topParticles)
  };

  updateTopParticles(p) {
    const x = Math.round(p.x)
    const top = this.topParticles[x]
    if (!top) {this.topParticles[x] = [p.y, p.c]}
    else if (p.y < top[0]) {this.topParticles[x] = [p.y, p.c]}
    else {return;}
  }
  /**
   * This function is called when user click reset button
   */
  reset() {
    // Here handle what happen when user click reset button
    // TIPS : Clean the canvas or paint it with bg color
    // TIPS2 : Throw away all your particles!
    // example : we paint canvas with blue color
    this.engine.ctx.fillStyle = this.bg_color;
    this.engine.ctx.fillRect(0, 0, this.engine.width, this.engine.height);
  };
  /**
   * This function is called when this brush will be deleted
   */
  // destroy() {
    // Do wathever you should do here (kill timer?)
    // We will Destroy this object when we leave this function
  // };

  clear() {
    this.animateClear();
    this.renderClear();
  }

  initClear() {
    for (let p in this.topParticles) {
      this.fallParticles.push({
        x: parseFloat(p),
        y: this.topParticles[p][0],
        c: this.colors[Math.random() * this.colors.length | 0],
        ys: 5
      })
    }
  }

  animateClear() {
    for (let i = 0; i < this.fallParticles.length; ++i) {
      const p = this.fallParticles[i];
      p.y += p.ys
      // p.ys = p.ys > 1 ? p.ys - 1 : p.ys
    }
  }

  renderClear() {
    for (var i = 0; i < this.fallParticles.length; ++i) {
      const p = this.fallParticles[i];
      this.engine.ctx.globalAlpha = 1.0;
      this.engine.ctx.fillStyle = p.c;
      this.engine.ctx.fillRect(p.x, p.y, 1, 3);
    }
    // this.fallParticles.forEach(p => {
    //   this.engine.ctx.fillStyle = p.c;
    //   this.engine.ctx.strokeStyle = p.c;
    //   // console.log(parseFloat(p), this.topParticles[p])
    //   this.engine.ctx.fillRect(p.x, p.y, 1, 1)
    // })
  }

  gradient(startColor, endColor, steps) {
    const start = {
            'Hex'   : startColor,
            'R'     : parseInt(startColor.slice(1,3), 16),
            'G'     : parseInt(startColor.slice(3,5), 16),
            'B'     : parseInt(startColor.slice(5,7), 16)
    }
    const end = {
            'Hex'   : endColor,
            'R'     : parseInt(endColor.slice(1,3), 16),
            'G'     : parseInt(endColor.slice(3,5), 16),
            'B'     : parseInt(endColor.slice(5,7), 16)
    }
    const diffR = end['R'] - start['R'];
    const diffG = end['G'] - start['G'];
    const diffB = end['B'] - start['B'];

    const stepsHex  = new Array();
    const stepsR    = new Array();
    const stepsG    = new Array();
    const stepsB    = new Array();

    for(var i = 0; i <= steps; i++) {
      stepsR[i] = start['R'] + ((diffR / steps) * i);
      stepsG[i] = start['G'] + ((diffG / steps) * i);
      stepsB[i] = start['B'] + ((diffB / steps) * i);
      stepsHex[i] = '#' + Math.round(stepsR[i]).toString(16) + '' + Math.round(stepsG[i]).toString(16) + '' + Math.round(stepsB[i]).toString(16);
    }
    return stepsHex;
  }
}
// Main.js

const container = document.getElementById('container')
const engine = new Engine(container)
engine.start();
