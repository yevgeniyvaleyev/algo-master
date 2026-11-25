package expo.modules.studyalarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Keeps exactly one exact alarm set: the start of the next planned block whose kind rings (algorithm / card alarms have
 * separate switches; today, or tomorrow once today is done). A snoozed alarm is a second, independent one.
 */
object AlarmScheduler {
  private const val REQUEST_ALARM = 1
  private const val REQUEST_TEST = 2
  private const val REQUEST_SNOOZE = 3
  private const val TEST_DELAY_MS = 5_000L

  const val EXTRA_SLUG = "slug"
  const val EXTRA_TITLE = "title"
  const val EXTRA_DIFFICULTY = "difficulty"
  const val EXTRA_COST = "costMs"
  const val EXTRA_KIND = "kind"
  const val EXTRA_COUNT = "count"
  /** Set on a snoozed alarm: it re-rings only if its block is still to do (see stillToDo). */
  const val EXTRA_SNOOZED = "snoozed"

  /** Reads the planned block an alarm intent carries (see alarmIntent / AlarmNotification.show). */
  fun itemFrom(intent: Intent) =
    AlarmStore.Item(
      slug = intent.getStringExtra(EXTRA_SLUG) ?: "",
      title = intent.getStringExtra(EXTRA_TITLE) ?: "",
      difficulty = intent.getStringExtra(EXTRA_DIFFICULTY) ?: "easy",
      costMs = intent.getLongExtra(EXTRA_COST, 0L),
      kind = intent.getStringExtra(EXTRA_KIND) ?: AlarmStore.Item.KIND_ALGO,
      count = intent.getIntExtra(EXTRA_COUNT, 0),
    )

  /** Adds the planned block to an alarm intent. */
  fun putItem(intent: Intent, item: AlarmStore.Item): Intent =
    intent.putExtra(EXTRA_SLUG, item.slug)
      .putExtra(EXTRA_TITLE, item.title)
      .putExtra(EXTRA_DIFFICULTY, item.difficulty)
      .putExtra(EXTRA_COST, item.costMs)
      .putExtra(EXTRA_KIND, item.kind)
      .putExtra(EXTRA_COUNT, item.count)

  data class Next(val at: Long, val item: AlarmStore.Item)

  fun computeNext(ctx: Context, now: Long): Next? {
    val config = AlarmStore.read(ctx)
    if (!config.enabled && !config.cardsEnabled) return null
    for (dayOffset in 0..1) {
      // Tomorrow starts from scratch; today's learned algorithms are no longer in `upcoming`.
      val learned = if (dayOffset == 0) AlarmStore.learnedToday(config) else 0
      val cards = if (dayOffset == 0) AlarmStore.cardsLeftToday(config) else config.cardGoal
      val goal = if (dayOffset == 0) AlarmStore.goalToday(config) else config.goalTomorrow
      val algos = config.upcoming.take(maxOf(0, goal - learned))
      val items = StudyPlan.planItems(algos, cards, config.cardCostMs)
      if (items.isEmpty()) continue
      // Hours of the app's day (startHour ≥ the day start hour, so they never fall before the day begins).
      val start = StudyPlan.atHour(config.logical(now), dayOffset, config.startHour)
      val deadline = StudyPlan.atHour(config.logical(now), dayOffset, config.endHour)
      // Everything is planned (so the timing matches the app's plan); only the enabled kinds ring.
      val plan = StudyPlan.planDay(now, start, deadline, items.map { it.costMs })
      val rings = items.map { ringsFor(config, it) }
      val index = StudyPlan.firstRinging(plan, rings) ?: continue
      val at = StudyPlan.nextAlarmAt(plan, now, rings) ?: continue
      if (at < deadline) return Next(at, items[index])
    }
    return null
  }

  /** Cancels the pending alarm and sets the next one from the stored plan inputs. */
  fun reschedule(ctx: Context) {
    val am = ctx.getSystemService(AlarmManager::class.java)
    am.cancel(alarmIntent(ctx, REQUEST_ALARM, null))
    val next = computeNext(ctx, System.currentTimeMillis())
    AlarmStore.saveNext(ctx, next?.at, next?.item)
    if (next != null) set(ctx, am, next.at, alarmIntent(ctx, REQUEST_ALARM, next.item))
  }

  private fun ringsFor(config: AlarmStore.Config, item: AlarmStore.Item) =
    if (item.isCards) config.cardsEnabled else config.enabled

  /** Whether a snoozed block is still to do: its algorithm isn't learned yet / cards are still left today. */
  fun stillToDo(ctx: Context, item: AlarmStore.Item): Boolean {
    val config = AlarmStore.read(ctx)
    if (!ringsFor(config, item)) return false
    if (item.isCards) return AlarmStore.cardsLeftToday(config) > 0
    if (item.slug.isEmpty()) return true
    val left = maxOf(0, AlarmStore.goalToday(config) - AlarmStore.learnedToday(config))
    return config.upcoming.take(left).any { it.slug == item.slug }
  }

  /** Re-rings `item` after the snooze time; the planned alarm stays as it is. */
  fun snooze(ctx: Context, item: AlarmStore.Item) {
    val minutes = AlarmStore.read(ctx).snoozeMinutes
    val am = ctx.getSystemService(AlarmManager::class.java)
    set(ctx, am, System.currentTimeMillis() + minutes * 60_000L, alarmIntent(ctx, REQUEST_SNOOZE, item, snoozed = true))
  }

  /** Rings a test alarm in a few seconds: the next algorithm, or (`cards`) a card group of today's size (at least 3). */
  fun test(ctx: Context, cards: Boolean = false) {
    val config = AlarmStore.read(ctx)
    val item =
      if (cards) {
        val count = maxOf(3, AlarmStore.cardsLeftToday(config))
        AlarmStore.Item.cards(count, count * config.cardCostMs)
      } else {
        config.upcoming.firstOrNull() ?: AlarmStore.Item("", "Тестовый будильник", "easy", 30 * 60_000L)
      }
    val am = ctx.getSystemService(AlarmManager::class.java)
    set(ctx, am, System.currentTimeMillis() + TEST_DELAY_MS, alarmIntent(ctx, REQUEST_TEST, item))
  }

  private fun set(ctx: Context, am: AlarmManager, at: Long, operation: PendingIntent) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      return
    }
    // An alarm clock is exact, fires in Doze and shows the alarm icon; tapping that icon opens the app.
    val show = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.let {
      PendingIntent.getActivity(ctx, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    am.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), operation)
  }

  private fun alarmIntent(ctx: Context, requestCode: Int, item: AlarmStore.Item?, snoozed: Boolean = false): PendingIntent {
    val intent = Intent(ctx, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION_RING)
    if (item != null) putItem(intent, item)
    if (snoozed) intent.putExtra(EXTRA_SNOOZED, true)
    return PendingIntent.getBroadcast(
      ctx,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }
}
