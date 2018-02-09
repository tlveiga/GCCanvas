import { Types } from './misc/types'

export class Game {

  private _canvas: HTMLCanvasElement;
  private _context: CanvasRenderingContext2D;
  private _objects: Types.IGameObjectArray;

  constructor(canvasid: string) {
    this._canvas = document.getElementById(canvasid) as HTMLCanvasElement;
    if (this._canvas === null)
      throw "Canvas with id " + canvasid + " not found.";
    if (this._canvas.getContext === undefined)
      throw "Canvas with id " + canvasid + " is not a valid element.";

    this._context = this._canvas.getContext("2d");

    this._objects = new GameObjects(this._canvas);
  }

  public get objects(): Types.IGameObjectArray {
    return this._objects;
  }
}

class GameObjects implements Types.IGameObjectArray {
  private _list: Array<Types.IGameObject>;

  constructor(private canvas: HTMLCanvasElement) {
    this._list = [];
  }

  public add(obj: Types.IGameObject): void {
    this._list.push(obj);
    obj.canvas = this.canvas;
  }

  public remove(obj: Types.IGameObject): void {
    var idx = this._list.indexOf(obj)
    if (idx >= 0) {
      obj.canvas = null;
      this._list.splice(idx, 1);
    }
  }

  public clear(): void {
    this._list.forEach(function (f) {
      f.canvas = null;
    });
    this._list.length = 0;
  }

  public list(): Array<Types.IGameObject> {
    return this._list;
  }

  public get(name: String): Types.IGameObject {
    if (name) {
      var el = this._list.filter(function (f) {
        return f.name === name;
      });
      return el.length ? el[0] : null;
    }
    return null;
  }

  public at(index: number): Types.IGameObject {
    if (index >= 0 && index < this._list.length)
      return this._list[index];
    else
      return null;
  }
}