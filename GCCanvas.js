

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

        this.camera = new GCCanvas.Point(this._canvas.width / 2, this._canvas.height / 2, -1000);

        gameloop(this);
    }

    GCCanvas.prototype.update = function (time) {
        var context = this._context;
        context.clearRect(0, 0, this._canvas.width, this._canvas.height);
        /* do updates */

        var self = this;
        this._objects.forEach(function (f) {
            typeof (f.update) === 'function' && f.update(time);
            // ALTERAR
            var r = GCCanvas.PrespectiveProjection(self.camera, f.cur);
            f._draw = new GCCanvas.Point(r.x, r.y);

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

    function Sprite(image, x, y, z) {
        this.cur = new GCCanvas.Point(x, y, z);
        this.mov = this.cur;
        this.delta = GCCanvas.Point.Zero();

        this.image = image;
        this.onMoveEnd = null;

        this.animations = new GCCanvas.Animation();
        this.Frame = 0;

        this._lastupdate = 0;
        this.velocity = 0;
    }

    Sprite.prototype.moveTo = function (point, velocity) {
        this.mov = point;
        this.velocity = (velocity || 0) / 1000;
    }

    Sprite.prototype.update = function (gametime) {
        this.animations.update(gametime);
        if (this.animations.current)
            this.Frame = this.animations.Frame;
        if (this._lastupdate > 0) {
            var timelapsed = gametime - this._lastupdate;
            if (!this.cur.isEqual(this.mov) && this.velocity > 0) {
                var travel = this.velocity * timelapsed;
                var v = new GCCanvas.Vector(this.mov.minus(this.cur));
                var distance = v.getPolar().magnitude;
                if (distance > travel) {
                    var point = v.pointDistantFromOrigin(travel);
                    this.delta = point;
                    this.cur = this.cur.plus(point);
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
            this.image.draw(context, this._draw.x, this._draw.y, this.Frame);
        }
    }

    return Sprite;
})();

GCCanvas.Point = (function () {
    function Point(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;

        this._distancetoorigin = null;
    }

    Point.Precision = 0.0001;

    Point.prototype.minus = function (p) {
        return new Point((this.x - p.x), (this.y - p.y), (this.z - p.z));
    }

    Point.prototype.plus = function (p) {
        return new Point((this.x + p.x), (this.y + p.y), (this.z + p.z));
    }

    Point.prototype.distanceToPoint = function (p) {
        var v = this.minus(p);
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    Point.prototype.distanceToOrigin = function (p) {
        if (this._distancetoorigin === null)
            this._distancetoorigin = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        return this._distancetoorigin;
    }

    Point.prototype.isEqual = function (p) {
        var v = this.minus(p);
        return p.x < Point.Precision && p.y < Point.Precision && p.z < Point.Precision;
    }

    Point.Zero = function () {
        return new Point();
    }

    return Point;
})();

GCCanvas.Vector = (function () {
    function toPolar(point) {
        var mag = point.distanceToOrigin();
        var pol = Math.acos(point.z / mag);
        var azi = Math.atan2(point.y, point.x);
        return { magnitude: mag, polar: pol, azimuth: azi };
    }

    function toCartesian(mag, pol, azi) {
        return new GCCanvas.Point(
            mag * Math.sin(pol) * Math.cos(azi),
            mag * Math.sin(pol) * Math.sin(azi),
            mag * Math.cos(pol));
    }


    function Vector() {
        this._polar = null;
        this._cartesian = null;

        switch (arguments.length) {
            case 1: // point
                this._cartesian = new GCCanvas.Point(arguments[0].x, arguments[0].y, arguments[0].z);
                break;
            case 2: //points
                var v = arguments[1].minus(arguments[0]);
                this._cartesian = v;
                break;
            case 3: // mag + polar angle + azimuthal angle
                this._polar = { magnitude: arguments[0], polar: arguments[1], azimuth: arguments[2] };
                break;
            default: // zero
                this._cartesian = GCCanvas.Point.Zero();
                this._polar = { magnitude: 0, polar: 0, azimuth: 0 };
                break;
        }
    }

    Vector.Precision = 0.0001;

    Vector.prototype.pointDistantFromOrigin = function (distance) {
        var polar = this.getPolar();
        return toCartesian(distance, polar.polar, polar.azimuth);
    }

    Vector.prototype.getCartesian = function () {
        if (this._cartesian === null)
            this._cartesian = toCartesian(this._polar.magnitude, this._polar.polar, this._polar.azimuth);
        return this._vector;
    }

    Vector.prototype.getPolar = function () {
        if (this._polar === null)
            this._polar = toPolar(this._cartesian);
        return this._polar;
    }

    Vector.prototype.isEqual = function (p) {
        return this.getCartesian().isEqual(p.getCartesian());
    }

    Vector.Zero = function () {
        return new Vector();
    }

    return Vector;
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

GCCanvas.PrespectiveProjection = function (eye, point) {
    var epz = eye.z + point.z;
    return {
        x: (eye.z * (point.x - eye.x) / (epz) + eye.x),
        y: (eye.z * (point.y - eye.y) / (epz) + eye.y)
    };
};

GCCanvas.PrespectiveProjectionSize =  function (eye, sz, dst) {
    var epz = eye.z / (eye.z + dst);
    return sz * epz;
}
