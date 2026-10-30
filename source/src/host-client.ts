import type { SavedLayout } from './layout.ts';
import type { NowPlayingTrack } from './now-playing-data.ts';
import type { StageMode } from './stage-layout.ts';
import type { PublicState, ChatMessage, CoreSdk, ScenePlayback } from './core-sdk-types.ts';
import { ObsSceneBindings } from './obs-bindings.ts';
import type { ObsSceneEvent } from './obs-bindings.ts';
const sdkUrl = '/sdk/streamui.js';
const { createClient, getSceneContext, request } = await import(/* @vite-ignore */ sdkUrl) as CoreSdk;

export interface AwaySettings { enabled: boolean; text1: string; text2: string; overlayOpacity: number }
export interface SceneParameters {
  obsSceneName: string;
  titles: { english: string[]; chinese: string[] };
  brandWords: string[];
  marquees: { primary: string[]; secondary: string[] };
  metadata: { roomId: string; targetBitrate: string; sponsors: string[] };
  labels: { stream: string; chat: string };
}
export interface HostConfig extends SceneParameters {
  audio: { enabled: boolean };
  canvas: { width: number; height: number }; layout: SavedLayout | null;
  layoutVersion: number; layoutMode: StageMode; layoutProfiles: Partial<Record<StageMode, SavedLayout | null>>;
  away: AwaySettings;
}
export interface HostState {
  nowPlaying?: NowPlayingTrack; transition: ScenePlayback | null;
  config: HostConfig;
  audio: { state: string; error: string | null; deviceId: string | null; sampleRate: number; channels: number; deviceSampleRate: number; frameRate: number };
  laplace: { state: string; error: string | null; localBridge: boolean; events: number; lastEventAt: string | null };
  obsUrl: string; configUrl: string; startup: boolean;
}
type VisualSettings = Pick<HostConfig, 'canvas' | 'layoutVersion' | 'layoutProfiles'>;
interface ObsStatus { state: string; scene: string | null; error: string | null }
export class HostConnection extends EventTarget {
  state: HostState | null = null;
  connected = false;
  private client = createClient();
  private active = false;
  private core: PublicState | null = null;
  private visuals: VisualSettings | null = null;
  private parameters: Record<string, Partial<SceneParameters & AwaySettings>> = {};
  private epoch = 0;
  private catalog = '';
  private normalId: string | null = null;
  private obsReady = false;
  private obs: ObsStatus = { state: 'disabled', scene: null, error: null };
  private audio: HostState['audio'] = { state: 'idle', error: null, deviceId: null, sampleRate: 48000, channels: 2, deviceSampleRate: 48000, frameRate: 0 };
  private chat: HostState['laplace'] = { state: 'disconnected', error: null, localBridge: false, events: 0, lastEventAt: null };
  private track: NowPlayingTrack | undefined;
  private readonly presetId = getSceneContext().presetId ?? 'latenite';
  private readonly binding = new ObsSceneBindings((id, options) => { void this.client.selectScene(id, options).catch(console.error); }, getSceneContext().preview);
  constructor() {
    super();
    this.client.onState(state => {
      this.core = state;
      const audio = state.plugins.find(plugin => plugin.id === 'desktop-audio')?.topics.status as { audio?: HostState['audio'] } | undefined;
      if (audio?.audio) this.audio = audio.audio;
      const track = state.plugins.find(plugin => plugin.id === 'system-media')?.topics.track as NowPlayingTrack | undefined;
      if (track) this.track = track;
      const chat = state.plugins.find(plugin => plugin.id === 'laplace')?.topics.status as HostState['laplace'] | undefined;
      if (chat) this.chat = chat;
      const obs = state.plugins.find(plugin => plugin.id === 'obs-scenes')?.topics.status as ObsStatus | undefined;
      if (obs) this.updateObs(obs);
      const catalog = JSON.stringify(state.scenes.map(scene => [scene.id, scene.defaults]));
      if (catalog !== this.catalog || !this.visuals) { this.catalog = catalog; void this.readSettings(); }
      this.sync();
    });
    this.client.on<boolean>('connection', connected => { this.connected = connected; this.dispatchEvent(new Event('connectionchange')); });
    this.client.on('scene.enter', () => this.sync());
    this.client.on<{ id: string }>('preset.settingsChanged', ({ id }) => { if (id === this.presetId) void this.readSettings(); });
    this.client.on('scene.settingsChanged', () => void this.readSettings());
    this.client.on<{ audio: HostState['audio'] }>('plugin.desktop-audio.status', value => { this.audio = value.audio; this.sync(); });
    this.client.on<NowPlayingTrack>('plugin.system-media.track', value => { this.track = value; this.sync(); });
    this.client.on<HostState['laplace']>('plugin.laplace.status', value => { this.chat = value; this.sync(); });
    this.client.on<ObsStatus>('plugin.obs-scenes.status', value => this.updateObs(value));
    this.client.on<ObsSceneEvent>('plugin.obs-scenes.scene-changed', event => this.binding.observe(event));
    for (const kind of ['message', 'gift', 'superchat']) this.client.on<ChatMessage>('plugin.laplace.chat.' + kind, value => {
      const numericId = Number(value.user.id);
      this.dispatchEvent(new CustomEvent('chat', { detail: { type: value.kind, origin: value.platform, stableKey: value.id,
        uid: Number.isSafeInteger(numericId) ? numericId : 0, username: value.user.name, userLvl: value.user.level,
        timestampNormalized: value.timestamp, message: value.text, giftName: value.gift?.name, num: value.gift?.count,
        priceNormalized: value.payment?.amount, medal: { name: value.user.medalName, level: value.user.medalLevel } } }));
    });
  }
  private updateObs(value: ObsStatus): void {
    this.obs = value;
    if (value.state !== 'connected') this.obsReady = false;
    else if (!this.obsReady && this.core) { this.obsReady = true; this.binding.synchronize(value.scene, this.core.scene.activeId); }
  }
  private async readSettings(): Promise<void> {
    if (!this.core) return;
    const epoch = ++this.epoch, scenes = this.core.scenes;
    try {
      const [visuals, parameters] = await Promise.all([
        this.client.settings('preset', this.presetId).read<VisualSettings>(),
        Promise.all(scenes.map(async scene => [scene.id, await this.client.settings('scene', scene.id).read()] as const)),
      ]);
      if (epoch !== this.epoch) return;
      this.visuals = visuals; this.parameters = Object.fromEntries(parameters);
      this.binding.configure(scenes.map(scene => ({ id: scene.id, name: this.parameters[scene.id]?.obsSceneName?.trim() ?? '' })), this.obs.scene, this.core!.scene.activeId);
      this.sync();
    } catch (error) { console.error('LATENITE settings:', error); }
  }
  private sync(): void {
    if (!this.core || !this.visuals) return;
    const core = this.core, current = core.scenes.find(scene => scene.id === core.scene.activeId);
    if (!current) return;
    if (current.view !== 'away') this.normalId = current.id;
    const previous = core.scenes.find(scene => scene.id === core.scene.previousId && scene.view !== 'away');
    const normal = current.view === 'away' ? previous ?? core.scenes.find(scene => scene.id === this.normalId) ?? core.scenes.find(scene => scene.view !== 'away') : current;
    if (!normal || !this.parameters[normal.id]) return;
    const values = this.parameters[normal.id] as SceneParameters;
    const away = this.parameters[core.scenes.find(scene => scene.view === 'away')?.id ?? ''] ?? {};
    const mode: StageMode = normal.view === '16:9' ? '16:9' : '21:9';
    this.state = {
      config: { ...this.visuals, ...values, layoutMode: mode, layout: this.visuals.layoutProfiles[mode] ?? null,
        audio: { enabled: core.plugins.some(plugin => plugin.id === 'desktop-audio' && plugin.enabled) },
        away: { text1: '', text2: '', overlayOpacity: .9, ...away, enabled: current.view === 'away' } },
      audio: this.audio, nowPlaying: this.track, transition: core.scene.playback, laplace: this.chat,
      obsUrl: core.outputUrl, configUrl: core.configUrl, startup: core.startup,
    };
    this.dispatchEvent(new CustomEvent('state', { detail: this.state }));
  }
  start(): void { if (this.active) return; this.active = true; this.client.start(); }
  stop(): void { this.active = false; this.client.stop(); this.connected = false; }
  setOffline(offline: boolean): void { if (offline) this.stop(); }
}
export const host = new HostConnection();
export function socketUrl(path: string): string {
  const url = new URL(path === '/ws/audio' ? '/ws/plugins/desktop-audio/frames' : path, location.origin);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'; return url.href;
}
export function api<T = void>(path: string, method = 'GET', body?: unknown): Promise<T> { return request<T>(path, method, body); }
