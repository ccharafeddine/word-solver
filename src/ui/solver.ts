/** Talks to the word worker: one request at a time per kind, newest wins. */
import type { Req, Res } from '../worker';

type Body = Req extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never;

export class Words {
  private worker = new Worker(new URL('../worker.ts', import.meta.url), { type: 'module' });
  private seq = 0;
  private waiting = new Map<number, (r: Res) => void>();
  private latest = new Map<string, number>();
  readonly ready: Promise<{ words: number; five: number; ms: number }>;

  constructor() {
    this.worker.onmessage = (e: MessageEvent<Res>) => { this.waiting.get(e.data.id)?.(e.data); this.waiting.delete(e.data.id); };
    this.worker.onerror = (e) => { for (const f of this.waiting.values()) f({ id: -1, ok: false, error: e.message || 'the word worker stopped' }); this.waiting.clear(); };
    this.ready = this.ask({ kind: 'init', base: new URL('data/', location.href).href }) as Promise<{ words: number; five: number; ms: number }>;
  }

  /** Ask the worker. Resolves null when a newer request of the same kind replaced it. */
  ask(body: Body): Promise<unknown> {
    const id = ++this.seq;
    this.latest.set(body.kind, id);
    return new Promise((ok, bad) => {
      this.waiting.set(id, (r) => {
        if (this.latest.get(body.kind) !== id) return ok(null);
        if (r.ok) ok(r.data); else bad(new Error(r.error));
      });
      this.worker.postMessage({ ...body, id } as Req);
    });
  }
}
