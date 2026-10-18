import React, { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CropModal } from '../../src/app/App';

const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
async function until(ready: () => boolean) {
  const deadline = performance.now() + 4000;
  while (!ready()) {
    if (performance.now() > deadline) throw new Error('Crop did not become ready');
    await nextFrame();
  }
}
function near(actual: number, expected: number, label: string, tolerance = 1) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

// Runs the real React cropper; only native pointer capture is stubbed because
// synthetic pointers are not active hardware pointers in the browser.
// Native capture and dragging are checked separately with a real mouse.
export function DragChecks() {
  const [crop, setCrop] = useState<{ mode: 'avatar' | 'cover'; key: number } | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const applied = useRef<string | undefined>(undefined);

  async function open(mode: 'avatar' | 'cover') {
    flushSync(() => setCrop({ mode, key: performance.now() }));
    await until(() => {
      const image = document.querySelector<HTMLImageElement>('[role="dialog"] img');
      return !!image?.naturalWidth && parseFloat(image.style.width) > 0;
    });
    const image = document.querySelector<HTMLImageElement>('[role="dialog"] img')!;
    // Ignore the dialog entrance animation when measuring the crop geometry.
    image.closest<HTMLElement>('[role="dialog"]')!.style.animation = 'none';
    await nextFrame();
    await nextFrame();
    return { image, viewport: image.parentElement! };
  }

  async function run() {
    setRunning(true);
    setResults([]);
    const check = async (name: string, test: () => Promise<void>) => {
      try { await test(); setResults(items => [...items, `PASS ${name}`]); }
      catch (error) { setResults(items => [...items, `FAIL ${name}: ${(error as Error).message}`]); }
      finally { flushSync(() => setCrop(null)); }
    };
    for (const mode of ['avatar', 'cover'] as const) {
      await check(`${mode}: preview fits and centers at this viewport`, async () => {
        const { image, viewport } = await open(mode);
        const width = viewport.clientWidth, height = viewport.clientHeight;
        near(width / height, mode === 'avatar' ? 1 : 3.2, 'frame aspect ratio', 0.015);
        near(parseFloat(image.style.left) + parseFloat(image.style.width) / 2, width / 2, 'horizontal center');
        near(parseFloat(image.style.top) + parseFloat(image.style.height) / 2, height / 2, 'vertical center');
      });
      for (const pointerType of ['touch', 'mouse']) {
        await check(`${mode}: ${pointerType} moves the photo and stops on cancel`, async () => {
          const { image, viewport } = await open(mode);
          const slider = document.querySelector('[role="slider"]')!;
          flushSync(() => slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
          viewport.setPointerCapture = () => {};
          viewport.hasPointerCapture = () => false;
          const dispatch = (type: string, id: number, x: number, y: number) => flushSync(() => viewport.dispatchEvent(new PointerEvent(type, {
            pointerId: id, pointerType, isPrimary: true, button: 0, buttons: 1,
            clientX: x, clientY: y, bubbles: true, cancelable: true,
          })));
          const left = parseFloat(image.style.left), top = parseFloat(image.style.top);
          dispatch('pointerdown', 11, 100, 100);
          dispatch('pointermove', 12, 200, 200);
          near(parseFloat(image.style.left), left, 'unrelated pointer ignored');
          dispatch('pointermove', 11, 148, 124);
          await nextFrame();
          near(parseFloat(image.style.left) - left, 48, 'horizontal movement');
          near(parseFloat(image.style.top) - top, 24, 'vertical movement');
          dispatch('pointercancel', 11, 148, 124);
          dispatch('pointermove', 11, 170, 150);
          near(parseFloat(image.style.left) - left, 48, 'movement after cancel');
        });
      }
      await check(`${mode}: saved crop matches the visible preview`, async () => {
        const { image, viewport } = await open(mode);
        flushSync(() => document.querySelector('[role="slider"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
        viewport.setPointerCapture = () => {};
        viewport.hasPointerCapture = () => false;
        for (const [type, x, y] of [['pointerdown', 100, 100], ['pointermove', 132, 118], ['pointerup', 132, 118]] as const) {
          flushSync(() => viewport.dispatchEvent(new PointerEvent(type, { pointerId: 17, pointerType: 'touch', button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true, cancelable: true })));
        }
        await nextFrame();
        const preview = document.createElement('canvas');
        preview.width = viewport.clientWidth; preview.height = viewport.clientHeight;
        const expected = preview.getContext('2d')!;
        const frame = viewport.getBoundingClientRect();
        expected.scale(preview.width / frame.width, preview.height / frame.height);
        expected.drawImage(image, parseFloat(image.style.left), parseFloat(image.style.top), parseFloat(image.style.width), parseFloat(image.style.height));
        applied.current = undefined;
        (Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Apply Crop'))!.click();
        await until(() => !!applied.current);
        const output = new Image(); output.src = applied.current!; await output.decode();
        near(output.naturalWidth, mode === 'avatar' ? 480 : 1200, 'output width', 0);
        near(output.naturalHeight, mode === 'avatar' ? 480 : 375, 'output height', 0);
        const actualCanvas = document.createElement('canvas');
        actualCanvas.width = preview.width; actualCanvas.height = preview.height;
        const actual = actualCanvas.getContext('2d')!;
        actual.drawImage(output, 0, 0, preview.width, preview.height);
        // Sample away from the fixture's text baseline, where rasterization and
        // JPEG antialiasing can differ despite selecting the same source pixels.
        for (const x of [0.1, 0.5, 0.9]) for (const y of [0.1, 0.25, 0.95]) {
          const px = Math.floor(x * preview.width), py = Math.floor(y * preview.height);
          const a = actual.getImageData(px, py, 1, 1).data, e = expected.getImageData(px, py, 1, 1).data;
          for (let channel = 0; channel < 3; channel++) near(a[channel], e[channel], `preview pixel ${x},${y}`, 18);
        }
        URL.revokeObjectURL(applied.current!);
      });
    }
    setRunning(false);
  }

  return <main style={{ padding: 24 }}>
    <h1>Crop drag regression checks</h1>
    <button disabled={running} onClick={() => void run()}>Run drag checks</button>
    <pre aria-label="Drag results">{results.join('\n')}</pre>
    <p>{running ? 'Running' : 'Idle'}</p>
    {crop && <CropModal key={crop.key} src="/tests/profile-crop/sample.svg" mode={crop.mode}
      onApply={url => { applied.current = url; }} onClose={() => setCrop(null)} />}
  </main>;
}
