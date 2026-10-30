import { createClient, getSceneContext, createAutoSave, request } from '/sdk/streamui.js';
import { fieldsFor } from './fields.js';
const context = getSceneContext(), client = createClient(), settings = client.settings('scene', context.sceneId);
const [values, state] = await Promise.all([settings.read(), request('/api/state' + (context.previewId ? '?preview=' + context.previewId : ''))]);
const scene = state.scenes.find(scene => scene.id === context.sceneId);
const form = document.querySelector('form'), status = document.querySelector('output');
const labels = { pending: '等待保存…', saving: '正在保存…', saved: '已保存', error: '保存失败' };
const save = createAutoSave(patch => settings.patch(patch), { onStatus: value => status.textContent = labels[value], onError: error => status.textContent = error.message });
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
