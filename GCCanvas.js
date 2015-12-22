

var GCCanvas = (function () {
    var requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        setTimeout(callback, 1000 / 60);
    };

    function gameloop(obj, time) {
        obj.update(time);
        requestAnimFrame((function (o) {
            return function (t) { gameloop(o, t); };
        })(obj));
    }

    function GCCanvas(canvasid) {
        var self = this;
        this._canvas = document.getElementById(canvasid);
        if (this._canvas === null)
            throw "Canvas with id " + canvasid + " not found.";
        if (this._canvas.getContext === undefined)
            throw "Canvas with id " + canvasid + " is not a valid element.";

        this._context = this._canvas.getContext("2d");

        this.onUpdate = null;

        this._objects = [];
        this.objects = {
            add: function (obj) {
                self._objects.push(obj);
                obj._canvas = self;
            },
            remove: function (obj) {
                var idx = self._objects.indexOf(obj)
                if (idx >= 0) {
                    obj._canvas = null;
                    self._objects.splice(idx, 1);
                }
            },
            clear: function () {
                self._objects.forEach(function (f) {
                    f._canvas = null;
                });
                self._objects = [];
            },
            get: function () { return self._objects; },
            at: function (index) { return self._objects[index]; }
        };
        gameloop(this);
    }

    GCCanvas.prototype.update = function (time) {
        var context = this._context;
        context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        /* do updates */
        this._objects.forEach(function (f) {
            typeof (f.update) === 'function' && f.update(time);
        });

        typeof (this.onUpdate) === 'function' && this.onUpdate(time);

        this._objects.forEach(function (f) {
            typeof (f.draw) === 'function' && f.draw(context);
        });
    };

    return GCCanvas;
})();

GCCanvas.Animation = (function () {
    var _default_fps = 24;

    function Animation() {
        this.animations = {};

        this.current = null;
        this.running = false;
        this._nextframetime = null;
        this.FrameNumber = 0;
        this.Frame = null;
    }

    Animation.prototype.add = function (name, frames, fps) {
        this.animations[name] = { frames: frames, fps: fps || _default_fps };
    }

    Animation.prototype.play = function (name) {
        if (this.animations[name] === undefined)
            throw "Animation wiyh name " + name + " not found.";
        this.current = this.animations[name];
        this.FrameNumber = 0;
        this.Frame = this.current.frames[0];
        this._nextframetime = null;
        this.running = true;
    }

    Animation.prototype.stop = function () {
        this.running = false;
        this._nextframetime = null;
    }

    Animation.prototype.resume = function () {
        this.running = true;
    }

    Animation.prototype.update = function (gametime) {
        if (this.current && this.running) {
            if (gametime >= this._nextframetime) {
                if (this._nextframetime !== null)
                    this.FrameNumber++;
                this._nextframetime = gametime + 1000 / this.current.fps;
            }

            if (this.FrameNumber >= this.current.frames.length)
                this.FrameNumber = 0;

            this.Frame = this.current.frames[this.FrameNumber];
        }
    }

    return Animation;
})();

GCCanvas.Move = (function () {
    function Move(from, to, speed) {
        this.cur = from;
        this.to = to;
        this.speed = speed;
        this.delta = { x: 0, y: 0 };
        this._lastpos = from;
        this._lastupdate = 0;
    }

    return Move;
})();

GCCanvas.Image = (function () {
    function Image(id, src, frame_width, frame_height, loadedcb) {
        var self = this;
        this._img = document.createElement('img');
        this._img.onload = function () {
            var h = this.naturalHeight || this.height,
                w = this.naturalWidth || this.width,
                fH = frame_height ? Math.min(h, frame_height) : h,
                nH = Math.floor(h / fH),
                fW = frame_width ? Math.min(w, frame_width) : w,
                nW = Math.floor(w / fW);
            self.FrameCount = nH * nW;
            for (var i = 0; i < nH; i++) {
                for (var j = 0; j < nW; j++) {
                    self.Frames[j + i * nW] = { x: fW * j, y: fH * i };
                }
            }

            self.Loaded = true;
            self.height = fH;
            self.width = fW;

            loadedcb && loadedcb(self);
        };
        this._img.src = src;
        this.Loaded = false;
        this.FrameCount = 0;
        this.Frames = {};
    }

    Image.prototype.draw = function (context, x, y, frame) {
        var f = frame && this.Frames[frame] || { x: 0, y: 0 };

        context.drawImage(this._img, f.x, f.y, this.height, this.width, x || 0, y || 0, this.height, this.width);

    }

    return Image;
})();

GCCanvas.Sprite = (function () {
    var _default_fps = 24;

    function Sprite(image, x, y) {
        this.cur = { x: x, y: y };
        this.mov = this.cur;
        this.delta = { x: 0, y: 0 };

        this.image = image;
        this.onMoveEnd = null;

        this.animations = new GCCanvas.Animation();
        this.Frame = 0;

        this._lastupdate = 0;
        this.velocity = 0;
    }

    Sprite.prototype.moveTo = function (x, y, velocity) {
        this.mov = { x: x, y: y };
        this.velocity = (velocity || 0) / 1000;
    }

    Sprite.prototype.update = function (gametime) {
        this.animations.update(gametime);
        if (this.animations.current)
            this.Frame = this.animations.Frame;
        if (this._lastupdate > 0) {
            var timelapsed = gametime - this._lastupdate;
            if ((this.mov.x !== this.cur.x || this.mov.y !== this.cur.y) && this.velocity > 0) {
                var travel = this.velocity * timelapsed;
                var v = { x: (this.mov.x - this.cur.x), y: (this.mov.y - this.cur.y) };
                var theta = Math.atan2(v.y, v.x);
                var distance = Math.sqrt(v.x * v.x + v.y * v.y);
                if (distance > travel) {
                    this.delta = { x: Math.cos(theta) * travel, y: Math.sin(theta) * travel };
                    this.cur.x += this.delta.x;
                    this.cur.y += this.delta.y;
                }
                else {
                    this.cur = this.mov;
                    this.delta = v;
                }

            }

        }
        this._lastupdate = gametime;
    }

    Sprite.prototype.draw = function (context) {
        if (this.image.Loaded) {
            this.image.draw(context, this.cur.x, this.cur.y, this.Frame);
        }
    }

    return Sprite;
})();


/* Helper functions */
GCCanvas.range = function (start, end, step) {
    if (start === undefined) return [];
    if (arguments.length === 1) {
        start = 0;
        end = start;
        step = start < end ? 1 : -1;
    }
    else {
        step = step || (start < end ? 1 : -1);
    }
    var arr = new Array((end - start) / step);
    for (var i = 0; i < arr.length; i++)
        arr[i] = step * i + start;
    return arr;
}
