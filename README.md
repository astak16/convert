在地图开发中，会遇到 `pixel`（像素）、`meter`（米）、`tile`（瓦片）、`lnglat`（经纬度） 之间的转换

它们之间的转化看似很复杂，其实只要理解了其中的原理，就会发现它们之间的转换是很简单的，它们最底层的转换是：

1. `pixel` 和 `meter` 之间的转换
2. `lnglat` 和 `meter` 之间的转换

其他的转换都是基于这个转换的

## 原点偏移量

原点偏移量是指地图的原点（左上角）相对于地球的原点（左下角）的偏移量：`originShift = 2 * Math.PI * 6378137 / 2.0`

## 地图瓦片分辨率

初始分辨率为：`initialResolution = (2 * Math.PI * 6378137) / tileSize`

计算当前层级分辨率：`resolution = initialResolution / Math.pow(2, zoom)`

## 像素转米

公式：**像素坐标 \* 当前层级分辨率 - 原点偏移量**

`x` 方向相对简单，都是从左往右，所以直接套用公式就可以得到米了：`meterX = pixelX * resolution - originShift`

`y` 方向就比较复杂了，因为像素坐标是从上往下的，而米是从下往上的，

所以需要算出当前层级的像素高度：`Math.pow(2, zoom) * 256`

然后用像素高度减去像素坐标：`Math.pow(2, zoom) * 256 - pixelY`

再套用公式就可以得到米了：`meterY = (Math.pow(2, zoom) * 256 - pixelY) * resolution - originShift`

最终代码：

```ts
const pixelsToMeters = (px: number, py: number, zoom: number) => {
  const res = resolution(zoom);
  const mx = px * res - originShift;
  const my = (Math.pow(2, zoom) * 256 - py) * res - originShift;
  return [mx, my];
};
```

## 米转像素

公式：**(米 + 原点偏移量) / 当前层级分辨率**

像素转米的逆向操作：

```ts
const metersToPixels = (mx: number, my: number, zoom: number) => {
  const res = resolution(zoom);
  let px = (mx + originShift) / res;
  let py = (my + originShift) / res;
  py = Math.pow(2, zoom) * 256 - py;
  return [px, py];
};
```

## 经纬度转米

公式： **(经纬度 \* 原点偏移量) / 180.0**

`x` 方向比较简单：`meterX = lon * originShift / 180.0`

`y` 方向比较复杂，需要先将纬度转弧度，然后用 `Math.log` 和 `Math.tan` 计算出 `my`，最后再套用公式：`meterY = my * originShift / 180.0`

最终代码：

```ts
const lngLatToMeters = (lon: number, lat: number) => {
  let mx = (lon * originShift) / 180.0;
  let my =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360.0)) / (Math.PI / 180.0);
  my = (my * originShift) / 180.0;
  return [mx, my];
};
```

## 米转经纬度

公式： **(米 / 原点偏移量) \* 180.0**

经纬度转米的逆向操作：

```ts
const metersToLngLat = (mx: number, my: number) => {
  let lon = (mx / originShift) * 180.0;
  let lat = (my / originShift) * 180.0;
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180.0)) - Math.PI / 2.0);
  return [lon, lat];
};
```

## 米转瓦片

公式：`meter -> pixel -> tile`

```ts
const metersToTile = (mx: number, my: number, zoom: number) => {
  const [px, py] = metersToPixels(mx, my, zoom);
  return pixelsToTile(px, py);
};
```

## 瓦片转米

公式：`tile -> pixel -> meter`

```ts
const tileToMeters = (tx: number, ty: number, zoom: number) => {
  const px = tx * tileSize;
  const py = ty * tileSize;
  return pixelsToMeters(px, py, zoom);
};
```

## 瓦片转像素

用 `tileX * tileSize` 和 `tileY * tileSize` 就可以得到像素坐标了

比如 `tileSize` 为 `256`，那么瓦片号为 `(3, 4)` 的像素坐标就是 `(768, 1024)`

```ts
const tileToPixels = (tx: number, ty: number) => {
  return [tx * tileSize, ty * tileSize];
};
```

## 像素转瓦片

```ts
const pixelsToTile = (px: number, py: number) => {
  const tx = Math.floor(Math.ceil(px / tileSize) - 1);
  const ty = Math.floor(Math.ceil(py / tileSize) - 1);
  return [tx, ty];
};
```

## 经纬度转瓦片

公式：`lnglat -> pixel -> tile`

```ts
const lngLatToTile = (lon: number, lat: number, zoom: number) => {
  const [px, py] = lngLatToPixels(lon, lat, zoom);
  return pixelsToTile(px, py);
};
```

## 瓦片转经纬度

公式：`tile -> meter -> lnglat`

```ts
const tileToLngLat = (tx: number, ty: number, zoom: number) => {
  const [minX, minY] = tileToMeters(tx, ty, zoom);
  return metersToLngLat(minX, minY);
};
```

## 经纬度转像素

公式：`lnglat -> meter -> pixel`

```ts
const lngLatToPixels = (lon: number, lat: number, zoom: number) => {
  const [mx, my] = lngLatToMeters(lon, lat);
  return metersToPixels(mx, my, zoom);
};
```

## 像素转经纬度

公式：`pixel -> meter -> lnglat`

```ts
const pixelsToLngLat = (px: number, py: number, zoom: number) => {
  const meters = pixelsToMeters(px, py, zoom);
  return metersToLngLat(meters[0], meters[1]);
};
```

## 如何将瓦片绘制到 canvas 中

1. 从所有的瓦片号中找出：`minX`、`maxX`、`minY`、`maxY`
2. 用单个瓦片号减去 `minX` 和 `minY` 后，再乘上瓦片的 `size`

```js
const image = URL.createObjectURL(imageData);
ctx.drawImage(image, (tileX - minX) * 256, (tileY - minY) * 256, 256, 256);
```
