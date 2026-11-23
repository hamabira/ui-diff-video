async page => {
  const timing = { opening: 1500, preview: 1600, action: 1200, result: 3500 };
  await page.setViewportSize({ width: 960, height: 540 });
  await page.setContent(`<!doctype html><title>Local demo</title>
    <style>body{padding:64px;font:26px sans-serif} button,input{font:inherit;padding:10px} output{display:block;margin-top:24px}</style>
    <label>Demo message <input value="Hello"></label>
    <button onclick="document.querySelector('output').textContent='Saved: '+document.querySelector('input').value">Save</button>
    <output role="status">Not saved</output>`);
  const button = page.getByRole('button', { name: 'Save' });
  const result = page.getByRole('status');
  const pauseForViewer = ms => page.waitForTimeout(ms); // For recording only, not an assertion.
  async function showStep(target, color, label) {
    const box = await target.boundingBox();
    if (!box) throw Error('Missing visible target for demo: ' + label);
    return page.screencast.showOverlay(`<div style="position:absolute;left:${box.x-4}px;top:${box.y-4}px;width:${box.width+8}px;height:${box.height+8}px;outline:4px solid ${color};pointer-events:none"></div><div style="position:absolute;left:64px;bottom:30px;background:${color};color:white;padding:12px;font:24px sans-serif;pointer-events:none">${label}</div>`);
  }
  await page.screencast.start({ path: 'candidate.webm', size: { width: 960, height: 540 } });
  try {
    await pauseForViewer(timing.opening);
    const preview = await showStep(button, '#2563eb', 'Next: click Save');
    try { await pauseForViewer(timing.preview); }
    finally { await preview.dispose(); }
    await page.screencast.showActions({ duration: timing.action, style: { highlight: 'outline: 4px solid #2563eb; background: #2563eb22' } });
    await button.click();
    await page.getByText('Saved: Hello', { exact: true }).waitFor();
    await pauseForViewer(timing.action);
    const verified = await showStep(result, '#16a34a', 'Result verified');
    try { await pauseForViewer(timing.result); }
    finally { await verified.dispose(); }
  } catch (actionError) {
    try {
      await page.screencast.stop();
    } catch (stopError) {
      throw new Error(actionError.message + '\nRecording stop also failed: ' + stopError.message, { cause: actionError });
    }
    throw actionError;
  }
  await page.screencast.stop();
  return await result.innerText();
}
