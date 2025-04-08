let knightPosition = [0, 0]
let observers = []
function emitChange() {
  observers.forEach((o) => o && o(knightPosition))
}
export function observe(o) {
  observers.push(o)
  emitChange()
  return () => {
    observers = observers.filter((t) => t !== o)
  }
}
export function canMoveKnight(toX, toY) {
  const [x, y] = knightPosition
  const dx = toX - x
  const dy = toY - y
  return true
}
export function moveKnight(toX, toY) {
  knightPosition = [toX, toY]
  emitChange()
}
