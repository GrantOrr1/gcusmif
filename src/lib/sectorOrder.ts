export function sortBySectorOrder<T>(
  items: T[],
  order: string[],
  getKey: (item: T) => string
): T[] {
  const indexOf = (key: string) => {
    const i = order.indexOf(key);
    return i === -1 ? order.length : i;
  };
  return [...items].sort((a, b) => indexOf(getKey(a)) - indexOf(getKey(b)));
}
