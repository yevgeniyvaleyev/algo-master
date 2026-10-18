package expo.modules.studyalarms

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/** Keeps exactly one exact alarm set: the start of the next planned block (today, or tomorrow once today is done). */
object AlarmScheduler {
  private const val REQUEST_ALARM = 1
  private const val REQUEST_TEST = 2
  private const val TEST_DELAY_MS = 5_000L

  const val EXTRA_SLUG = "slug"
  const val EXTRA_TITLE = "title"
  const val EXTRA_DIFFICULTY = "difficulty"
  const val EXTRA_COST = "costMs"

  data class Next(val at: Long, val item: AlarmStore.Item)

  fun computeNext(ctx: Context, now: Long): Next? {
    val config = AlarmStore.read(ctx)
    if (!config.enabled) return null
    for (dayOffset in 0..1) {
      // Tomorrow starts from scratch; today's learned algorithms are no longer in `upcoming`.
      val learned = if (dayOffset == 0) AlarmStore.learnedToday(config) else 0
      val items = config.upcoming.take(maxOf(0, config.goal - learned))
      if (items.isEmpty()) continue
      val start = StudyPlan.atHour(now, dayOffset, config.startHour)
      val deadline = StudyPlan.atHour(now, dayOffset, config.endHour)
      val plan = StudyPlan.planDay(now, start, deadline, items.map { it.costMs })
      val at = StudyPlan.nextAlarmAt(plan, now) ?: continue
      if (at < deadline) return Next(at, items[0])
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

  fun test(ctx: Context) {
    val item = AlarmStore.read(ctx).upcoming.firstOrNull()
      ?: AlarmStore.Item("", "Тестовый будильник", "easy", 30 * 60_000L)
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

  private fun alarmIntent(ctx: Context, requestCode: Int, item: AlarmStore.Item?): PendingIntent {
    val intent = Intent(ctx, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION_RING)
    if (item != null) {
      intent.putExtra(EXTRA_SLUG, item.slug)
        .putExtra(EXTRA_TITLE, item.title)
        .putExtra(EXTRA_DIFFICULTY, item.difficulty)
        .putExtra(EXTRA_COST, item.costMs)
    }
    return PendingIntent.getBroadcast(
      ctx,
      requestCode,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }
}
