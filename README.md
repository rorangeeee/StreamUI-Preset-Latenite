# StreamUI-Preset-Latenite

StreamUICore 0.5.1 / 浏览器 SDK 2 的独立预设。3840 × 2160，包含 21:9、16:9 两个主场景和独立暂离覆盖层，保留常驻页面、弹幕历史、音频图形、字标与像素动效。

## 构建

克隆到 Core/presets/latenite：

~~~powershell
npm ci
npm run build
npm test
~~~

构建结果位于 ui/，不提交 Git。源码、默认参数、配置页、锁定文件和构建配置都保留在仓库内。可直接在该工作目录修改 source/ 并重建。

能力依赖来自四个独立源码仓库，先构建再启用预设：
- https://github.com/rorangeeee/StreamUI-Plugin-DesktopAudio
- https://github.com/rorangeeee/StreamUI-Plugin-SystemMedia
- https://github.com/rorangeeee/StreamUI-Plugin-ObsScenes
- https://github.com/rorangeeee/StreamUI-Plugin-Laplace

## 场景配置

这是一个固定视觉设计的个人预设示例。正常场景的配置页只保留中英文标题，暂离场景只保留暂离文字；两者均支持添加、移除多段文字并自动保存。

品牌、页脚、标签、信息终端、遮罩透明度与 OBS 绑定保留在默认 JSON 或源码中，不在页面暴露。两个主场景可通过对应 defaults JSON 的 obsSceneName 指定绑定，留空不参与自动联动。暂离不是 OBS 场景，不提供 OBS 绑定。OBS 插件只提供事件，source/src/obs-bindings.ts 实现主场景匹配。

暂离多段文字保存为 texts 数组；没有该数组时，继续读取原来的 text1、text2。已有个人文字无需重新填写。

连接 OBS、弹幕、音频设备等参数属于插件，不存入场景源码默认值。

## 独立预览与暂离

配置页的手动切主场景与重播动效只作用于当前预览。真实 OBS 场景事件也不会带动预览。持久化的文字参数仍共享并即时生效。

sidebar.html 提供 Host 的暂离开关，更新共享预设参数 controls.away：控制实际输出，预览同步显示。它不调用 selectScene，不改变主场景 ID、动效时钟或底层组件生命周期。Core 只提供通用参数保存，不包含暂离业务。

暂离覆盖层是主转场容器之外的独立层。进入、退出暂离不播放主像素转场；覆盖期间发生的主场景更新直接应用，退出或页面恢复时不补播这些动效。暂离自身的展开、收回和文字滚动保留。

暂离描述声明 role:overlay，仅在“场景配置”中提供文字参数，不出现在预览主场景下拉中。选择它的配置不会开启暂离，开关始终在 Host 侧栏。

同一 runtimeGroup 保持页面常驻；返回普通场景时继续使用同一弹幕历史、组件和播放时钟。

## 字体与更新

原外观使用本机 Retro Pixel、405 SS、Blue Screen Personal Use、JetBrains Mono 等字体，字体不在仓库中分发。透明输出根页面使用 color-scheme:normal。

更新前提交或暂存自己的源码修改，合并所选 Git 版本后执行 npm ci、npm run build，再刷新预览和 OBS。修改清单结构后刷新列表并重新启用预设。

从旧版升级时，停止 Core 并运行：

~~~powershell
npm run migrate -- <Core数据目录>
~~~

该脚本迁移旧标题、主场景 OBS 绑定和暂离文字，保留已有自定义。旧版选中的暂离场景会转为 controls.away 开关，主场景恢复正常布局；原配置保留备份。完成标记避免重复导入。Core 和能力插件各自负责自己的数据，不在本预设中保存连接密码。

## 验证

npm test 验证空绑定、仅一个绑定、预览隔离、参数适配和旧设置迁移。Core 中可运行 npm run extensions:check -- <本仓库目录> 检查源码仓库格式。
