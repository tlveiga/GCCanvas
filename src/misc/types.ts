export namespace Types {
  export interface IGameObject {
    canvas: HTMLCanvasElement;
    name: string;
  }

  export interface IGameObjectArray {
    add(obj: IGameObject): void;
    remove(obj: IGameObject): void;
    clear(): void;
    list(): Array<IGameObject>;
    get(name: String): IGameObject;
    at(index: number): IGameObject;
  }
}