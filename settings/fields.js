export function fieldsFor(view) {
  if (view === 'away') return [{ title: '暂离文字', fields: [
    { key: 'texts', label: '暂离文字', min: 1, max: 12, maxLength: 500 },
  ] }];
  return [{ title: '标题', fields: [
    { key: 'titles.english', label: '英文标题', min: 1, max: 12, maxLength: 100 },
    { key: 'titles.chinese', label: '中文标题', min: 1, max: 12, maxLength: 100 },
  ] }];
}
