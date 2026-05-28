-- match_results.tournament_id が match_id の大会と一致することを DB レベルで強制する
-- composite FK により (match_id, tournament_id) の組み合わせが matches テーブルに存在することを保証する

ALTER TABLE matches ADD CONSTRAINT matches_id_tournament_id_key UNIQUE (id, tournament_id);

ALTER TABLE match_results DROP CONSTRAINT match_results_match_id_fkey;
ALTER TABLE match_results ADD CONSTRAINT match_results_match_id_tournament_id_fkey
  FOREIGN KEY (match_id, tournament_id) REFERENCES matches(id, tournament_id);
