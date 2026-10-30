export interface SceneSlot {
  id: string; name: string; entry: string; width: number; height: number;
  transition: string; settingsPage: string; defaults: string;
  presetId?: string; sceneId?: string; view?: string; runtimeGroup?: string;
}
export interface PluginInfo {
  id: string; name: string; version: string; capabilities: string[];
  settingsPage: string; enabled: boolean; state: string; error: string | null;
  topics: Record<string, unknown>;
}
export interface ScenePlayback { id: string; startedAt: number; animate: boolean }
export interface SceneState { activeId: string | null; previousId: string | null; revision: number; playback: ScenePlayback | null }
export interface PublicState {
  apiVersion: 2; scenes: SceneSlot[]; scene: SceneState; preview: boolean;
  preset: { id: string; name: string; version: string; description: string; settingsPage: string; sidebarPage: string; requiredPlugins: string[] } | null;
  presetError: string | null; plugins: PluginInfo[]; outputUrl: string; configUrl: string; startup: boolean;
}
export interface PresetInfo {
  id: string; name: string; version: string; description: string; sceneCount: number;
  plugins: { id: string; minimumVersion: string; required: boolean }[]; available: boolean; error: string | null;
}
export interface CoreSettings { enabledPlugins: string[] }
export interface SceneSelection { animate?: boolean; cue?: string; startedAt?: number }
export interface TransitionContext { container: HTMLElement; from: SceneSlot | null; to: SceneSlot; signal: AbortSignal; covered(): void }
export interface TransitionModule { play(context: TransitionContext): Promise<void> }

export interface ChatMessage {
  id: string | null; kind: 'message' | 'gift' | 'superchat'; platform: string; timestamp: number;
  user: { id: string; name: string; level: number | null; medalName: string | null; medalLevel: number | null };
  text: string; gift: { name: string; count: number | null } | null; payment: { amount: number | null; currency: string } | null;
}
export interface CoreClient {
  on<T=unknown>(topic:string,callback:(data:T)=>void):()=>void;
  onState(callback:(state:PublicState)=>void):()=>void;
  start():void; stop():void;
  selectScene(id:string,options?:SceneSelection):Promise<PublicState>;
  settings(scope:'scene'|'plugin'|'preset',id:string):{read<T extends object=Record<string,unknown>>():Promise<T>;save(value:object):Promise<void>;patch(value:object):Promise<void>};
}
export interface CoreSdk {
  createClient(options?:{baseUrl?:string;previewId?:string|null}):CoreClient;
  getSceneContext():{sceneId:string|null;presetId:string|null;pluginId:string|null;preview:boolean;previewId:string|null};
  request<T>(path:string,method?:string,body?:unknown,baseUrl?:string):Promise<T>;
}
