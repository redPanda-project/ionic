export class Utils {
  public static shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public static arrayBuffersAreEqual(a, b): boolean {
    return Utils.dataViewsAreEqual(new DataView(a), new DataView(b));
  }

  // compare DataViews
  public static dataViewsAreEqual(a, b): boolean {
    if (a.byteLength !== b.byteLength) return false;
    for (let i = 0; i < a.byteLength; i++) {
      if (a.getUint8(i) !== b.getUint8(i)) return false;
    }
    return true;
  }
}
