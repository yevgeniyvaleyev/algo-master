package expo.modules.studyalarms

import java.util.Calendar

/**
 * Kotlin mirror of src/logic/study-plan.ts (planDay / nextAlarmAt) — keep them in sync. The rest of the learning
 * day is split into one interval per remaining algorithm and each algorithm's learning time is centred in it.
 */
object StudyPlan {
  const val MIN_ALARM_GAP_MS = 10 * 60_000L

  data class Block(val start: Long, val end: Long)

  fun planDay(now: Long, start: Long, deadline: Long, costs: List<Long>): List<Block> {
    val from = maxOf(now, start)
    if (costs.isEmpty() || from >= deadline) return emptyList()
    val span = (deadline - from).toDouble()
    val total = costs.sum().toDouble()

    // Doesn't fit at all: back to back from now.
    if (total > span) {
      var t = from
      return costs.map { c -> Block(t, t + c).also { t += c } }
    }

    // Equal intervals when every block fits its interval, otherwise intervals proportional to cost.
    val equal = span / costs.size
    val proportional = costs.any { it > equal }
    var t = from.toDouble()
    return costs.map { c ->
      val width = if (proportional && total > 0) span * c / total else equal
      val mid = t + width / 2
      t += width
      Block((mid - c / 2.0).toLong(), (mid + c / 2.0).toLong())
    }
  }

  /**
   * Mirror of planItems in src/logic/card-day.ts: the day's cards split into floor(cards / MIN_CARD_GROUP) groups (at
   * least one, larger first), groups and algorithms each centred in their own equal share of the sequence (cards first
   * on a tie), e.g. 5 cards + 3 algorithms = [A, 3 cards, B, 2 cards, C].
   */
  fun planItems(algos: List<AlarmStore.Item>, cards: Int, cardCostMs: Long): List<AlarmStore.Item> {
    val groups = if (cards <= 0) 0 else maxOf(1, cards / MIN_CARD_GROUP)
    val n = algos.size
    val items = mutableListOf<AlarmStore.Item>()
    var g = 0
    var a = 0
    while (g < groups || a < n) {
      if (g < groups && (a >= n || (2 * g + 1) * n <= (2 * a + 1) * groups)) {
        val count = cards / groups + if (g < cards % groups) 1 else 0
        items.add(AlarmStore.Item.cards(count, count * cardCostMs))
        g++
      } else {
        items.add(algos[a])
        a++
      }
    }
    return items
  }

  const val MIN_CARD_GROUP = 2

  fun nextAlarmAt(plan: List<Block>, now: Long): Long? =
    plan.firstOrNull()?.let { maxOf(it.start, now + MIN_ALARM_GAP_MS) }

  /** Timestamp of `hour`:00 on the local day of `dayMs` shifted by `dayOffset` days (mirrors atHour in budget.ts). */
  fun atHour(dayMs: Long, dayOffset: Int, hour: Int): Long =
    Calendar.getInstance().apply {
      timeInMillis = dayMs
      add(Calendar.DAY_OF_YEAR, dayOffset)
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }.timeInMillis
}
