export interface Env {
	// 在 wrangler.toml 中定义的变量会出现在这里
	OKX_BASE_URL: string;
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return new Response('Hello World!');
	},
} satisfies ExportedHandler<Env>;
