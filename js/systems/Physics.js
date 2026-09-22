/**
 * 物理運算與碰撞判定系統 (Physics System)
 */
export class Physics {
  /**
   * 應用重力加速度與阻尼更新質點運動
   */
  static integrate(point, gravity, drag, dt) {
    // 空氣阻尼
    if (drag) {
      point.vx *= Math.pow(drag, dt * 60);
      point.vy *= Math.pow(drag, dt * 60);
    }

    // 重力
    if (gravity) {
      point.vy += gravity * dt;
    }

    // 位移更新
    point.x += point.vx * dt;
    point.y += point.vy * dt;

    // 角速度更新
    if (point.rotSpeed !== undefined) {
      point.rotation = (point.rotation || 0) + point.rotSpeed * dt;
    }
  }

  /**
   * 邊界碰撞檢測與反彈衰減
   */
  static checkBounds(point, bounds, restitution = 0.6) {
    let collided = false;

    // 下邊界碰撞反彈
    if (bounds.bottom !== undefined && point.y >= bounds.bottom) {
      point.y = bounds.bottom;
      point.vy = -point.vy * restitution;
      collided = true;
    }

    // 左右邊界反彈
    if (bounds.left !== undefined && point.x <= bounds.left) {
      point.x = bounds.left;
      point.vx = -point.vx * restitution;
      collided = true;
    } else if (bounds.right !== undefined && point.x >= bounds.right) {
      point.x = bounds.right;
      point.vx = -point.vx * restitution;
      collided = true;
    }

    return collided;
  }

  /**
   * AABB (軸對齊矩形) 碰撞檢測
   */
  static checkAABB(rectA, rectB) {
    return (
      rectA.x < rectB.x + rectB.width &&
      rectA.x + rectA.width > rectB.x &&
      rectA.y < rectB.y + rectB.height &&
      rectA.y + rectA.height > rectB.y
    );
  }
}
