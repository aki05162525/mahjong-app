type DebouncedFn = {
  (): void;
  cancel: () => void;
};

export function debounce(fn: () => void, delay: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debouncedFn: DebouncedFn = Object.assign(
    () => {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    },
    {
      cancel: () => {
        clearTimeout(timer);
        timer = undefined;
      },
    }
  );

  return debouncedFn;
}
