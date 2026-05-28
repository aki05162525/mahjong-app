type DebouncedFn = {
  (): void;
  cancel: () => void;
};

export function debounce(fn: () => void, delay: number): DebouncedFn {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debouncedFn = () => {
    clearTimeout(timer);
    timer = setTimeout(fn, delay);
  };

  debouncedFn.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debouncedFn;
}
