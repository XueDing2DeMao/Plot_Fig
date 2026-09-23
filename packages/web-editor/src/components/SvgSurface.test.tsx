// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { SvgSurface } from './SvgSurface.js';
afterEach(cleanup);
it('keeps clipping references local to each simultaneously mounted preview', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="panel-clip"><rect width="10" height="10"/></clipPath></defs><g clip-path="url(#panel-clip)"><path d="M0 0 L10 10"/></g></svg>';
  const { container } = render(
    <>
      <SvgSurface svg={svg} />
      <SvgSurface svg={svg} />
    </>,
  );
  const roots = Array.from(container.querySelectorAll('svg'));
  const ids = roots.map((root) => root.querySelector('clipPath')!.id);
  expect(new Set(ids).size).toBe(2);
  roots.forEach((root, i) =>
    expect(root.querySelector('g')!.getAttribute('clip-path')).toBe(
      `url(#${ids[i]})`,
    ),
  );
  expect(svg).toContain('id="panel-clip"');
});
