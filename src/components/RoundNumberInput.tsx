import { useId } from "react";
import { getUsedPlayerIds } from "@/lib/matchFilter";
import type { Match, Player } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  matches: Match[];
  players: Player[];
  selectedIds: string[];
};

export default function RoundNumberInput({
  value,
  onChange,
  matches,
  players,
  selectedIds,
}: Props) {
  const id = useId();
  const usedIds = getUsedPlayerIds(matches, Number(value));
  const repeatedNames = players
    .filter((player) => selectedIds.includes(player.id) && usedIds.has(player.id))
    .map((player) => player.name);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        回戦
      </label>
      <input
        id={id}
        type="number"
        min={1}
        max={2147483647}
        step={1}
        required
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-help ${id}-notice`}
        className="rounded-lg px-3 py-3 text-lg w-full"
        style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
      />
      <p id={`${id}-help`} className="text-sm" style={{ color: "var(--muted)" }}>
        自動で候補を入れています。過去の回戦や飛び番にも変更できます。
      </p>
      <div id={`${id}-notice`} role="status" className="text-sm" style={{ color: "var(--muted)" }}>
        {repeatedNames.length > 0 &&
          `${repeatedNames.join("、")}は第${value}回戦に登録済みです。回戦を確認してください。このまま保存することもできます。`}
      </div>
    </div>
  );
}
