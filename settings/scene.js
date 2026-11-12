import { createClient, getSceneContext, createAutoSave, request } from '/sdk/streamui.js';
import { fieldsFor } from './fields.js';
const context = getSceneContext(), client = createClient(), settings = client.settings('scene', context.sceneId);
const [values, state] = await Promise.all([settings.read(), request('/api/state' + (context.previewId ? '?preview=' + context.previewId : ''))]);
const scene = state.scenes.find(scene => scene.id === context.sceneId);
const form = document.querySelector('form'), status = document.querySelector('output');
const labels = { pending: '等待保存…', saving: '正在保存…', saved: '已保存', error: '保存失败' };
const saveStatus = { onStatus: value => status.textContent = labels[value], onError: error => status.textContent = error.message };
const save = createAutoSave(patch => settings.patch(patch), saveStatus);
const read = key => key === 'texts'
  ? values.texts ?? [values.text1, values.text2].filter(text => typeof text === 'string' && text.trim())
  : key.split('.').reduce((value, part) => value?.[part], values);
const patch = (key, value) => key.split('.').reverse().reduce((nested, part) => ({ [part]: nested }), value);
for (const section of fieldsFor(scene.view)) {
  const group = document.createElement('section'), heading = document.createElement('h2'); heading.textContent = section.title; group.append(heading);
  for (const field of section.fields) {
    const words = [...(read(field.key) ?? [])];
    const list = document.createElement('div'); list.className = 'word-list';
    const commit = immediate => {
      if (words.length < field.min || words.some(word => !word.trim() || word.length > field.maxLength)) return;
      save.update(patch(field.key, words.map(word => word.trim())), immediate);
    };
    const render = () => {
      list.replaceChildren();
      words.forEach((word, index) => {
        const row = document.createElement('div'); row.className = 'word-row';
        const wrapper = document.createElement('label'); wrapper.textContent = field.label + ' ' + (index + 1);
        const input = document.createElement('input'); input.type = 'text'; input.value = word; input.required = true; input.maxLength = field.maxLength;
        input.oninput = () => { words[index] = input.value; commit(false); }; input.onchange = () => commit(true);
        wrapper.append(input);
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '移除'; remove.disabled = words.length <= field.min;
        remove.onclick = () => { words.splice(index, 1); render(); commit(true); };
        row.append(wrapper, remove); list.append(row);
      });
      const add = document.createElement('button'); add.type = 'button'; add.className = 'add'; add.textContent = '添加' + field.label; add.disabled = words.length >= field.max;
      add.onclick = () => { words.push(''); render(); list.querySelectorAll('input').item(words.length - 1)?.focus(); };
      list.append(add);
    };
    render(); group.append(list);
  }
  form.append(group);
}
form.onsubmit = event => event.preventDefault();
addEventListener('pagehide', () => void save.flush().catch(() => {}));

if (scene.view === '21:9' || scene.view === '16:9') {
  const preset = client.settings('preset', scene.presetId);
  const section = document.querySelector('#input-settings').content.firstElementChild.cloneNode(true);
  const controls = [...section.querySelectorAll('input, select')];
  const [keyboard, layout, mouse, motion] = controls;
  const hint = section.querySelector('.input-settings-hint');
  let plugin = state.plugins.find(item => item.id === 'desktop-input');
  let pending = false, revision = 0;

  function updateOptions() {
    layout.disabled = !keyboard.checked;
    motion.disabled = !mouse.checked;
    let message = '';
    if (keyboard.checked || mouse.checked) {
      if (!plugin) message = '需要安装「键盘与鼠标输入」插件。';
      else if (plugin.state === 'error') message = `无法启动键盘与鼠标输入（${plugin.error ?? '请在插件设置中重新启用'}）。`;
      else if (!plugin.enabled) message = '在「插件设置」中启用「键盘与鼠标输入」即可显示实时按键。';
    }
    hint.textContent = message;
    hint.hidden = !message;
  }

  async function refresh() {
    const requested = ++revision;
    try {
      const { inputDisplay } = await preset.read();
      if (pending || requested !== revision) return;
      keyboard.checked = inputDisplay?.keyboard === true;
      mouse.checked = inputDisplay?.mouse === true;
      motion.checked = inputDisplay?.mouseMotion !== false;
      layout.value = inputDisplay?.keyboardLayout ?? 'wasd';
      if (!layout.value) layout.value = 'wasd';
      updateOptions();
    } catch (error) { saveStatus.onError(error); }
  }

  const saveInput = createAutoSave(change => preset.patch(change), {
    ...saveStatus,
    onStatus(value) {
      pending = value === 'pending' || value === 'saving';
      saveStatus.onStatus(value);
      if (value === 'saved') void refresh();
    },
  });
  for (const control of controls) control.addEventListener('change', () => {
    const value = control.type === 'checkbox' ? control.checked : control.value;
    saveInput.update({ inputDisplay: { [control.name]: value } }, true);
    updateOptions();
  });

  client.onState(value => {
    plugin = value.plugins.find(item => item.id === 'desktop-input');
    updateOptions();
  });
  client.on('preset.settingsChanged', ({ id }) => { if (id === scene.presetId && !pending) void refresh(); });
  addEventListener('pagehide', () => { void saveInput.flush().catch(() => {}); client.stop(); });
  addEventListener('pageshow', () => { client.start(); void refresh(); });
  await refresh();
  form.append(section);
  client.start();
}
