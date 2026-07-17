-- ================================================
-- 記録トークン（capability）のハッシュ保存先
-- ================================================
-- tournaments は anon に全列 SELECT を許可しているため、トークンを
-- tournaments の列に置くと Data API から丸読みされる。別テーブルに分離し、
-- anon / authenticated には一切 GRANT しないことで Data API から到達不能にする。
-- raw トークンは保存しない（sha256 ハッシュのみ）。

create table tournament_write_secrets (
  tournament_id text primary key references tournaments(id) on delete cascade,
  token_hash    text not null,
  created_at    timestamptz not null default now()
);

alter table tournament_write_secrets enable row level security;

-- 書き込み・読み取りとも service_role のみ（API Routes の Admin クライアントが使用）
create policy "tournament_write_secrets_service_only"
  on tournament_write_secrets for all
  using (auth.role() = 'service_role');

-- Supabase はデフォルト権限で新規テーブルを anon / authenticated に GRANT するため、
-- 明示的に REVOKE して Data API から完全に遮断する（RLS だけに頼らない多層防御）
revoke all on tournament_write_secrets from anon, authenticated;
