-- ================================================
-- [P1] matches.table_id が同じ大会の卓であることを強制
-- tables(tournament_id, id) を複合ユニークキーにして matches から参照する
-- ================================================
alter table tables add unique (tournament_id, id);

alter table matches
  add constraint matches_table_in_tournament
  foreign key (tournament_id, table_id)
  references tables(tournament_id, id);

-- ================================================
-- [P1] match_results.player_id が同じ大会のプレイヤーであることを強制
-- トリガーで INSERT/UPDATE 時に確認する
-- ================================================
create or replace function check_match_result_player_tournament()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1
    from players p
    join matches m on m.id = new.match_id
    where p.id = new.player_id
      and p.tournament_id = m.tournament_id
  ) then
    raise exception
      'player % does not belong to the tournament of match %',
      new.player_id, new.match_id;
  end if;
  return new;
end;
$$;

create trigger enforce_match_result_player_tournament
  before insert or update on match_results
  for each row execute function check_match_result_player_tournament();

-- ================================================
-- [P2] 1対局につき同じプレイヤー・同じ順位は1行だけ許可
-- ================================================
alter table match_results add unique (match_id, player_id);
alter table match_results add unique (match_id, rank);