import { expect, it } from 'vitest';
import {
  triangulate,
  triangleBands,
  triangleContours,
} from './irregular-grid.js';

it('triangulates irregular XYZ points deterministically', () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 2, y: 0, z: 2 },
    { x: 0, y: 1, z: 1 },
    { x: 1.2, y: 1.4, z: 3 },
  ];
  const triangles = triangulate(points);
  expect(triangles).toHaveLength(2);
  expect(
    triangles.every(
      (t) =>
        Math.abs(
          (t[1].x - t[0].x) * (t[2].y - t[0].y) -
            (t[1].y - t[0].y) * (t[2].x - t[0].x),
        ) > 1e-12,
    ),
  ).toBe(true);
  expect(triangulate(points)).toEqual(triangles);
});

it('extracts finite contour segments from a triangulation', () => {
  const triangles = triangulate([
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 1, z: 2 },
  ]);
  expect(triangleContours(triangles, [0.5, 1.5])).toEqual([
    expect.objectContaining({ level: 0.5 }),
    expect.objectContaining({ level: 1.5 }),
  ]);
});

it('triangulates tiny coordinate ranges with the same topology', () => {
  const tiny = triangulate([
    { x: 0, y: 0, z: 0 },
    { x: 2e-12, y: 0, z: 2 },
    { x: 0, y: 1e-12, z: 1 },
    { x: 1.2e-12, y: 1.4e-12, z: 3 },
  ]);
  expect(tiny).toHaveLength(2);
  expect(tiny.flat().every((point) => Math.abs(point.x) <= 2e-12)).toBe(true);
});

it('clips triangles into filled bands at requested contour levels', () => {
  const triangles = triangulate([
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 0, z: 1 },
    { x: 0, y: 1, z: 2 },
  ]);
  const bands = triangleBands(triangles, [0.5, 1.5], [0, 2]);
  expect(bands).toHaveLength(3);
  expect(bands.map((band) => band.value)).toEqual([0.25, 1, 1.75]);
  expect(bands.every((band) => band.points.length >= 3)).toBe(true);
});

it('drops zero-area polygons created at filled-band boundaries', () => {
  const triangles = [
      [
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 1, z: 1 },
        { x: 0, y: 1, z: 2 },
      ],
    ] as Parameters<typeof triangleBands>[0],
    bands = triangleBands(triangles, [1], [0, 2]);
  for (const band of bands) {
    expect(
      new Set(band.points.map((point) => `${point.x},${point.y}`)).size,
    ).toBeGreaterThanOrEqual(3);
    const twiceArea = Math.abs(
      band.points.reduce((sum, point, index) => {
        const next = band.points[(index + 1) % band.points.length]!;
        return sum + point.x * next.y - point.y * next.x;
      }, 0),
    );
    expect(twiceArea).toBeGreaterThan(0);
  }
});

it('keeps filled bands invariant under large coordinate translations', () => {
  const bandsAt = (offset: number) =>
    triangleBands(
      [
        [
          { x: offset, y: offset, z: 0 },
          { x: offset + 1, y: offset, z: 1 },
          { x: offset, y: offset + 1, z: 1 },
        ],
      ],
      [],
      [0, 1],
    );
  expect(bandsAt(0)).toHaveLength(1);
  expect(bandsAt(1e9)).toHaveLength(1);
});
