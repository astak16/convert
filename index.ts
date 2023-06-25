const RADIUS = 6378137.0; // (WGS-84)

class Convert {
  originShift: number;
  initialResolution: number;
  tileSize: number;

  constructor() {
    this.tileSize = 256;
    this.initialResolution = (2 * Math.PI * RADIUS) / this.tileSize;
    this.originShift = (2 * Math.PI * RADIUS) / 2.0;
  }

  resolution = (zoom: number): number =>
    this.initialResolution / Math.pow(2, zoom);

  // 公式：**像素坐标 \* 当前层级分辨率 - 原点偏移量**
  // `x` 方向相对简单，都是从左往右，所以直接套用公式就可以得到米了：`meterX = pixelX * resolution - originShift`
  // `y` 方向就比较复杂了，因为像素坐标是从上往下的，而米是从下往上的，
  // 所以需要算出当前层级的像素高度：`Math.pow(2, zoom) * 256`
  // 然后用像素高度减去像素坐标：`Math.pow(2, zoom) * 256 - pixelY`
  // 再套用公式就可以得到米了：`meterY = (Math.pow(2, zoom) * 256 - pixelY) * resolution - originShift`
  pixelsToMeters = (px: number, py: number, zoom: number) => {
    const res = this.resolution(zoom);
    const mx = px * res - this.originShift;
    const my = (Math.pow(2, zoom) * 256 - py) * res - this.originShift;
    return [mx, my];
  };

  // 公式：**(米 + 原点偏移量) / 当前层级分辨率**
  // 像素转米的逆向操作
  metersToPixels = (mx: number, my: number, zoom: number) => {
    const res = this.resolution(zoom);
    let px = (mx + this.originShift) / res;
    let py = (my + this.originShift) / res;
    py = Math.pow(2, zoom) * 256 - py;
    return [px, py];
  };

  // 公式： **(经纬度 \* 原点偏移量) / 180.0**
  // `x` 方向比较简单：`meterX = lon * originShift / 180.0`
  // `y` 方向比较复杂，需要先将纬度转弧度，然后用 `Math.log` 和 `Math.tan` 计算出 `my`，最后再套用公式：`meterY = my * originShift / 180.0`
  lngLatToMeters = (lon: number, lat: number) => {
    let mx = (lon * this.originShift) / 180.0;
    let my =
      Math.log(Math.tan(((90 + lat) * Math.PI) / 360.0)) / (Math.PI / 180.0);
    my = (my * this.originShift) / 180.0;
    return [mx, my];
  };

  // 公式： **(米 / 原点偏移量) \* 180.0**
  // 经纬度转米的逆向操作
  metersToLngLat = (mx: number, my: number) => {
    let lon = (mx / this.originShift) * 180.0;
    let lat = (my / this.originShift) * 180.0;
    lat =
      (180 / Math.PI) *
      (2 * Math.atan(Math.exp((lat * Math.PI) / 180.0)) - Math.PI / 2.0);
    return [lon, lat];
  };

  // 公式：`meter -> pixel -> tile`
  metersToTile = (mx: number, my: number, zoom: number) => {
    const [px, py] = this.metersToPixels(mx, my, zoom);
    return this.pixelsToTile(px, py);
  };

  // 公式：`tile -> pixel -> meter`
  tileToMeters = (tx: number, ty: number, zoom: number) => {
    const [px, py] = this.tileToPixels(tx, ty);
    return this.pixelsToMeters(px, py, zoom);
  };

  // 用 `tileX * tileSize` 和 `tileY * tileSize` 就可以得到像素坐标了
  // 比如 `tileSize` 为 `256`，那么瓦片号为 `(3, 4)` 的像素坐标就是 `(768, 1024)`
  tileToPixels = (tx: number, ty: number) => {
    return [tx * this.tileSize, ty * this.tileSize];
  };

  // 瓦片号是从 0 开始的，所以需要减去 1
  pixelsToTile = (px: number, py: number) => {
    const tx = Math.floor(Math.ceil(px / this.tileSize) - 1);
    const ty = Math.floor(Math.ceil(py / this.tileSize) - 1);
    return [tx, ty];
  };

  // 公式：`lnglat -> pixel -> tile`
  lngLatToTile = (lon: number, lat: number, zoom: number) => {
    const [px, py] = this.lngLatToPixels(lon, lat, zoom);
    return this.pixelsToTile(px, py);
  };

  // 公式：`tile -> meter -> lnglat`
  tileToLngLat = (tx: number, ty: number, zoom: number) => {
    const [minX, minY] = this.tileToMeters(tx, ty, zoom);
    return this.metersToLngLat(minX, minY);
  };

  // 公式：`lnglat -> meter -> pixel`
  lngLatToPixels = (lon: number, lat: number, zoom: number) => {
    const [mx, my] = this.lngLatToMeters(lon, lat);
    return this.metersToPixels(mx, my, zoom);
  };

  // 公式：`pixel -> meter -> lnglat`
  pixelsToLngLat = (px: number, py: number, zoom: number) => {
    const meters = this.pixelsToMeters(px, py, zoom);
    return this.metersToLngLat(meters[0], meters[1]);
  };
}
