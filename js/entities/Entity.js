/**
 * 實體基類 (Entity Base Class)
 */
export class Entity {
  constructor(x = 0, y = 0, id = null) {
    this.x = x;
    this.y = y;
    this.id = id || Math.random().toString(36).substring(2, 9);
    this.active = true;
  }

  /**
   * 生命週期更新方法 (子類可覆寫)
   * @param {number} dt Delta time in seconds
   */
  update(dt) {}

  /**
   * 生命週期渲染方法 (子類可覆寫)
   */
  render() {}

  /**
   * 銷毀實體
   */
  destroy() {
    this.active = false;
  }
}
