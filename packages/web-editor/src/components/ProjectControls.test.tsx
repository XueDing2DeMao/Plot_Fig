// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectControls } from './ProjectControls.js';

afterEach(cleanup);

describe('ProjectControls', () => {
  it('exposes labeled save and open controls', () => {
    const onSave = vi.fn();
    const onOpenFile = vi.fn();
    render(
      <ProjectControls
        canSave
        status="ready"
        onSave={onSave}
        onOpenFile={onOpenFile}
      />,
    );

    expect(screen.getByRole('button', { name: '保存项目' })).toBeEnabled();
    expect(screen.getByLabelText('打开项目文件')).toHaveAttribute(
      'accept',
      '.plotfig.json,application/json',
    );
    fireEvent.click(screen.getByRole('button', { name: '保存项目' }));
    expect(onSave).toHaveBeenCalledTimes(1);

    const file = new File(['{}'], 'project.plotfig.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByLabelText('打开项目文件'), {
      target: { files: [file] },
    });
    expect(onOpenFile).toHaveBeenCalledWith(file);
  });

  it('disables save while unavailable and announces status', () => {
    render(
      <ProjectControls
        canSave={false}
        status="error"
        statusMessage="项目文件无效"
        onSave={() => undefined}
        onOpenFile={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: '保存项目' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('项目文件无效');
  });
});
