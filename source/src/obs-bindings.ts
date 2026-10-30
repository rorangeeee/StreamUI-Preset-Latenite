export interface ObsSceneEvent { id: string; name: string; startedAt: number }
export interface Binding { id: string; name: string }
export interface Selection { animate: boolean; cue?: string; startedAt?: number }

/** Bindings and animation policy belong to the preset, not the OBS connection plugin. */
export class ObsSceneBindings {
  private bindings: Binding[] = [];
  private lastName: string | null = null;
  private signature = '';
  private select: (id: string, options: Selection) => void;
  private preview: boolean;
  constructor(select: (id: string, options: Selection) => void, preview: boolean) { this.select = select; this.preview = preview; }
  configure(bindings: Binding[], currentName: string | null, activeId: string | null): void {
    const signature = JSON.stringify(bindings);
    if (signature === this.signature) return;
    this.signature = signature; this.bindings = bindings.filter(binding => binding.name.trim() !== '');
    this.synchronize(currentName, activeId);
  }
  synchronize(name: string | null, activeId: string | null): void {
    this.lastName = name;
    const target = this.bindings.find(binding => binding.name === name);
    if (!this.preview && target && target.id !== activeId) this.select(target.id, { animate: false, cue: 'sync-' + target.id + '-' + name });
  }
  observe(event: ObsSceneEvent): void {
    if (event.name === this.lastName) return;
    this.lastName = event.name;
    if (this.preview) return;
    const target = this.bindings.find(binding => binding.name === event.name);
    if (target) this.select(target.id, { animate: true, cue: event.id, startedAt: event.startedAt });
  }
}
