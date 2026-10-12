package expo.modules.appblocker

import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Blocking state shared between the JS module (writes the config) and the accessibility service (reads it and
 * records usage). Kept in SharedPreferences so the service works while the app is closed.
 */
object BlockerStore {
  private const val PREFS = "algomaster_app_blocker"

  private fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Local calendar day, same format as dayKey() in JS. */
  fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  fun write(ctx: Context, config: BlockerConfig) {
    prefs(ctx).edit()
      .putBoolean("enabled", config.enabled)
      .putStringSet("blocked", config.blockedPackages.toSet())
      .putInt("goal", config.dailyGoal)
      .putInt("learned", config.learnedToday)
      .putLong("grantedMs", config.grantedMs.toLong())
      .putLong("deadlineMs", config.deadlineMs.toLong())
      .putLong("reserveMs", config.reserveMs.toLong())
      .putString("day", config.day)
      .apply()
  }

  fun isBlockedPackage(ctx: Context, pkg: String): Boolean {
    val p = prefs(ctx)
    return p.getBoolean("enabled", false) && p.getStringSet("blocked", emptySet())?.contains(pkg) == true
  }

  fun goal(ctx: Context): Int = prefs(ctx).getInt("goal", 3)

  /** Learned today; a config written on an earlier day counts as 0 (new day, nothing learned yet). */
  fun learnedToday(ctx: Context): Int {
    val p = prefs(ctx)
    return if (p.getString("day", "") == today()) p.getInt("learned", 0) else 0
  }

  fun goalMet(ctx: Context): Boolean = learnedToday(ctx) >= goal(ctx)

  private fun isToday(ctx: Context): Boolean = prefs(ctx).getString("day", "") == today()

  /** Entertainment time granted today; 0 when the config is from an earlier day. */
  fun grantedMs(ctx: Context): Long = if (isToday(ctx)) prefs(ctx).getLong("grantedMs", 0L) else 0L

  /** End of today's learning day (epoch ms); 0 when the config is from an earlier day. */
  fun deadlineMs(ctx: Context): Long = if (isToday(ctx)) prefs(ctx).getLong("deadlineMs", 0L) else 0L

  /**
   * Spendable time right now: what learning granted minus what was used, but never more than the slack before the
   * deadline once the learning time for the rest of the goal is reserved. Computed in JS by availableMs() as well.
   */
  fun availableMs(ctx: Context, usedMs: Long, nowMs: Long = System.currentTimeMillis()): Long {
    if (!isToday(ctx)) return 0L
    val p = prefs(ctx)
    val slack = p.getLong("deadlineMs", 0L) - nowMs - p.getLong("reserveMs", 0L)
    return minOf(p.getLong("grantedMs", 0L) - usedMs, slack)
  }

  fun usedTodayMs(ctx: Context): Long {
    val p = prefs(ctx)
    return if (p.getString("usedDay", "") == today()) p.getLong("usedMs", 0L) else 0L
  }

  fun addUsed(ctx: Context, ms: Long) {
    if (ms <= 0) return
    prefs(ctx).edit().putString("usedDay", today()).putLong("usedMs", usedTodayMs(ctx) + ms).apply()
  }
}
