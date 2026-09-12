export interface RenderGraphPass<TContext> {
  name: string;
  after?: readonly string[];
  enabled?: (context: TContext) => boolean;
  run: (context: TContext) => void;
}

/** Small deterministic render graph with dependency validation and cached order. */
export class GpuRenderGraph<TContext> {
  private readonly passes = new Map<string, RenderGraphPass<TContext>>();
  private compiled?: readonly RenderGraphPass<TContext>[];

  add(pass: RenderGraphPass<TContext>): this {
    if (this.passes.has(pass.name)) throw new Error(`Duplicate render pass: ${pass.name}`);
    this.passes.set(pass.name, pass);
    this.compiled = undefined;
    return this;
  }

  remove(name: string): void {
    this.passes.delete(name);
    this.compiled = undefined;
  }

  names(): readonly string[] {
    return [...this.passes.keys()];
  }

  compile(): readonly RenderGraphPass<TContext>[] {
    if (this.compiled) return this.compiled;
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const ordered: RenderGraphPass<TContext>[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) throw new Error(`Render graph cycle detected at: ${name}`);
      const pass = this.passes.get(name);
      if (!pass) throw new Error(`Unknown render pass dependency: ${name}`);
      visiting.add(name);
      for (const dependency of pass.after ?? []) {
        if (!this.passes.has(dependency)) {
          throw new Error(`Render pass ${name} depends on missing pass ${dependency}`);
        }
        visit(dependency);
      }
      visiting.delete(name);
      visited.add(name);
      ordered.push(pass);
    };

    for (const name of this.passes.keys()) visit(name);
    this.compiled = ordered;
    return ordered;
  }

  execute(context: TContext): void {
    for (const pass of this.compile()) {
      if (pass.enabled && !pass.enabled(context)) continue;
      pass.run(context);
    }
  }
}
