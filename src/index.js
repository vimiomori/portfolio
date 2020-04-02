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
    // CanvasInfos
    this.canvas = null;
    this.ctx = null;
    // The current Date
    this.now = 0;
    // Device capture Time
    this.captureTime = 0;
    this.lastCapture = 0;

    this.mouseIsDown = 0;
    this.mouseId = 0;
    this.animationId = undefined;
  };

  start() {
    this.initCanvas();
    this.initInputListener();
    this.initGameObject();
    this.initResizeListener();
    this.run();
  };

  run() {
    const run = () => {
      this.animationId = requestAnimationFrame(run)
      this.now = new Date().getTime();
      this.gameObject.run()
    }
    this.animationId = requestAnimationFrame(run)
  }

  reset() {
    // we call game object reseter
    cancelAnimationFrame(this.animationId)
    this.gameObject = null;
    this.initGameObject()
  };

  // getImage() {
  //   return this.canvas.toDataURL();
  // };
    /**
     * Private Methods
     */
  initCanvas() {
    // create The Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    // we clean the DOM
    this.el.innerHTML = '';
    // append canvas to DOM
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  initResizeListener() {
    window.addEventListener('resize', () => {
      console.log('resize')
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.width;
      this.reset()
      this.run();
    })
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

  initGameObject() {
    this.gameObject = new ChineseInk(this);
    this.gameObject.init();
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
    document.querySelector('#tutorial').addEventListener('click', () => {
      this.mouseUp(event)
      clearInterval(interval)
    });
  }
  
  manageTouch(event) {
    var inputs = [];
    var type = event.type;
    for (var i = 0; i < event.targetTouches.length; ++i) {
      if (type === 'touchstart') {
        type = 'start';
        this.lastCapture = 0;
      }
      else if (type === 'touchmove') {
        type = 'move';
        var now = new Date().getTime();
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
  navy: '#000080',
  yale: '#0E4D92',
  egyption: '#1034A6',
  azure: '#0080FF',
  sapphire: '#0F52BA',
  olympic: '#008ECC',
  maya: '#73C2FB',
  steel: '#4682B4',
  tiffany: '#81D8D0',
  babyBlue: '#89CFF0'
}

class ChineseInk {
  constructor(engine) {
    this.engine = engine
    this.bg_color = colorPalette.space;
    this.colors = Object.values(colorPalette).slice(1);
    // ideal to fine tune your brush!
    this.parameters = {
      squareSize: 10
    };
    this.fluidmap = [];
    this.particles = [];
    this.width = this.engine.width / 20 | 0;
    this.height = this.engine.height / 20 | 0;
    this.inputsDelta = {};
    this.getInput = false;
    this.hasParticles = false;
  }
    /**
     * This function is called after we created your pobject
     */
  init() {
    // Init your experience here
    // example : we paint canvas with blue color
    // Call the initers
    this.engine.ctx.fillStyle = this.bg_color;
    this.engine.ctx.fillRect(0, 0, this.engine.width, this.engine.height);
    for (var x = 0; x <= this.width; ++x) {
      this.fluidmap[x] = [];
      for (var y = 0; y <= this.height; ++y) {
        this.fluidmap[x][y] = {
          x: Math.random() * 2 - 1,  // -1 to 1
          y: Math.random() * 2 - 1
        };
      }
    }
    for (var i = 0; i < 700; ++i) {
      this.particles.push({
        x: Math.random() * this.engine.width,
        y: Math.random() * this.engine.height,
        xs: 0,
        ys: 0,
        c: this.colors[Math.random() * this.colors.length | 0]
      });
    }
  };

  run() {
    this.input();
    this.animate();
    this.render();
  }

  input() {
    for (var i = 0; i < this.engine.inputs.length; ++i) {
      var input = this.engine.inputs[i];
      if (!this.getInput && input.type === 'down') {
        this.getInput = true;
      }
      if (input.type === 'up') {
        continue;
      }
      if (this.inputsDelta[input.id]) {
        var oldInput = this.inputsDelta[input.id];
        var x = input.x / 20 | 0;
        if (x >= this.fluidmap.length) { continue; }
        var y = input.y / 20 | 0;
        var dx = input.x - oldInput.x;
        var dy = input.y - oldInput.y;
        if (dx > 1) { dx = 1; }
        if (dx < -1) { dx = -1; }
        if (dy > 1) { dy = 1; }
        if (dy < -1) { dy = -1; }
        this.fluidmap[x][y].x = dx;
        this.fluidmap[x][y].y = dy;
      }
      this.inputsDelta[input.id] = input;
      const color = this.colors[Math.random() * this.colors.length | 0];
      var a = Math.random() * Math.PI * 2;
      var d = Math.random() * 10;
      this.particles.push({
        x: input.x - Math.sin(a) * d,
        y: input.y + Math.cos(a) * d,
        xs: 0,
        ys: 0,
        c: color
      });
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
  };

  render() {
    this.engine.ctx.strokeStyle = this.bg_color;
    this.engine.ctx.fillStyle = this.bg_color;
    this.engine.ctx.globalAlpha = .4;
    for (var i = 0; i < this.particles.length; ++i) {
      var p = this.particles[i];
      while (this.engine.ctx.globalAlphal < 1) {
        this.engine.ctx.globalAlpha = this.engine.ctx.globalAlpha * 1.05;
      }
      this.engine.ctx.fillStyle = p.c;
      this.engine.ctx.fillRect(p.x, p.y, 1, 2);
    }
    this.engine.ctx.globalAlpha = 1.0;
    if (!this.hasParticles) {
      this.hasParticles = true;
      this.engine.ctx.fillStyle = this.bg_color;
      this.engine.ctx.fillRect(0, 0, this.engine.width, this.engine.height);
    }
  };
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
}
// Main.js

var container = document.getElementById('container')
// var engine = new Engine(container, ChineseInk);
// engine.start();
const engine = new Engine(container)
engine.start();
