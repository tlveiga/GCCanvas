export namespace Geometry {
  export class Point {
    public static Precision: number = 0.0001;

    public static get Zero() {
      return new Point(0, 0, 0);
    }

    constructor(public x: number, public y: number, public z: number) {
    }

    public minus(p: Point): Point {
      return new Point((this.x - p.x), (this.y - p.y), (this.z - p.z));
    }

    public plus(p: Point): Point {
      return new Point((this.x + p.x), (this.y + p.y), (this.z + p.z));
    }

    public distanceToPoint = function (p: Point): number {
      var v = this.minus(p);
      return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }


    public distanceToOrigin = function (): number {
      if (this._distancetoorigin === null)
        this._distancetoorigin = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      return this._distancetoorigin;
    }

    public isEqual = function (p: Point): boolean {
      if (!p) return false;
      var v = this.minus(p);
      return Math.abs(v.x) < Point.Precision && Math.abs(v.y) < Point.Precision && Math.abs(v.z) < Point.Precision;
    }
  }

  export interface PolarCoordinates {
    radial: number;
    polar: number;
    azimuth: number;
  }

  export class Vector {
    private _polar: PolarCoordinates = null;
    private _cartesian: Point = null;

    public static ToPolar(point: Point): PolarCoordinates {
      var rad = point.distanceToOrigin();
      var pol = Math.acos(point.z / rad);
      var azi = Math.atan2(point.y, point.x);
      return { radial: rad, polar: pol, azimuth: azi };
    }

    public static ToCartesian(polar: PolarCoordinates): Point {
      let xsin = polar.radial * Math.sin(polar.polar);
      return new Point(xsin * Math.cos(polar.azimuth), xsin * Math.sin(polar.azimuth), polar.radial * Math.cos(polar.polar));
    }

    constructor()
    constructor(p1?: Point)
    constructor(p1?: Point, p2?: Point)
    constructor(p1?: Point | number, p2?: Point | number, az?: number) {
      if (p1 == undefined) {
        this._cartesian = Point.Zero;
        this._polar = { azimuth: 0, polar: 0, radial: 0 };
      }
      else if (p2 == undefined) {
        this._cartesian = new Point((<Point>p1).x, (<Point>p1).y, (<Point>p1).z);
      }
      else if (az == undefined) {
        this._cartesian = (p1 as Point).minus(p2 as Point);
      }
      else {
        this._polar = { radial: p1 as number, polar: p2 as number, azimuth: az };
      }
    }

    public get cartesian(): Point {
      if (this._cartesian === null)
        this._cartesian = Vector.ToCartesian(this._polar);
      return this._cartesian;
    }

    public get polar(): PolarCoordinates {
      if (this._polar === null)
        this._polar = Vector.ToPolar(this._cartesian);
      return this._polar;
    }

    /// Gets the cartesian point of a Vector with radial = distance (relative to vector origin) and same direction
    public pointDistantFromOrigin(distance: number) {
      let polar = this.polar;
      return Vector.ToCartesian({ radial: distance, polar: polar.polar, azimuth: polar.azimuth });
    }

    public isEqual(vector: Vector) {
      return this.cartesian.isEqual(vector.cartesian);
    }
  }
}