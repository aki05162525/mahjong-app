"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/hooks/useAuth";
import { SEED_RULES } from "@/lib/seedRules";
import { validateRule } from "@/lib/ruleValidation";

// ルール選択肢。プリセットは大会作成時に seed されるルールを指す
const PRESET_DESCRIPTIONS: Record<string, string> = {
  "10-20（ワンツー）": "ウマ 20 / 10 / -10 / -20・返し 30,000点",
  Mリーグルール: "ウマ 30 / 10 / -10 / -30・返し 30,000点",
};

type RuleChoice = { type: "preset"; name: string } | { type: "custom" };

const STEPS = ["大会情報", "選手登録", "ルール", "完了"] as const;

export default function NewTournamentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // ステップ1: 大会情報
  const [name, setName] = useState("");

  // ステップ2: 選手（作成実行までローカルに保持）
  const [players, setPlayers] = useState<string[]>([]);
  const [playerDraft, setPlayerDraft] = useState("");

  // ステップ3: ルール
  const [ruleChoice, setRuleChoice] = useState<RuleChoice>({
    type: "preset",
    name: SEED_RULES.find((rule) => rule.isDefault)?.name ?? SEED_RULES[0].name,
  });
  const [customName, setCustomName] = useState("");
  const [customUma, setCustomUma] = useState<string[]>(["20", "10", "-10", "-20"]);
  const [customReturn, setCustomReturn] = useState("30000");

  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const goNext = () => {
    setError("");
    setStep((s) => s + 1);
  };
  const goBack = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleNextFromInfo = () => {
    if (!name.trim()) {
      setError("大会名を入力してください");
      return;
    }
    goNext();
  };

  const handleAddPlayer = () => {
    const playerName = playerDraft.trim();
    if (!playerName) return;
    if (playerName.length > 20) {
      setError("名前は20文字以内で入力してください");
      return;
    }
    if (players.includes(playerName)) {
      setError("同じ名前のプレイヤーが既にいます");
      return;
    }
    setError("");
    setPlayers((prev) => [...prev, playerName]);
    setPlayerDraft("");
  };

  const handleRemovePlayer = (playerName: string) => {
    setPlayers((prev) => prev.filter((p) => p !== playerName));
  };

  const setCustomUmaAt = (i: number, v: string) =>
    setCustomUma((prev) => prev.map((u, idx) => (idx === i ? v : u)));

  const handleCreate = async () => {
    let rule: { type: "preset"; name: string } | Record<string, unknown>;
    if (ruleChoice.type === "preset") {
      rule = ruleChoice;
    } else {
      const custom = {
        name: customName.trim(),
        uma: customUma.map((u) => Number(u)),
        returnPoints: Number(customReturn),
      };
      const validationError = validateRule(custom);
      if (validationError) {
        setError(validationError);
        return;
      }
      rule = { type: "custom", ...custom };
    }

    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/create-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          players,
          rule,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "大会の作成に失敗しました");
        setCreating(false);
        return;
      }
      setCreated({ id: data.id });
      setCreating(false);
      goNext();
    } catch {
      setError("大会の作成に失敗しました");
      setCreating(false);
    }
  };

  const tournamentUrl = created ? `${window.location.origin}/${created.id}` : "";

  const handleCopyTournamentUrl = () => {
    navigator.clipboard.writeText(tournamentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <p className="text-lg" style={{ color: "var(--muted)" }}>
          読み込み中...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6 gap-6">
        <section
          className="w-full max-w-sm flex flex-col gap-3 rounded-xl p-6 shadow-sm"
          style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
        >
          <h1 className="text-xl font-semibold" style={{ color: "var(--body)" }}>
            新しい大会を作成
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            大会を作成・管理するにはGoogleアカウントでログインしてください
          </p>
          <GoogleSignInButton />
          <Link href="/" className="text-sm text-center" style={{ color: "var(--primary)" }}>
            ← トップへ戻る
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="max-w-md sm:max-w-xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8 min-h-screen">
      <div className="flex flex-col gap-1">
        {step === 0 && (
          <Link href="/" className="text-sm" style={{ color: "var(--primary)" }}>
            ← トップへ戻る
          </Link>
        )}
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
          新しい大会を作成
        </h1>
      </div>

      {/* ステップインジケーター */}
      <ol className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1 flex flex-col items-center gap-1">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
              style={
                i <= step
                  ? { background: "var(--primary)", color: "#fff" }
                  : {
                      background: "var(--canvas)",
                      color: "var(--muted)",
                      border: "1px solid var(--hairline)",
                    }
              }
            >
              {i + 1}
            </span>
            <span className="text-xs" style={{ color: i <= step ? "var(--ink)" : "var(--muted)" }}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      {error && (
        <p className="text-sm font-medium" role="alert" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      {/* ステップ1: 大会情報 */}
      {step === 0 && (
        <section
          className="flex flex-col gap-4 rounded-xl p-6 sm:p-8 shadow-sm"
          style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="tournament-name"
              className="font-semibold"
              style={{ color: "var(--body)" }}
            >
              大会名
            </label>
            <input
              id="tournament-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 第1回麻雀大会"
              className="rounded-lg px-4 py-3 text-lg w-full"
              style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
            />
          </div>
          <button
            onClick={handleNextFromInfo}
            className="rounded-lg px-4 py-3 text-lg font-semibold w-full active:opacity-80"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            次へ: 選手登録
          </button>
        </section>
      )}

      {/* ステップ2: 選手登録 */}
      {step === 1 && (
        <section
          className="flex flex-col gap-4 rounded-xl p-6 sm:p-8 shadow-sm"
          style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="player-name" className="font-semibold" style={{ color: "var(--body)" }}>
              参加する選手
            </label>
            {/* 入力欄が縮めない環境（ページ拡大率・文字サイズ拡大など）でもボタンが
                画面外に出ないよう、1行に収まらないときは折り返して下に落とす。 */}
            <div className="flex flex-wrap gap-2">
              <input
                id="player-name"
                type="text"
                value={playerDraft}
                onChange={(e) => setPlayerDraft(e.target.value)}
                onKeyDown={(e) => {
                  // IME 変換確定の Enter では追加しない
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddPlayer();
                }}
                enterKeyHint="done"
                placeholder="プレイヤー名"
                className="rounded-lg px-4 py-3 text-lg grow shrink basis-40 min-w-0"
                style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
              />
              <button
                onClick={handleAddPlayer}
                className="rounded-lg px-4 py-3 text-lg font-semibold active:opacity-80 shrink-0"
                style={{ background: "var(--accent-teal)", color: "#fff" }}
              >
                追加
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              あとから選手管理ページでも追加・変更できます
            </p>
          </div>

          {players.length > 0 && (
            <ul className="flex flex-col gap-2">
              {players.map((playerName) => (
                <li
                  key={playerName}
                  className="flex items-center justify-between rounded-lg px-4 py-2"
                  style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}
                >
                  <span style={{ color: "var(--ink)" }}>{playerName}</span>
                  <button
                    onClick={() => handleRemovePlayer(playerName)}
                    className="text-sm active:opacity-70"
                    style={{ color: "var(--error)" }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="flex-1 rounded-lg py-3 text-base active:opacity-70"
              style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
            >
              戻る
            </button>
            <button
              onClick={goNext}
              className="flex-1 rounded-lg py-3 text-base font-semibold active:opacity-80"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              次へ: ルール
            </button>
          </div>
        </section>
      )}

      {/* ステップ3: ルール */}
      {step === 2 && (
        <section
          className="flex flex-col gap-4 rounded-xl p-6 sm:p-8 shadow-sm"
          style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="font-semibold mb-2" style={{ color: "var(--body)" }}>
              大会のルール
            </legend>
            {SEED_RULES.map((rule) => {
              const selected = ruleChoice.type === "preset" && ruleChoice.name === rule.name;
              return (
                <label
                  key={rule.name}
                  className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer"
                  style={{
                    background: "var(--canvas)",
                    border: selected ? "2px solid var(--primary)" : "1px solid var(--hairline)",
                  }}
                >
                  <input
                    type="radio"
                    name="rule-choice"
                    checked={selected}
                    onChange={() => setRuleChoice({ type: "preset", name: rule.name })}
                    className="mt-1.5"
                  />
                  <span className="flex flex-col">
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>
                      {rule.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {PRESET_DESCRIPTIONS[rule.name]}
                    </span>
                  </span>
                </label>
              );
            })}
            <label
              className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer"
              style={{
                background: "var(--canvas)",
                border:
                  ruleChoice.type === "custom"
                    ? "2px solid var(--primary)"
                    : "1px solid var(--hairline)",
              }}
            >
              <input
                type="radio"
                name="rule-choice"
                checked={ruleChoice.type === "custom"}
                onChange={() => setRuleChoice({ type: "custom" })}
                className="mt-1.5"
              />
              <span className="flex flex-col">
                <span className="font-semibold" style={{ color: "var(--ink)" }}>
                  自分で設定
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  ウマ・返し点を自由に決める
                </span>
              </span>
            </label>
          </fieldset>

          {ruleChoice.type === "custom" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="custom-rule-name"
                  className="text-sm font-semibold"
                  style={{ color: "var(--body)" }}
                >
                  ルール名
                </label>
                <input
                  id="custom-rule-name"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例: 大会用ルール"
                  className="rounded-lg px-4 py-2 w-full"
                  style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold" style={{ color: "var(--body)" }}>
                  ウマ（1位〜4位・合計0）
                </span>
                <div className="flex gap-2">
                  {customUma.map((u, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      value={u}
                      onChange={(e) => setCustomUmaAt(i, e.target.value)}
                      aria-label={`${i + 1}位のウマ`}
                      className="rounded-lg px-2 py-2 w-full min-w-0 text-center"
                      style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="custom-return"
                  className="text-sm font-semibold"
                  style={{ color: "var(--body)" }}
                >
                  返し点
                </label>
                <input
                  id="custom-return"
                  type="text"
                  inputMode="numeric"
                  value={customReturn}
                  onChange={(e) => setCustomReturn(e.target.value)}
                  className="rounded-lg px-4 py-2 w-full"
                  style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={goBack}
              className="flex-1 rounded-lg py-3 text-base active:opacity-70"
              style={{ color: "var(--muted)", border: "1px solid var(--hairline)" }}
            >
              戻る
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 rounded-lg py-3 text-base font-semibold active:opacity-80 disabled:opacity-50"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {creating ? "作成中..." : "大会を作成"}
            </button>
          </div>
        </section>
      )}

      {/* ステップ4: 完了 */}
      {step === 3 && created && (
        <section
          className="flex flex-col gap-4 rounded-xl p-6 sm:p-8 shadow-sm"
          style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
            🎉 大会を作成しました
          </h2>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--body)" }}>
              大会リンク
            </p>
            <p className="text-sm" style={{ color: "var(--body)" }}>
              このリンクを開いた人は誰でも結果の閲覧と記録ができます。参加者に共有してください。
            </p>
            <p
              className="text-xs break-all rounded-lg p-3 font-mono"
              style={{ background: "var(--canvas)", border: "1px solid var(--hairline)" }}
            >
              {tournamentUrl}
            </p>
            <button
              onClick={handleCopyTournamentUrl}
              className="rounded-lg py-3 text-base font-semibold active:opacity-80"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              {copied ? "コピーしました！" : "大会リンクをコピー"}
            </button>
          </div>
          <button
            onClick={() => router.push(`/${created.id}`)}
            className="rounded-lg py-3 text-base font-semibold active:opacity-80"
            style={{ background: "var(--accent-teal)", color: "#fff" }}
          >
            大会ページへ
          </button>
        </section>
      )}
    </main>
  );
}
