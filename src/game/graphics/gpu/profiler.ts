interface TimerQueryExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

interface PendingQuery {
  label: string;
  query: WebGLQuery;
}

export interface GpuTimingSample {
  label: string;
  milliseconds: number;
}

/** Non-blocking GPU timing using EXT_disjoint_timer_query_webgl2 when available. */
export class GpuProfiler {
  private readonly ext?: TimerQueryExtension;
  private active?: PendingQuery;
  private readonly pending: PendingQuery[] = [];
  private readonly samples = new Map<string, number>();

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExtension | null ?? undefined;
  }

  get supported(): boolean {
    return !!this.ext;
  }

  begin(label: string): void {
    if (!this.ext || this.active) return;
    const query = this.gl.createQuery();
    if (!query) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
    this.active = { label, query };
  }

  end(): void {
    if (!this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = undefined;
  }

  poll(): readonly GpuTimingSample[] {
    if (!this.ext) return [];
    const gl = this.gl;
    const disjoint = !!gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    const completed: GpuTimingSample[] = [];
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const pending = this.pending[i];
      const available = !!gl.getQueryParameter(pending.query, gl.QUERY_RESULT_AVAILABLE);
      if (!available) continue;
      this.pending.splice(i, 1);
      if (!disjoint) {
        const nanoseconds = Number(gl.getQueryParameter(pending.query, gl.QUERY_RESULT));
        const milliseconds = nanoseconds / 1_000_000;
        this.samples.set(pending.label, milliseconds);
        completed.push({ label: pending.label, milliseconds });
      }
      gl.deleteQuery(pending.query);
    }
    return completed;
  }

  latest(label: string): number | undefined {
    return this.samples.get(label);
  }

  dispose(): void {
    if (this.active && this.ext) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.gl.deleteQuery(this.active.query);
      this.active = undefined;
    }
    for (const pending of this.pending) this.gl.deleteQuery(pending.query);
    this.pending.length = 0;
    this.samples.clear();
  }
}
