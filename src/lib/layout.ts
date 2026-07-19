// アプリ全体で統一するページコンテナ幅。
// 狭い画面では全幅（px-4 の余白のみ）、それ以上は 448px → 576px（sm〜）で頭打ちにする。
// この幅に収まらない表（ランキングなど）はコンテナを広げず overflow-x-auto で内側スクロールさせる。
export const PAGE_CONTAINER = "w-full max-w-md sm:max-w-xl mx-auto";
