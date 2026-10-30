export function fieldsFor(view) {
  const binding = { title: 'OBS 联动', fields: [{ key: 'obsSceneName', label: 'OBS 场景名称', type: 'text' }] };
  if (view === 'away') return [binding, { title: '暂离文字', fields: [
    { key: 'text1', label: '第一段', type: 'text' }, { key: 'text2', label: '第二段', type: 'text' },
    { key: 'overlayOpacity', label: '遮罩透明度', type: 'range', min: 0, max: 1, step: .01 },
  ] }];
  return [binding,
    { title: '标题', fields: [
      { key: 'titles.english', label: '英文标题', type: 'list', min: 1, max: 12 },
      { key: 'titles.chinese', label: '中文标题', type: 'list', min: 1, max: 12 },
    ] },
    { title: '品牌与页脚', fields: [
      { key: 'brandWords', label: '品牌循环词', type: 'list', min: 1, max: 16 },
      { key: 'marquees.secondary', label: '感谢文字', type: 'list', min: 1, max: 12 },
      { key: 'marquees.primary', label: '提示文字', type: 'list', min: 1, max: 12 },
    ] },
    { title: '画面标签', fields: [
      { key: 'labels.stream', label: '主画面标签', type: 'text' },
      { key: 'labels.chat', label: '弹幕标签', type: 'text' },
    ] },
    ...(view === '21:9' ? [{ title: '信息终端', fields: [
      { key: 'metadata.roomId', label: '直播间号', type: 'text' },
      { key: 'metadata.targetBitrate', label: '目标码率', type: 'text' },
      { key: 'metadata.sponsors', label: '赞助名', type: 'list', min: 0, max: 12 },
    ] }] : []),
  ];
}
