package expo.modules.studyalarms

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Planning inputs pushed from JS, kept in SharedPreferences so alarms can be re-planned while the app is closed. */
object AlarmStore {
  private const val PREFS = "algomaster_study_alarms"

  /** A planned block: an algorithm, or (`kind` = "cards") a group of `count` flash cards. */
  data class Item(
    val slug: String,
    val title: String,
    val difficulty: String,
    val costMs: Long,
    val kind: String = KIND_ALGO,
    val count: Int = 0,
  ) {
    val isCards get() = kind == KIND_CARDS

    companion object {
      const val KIND_ALGO = "algo"
      const val KIND_CARDS = "cards"

      fun cards(count: Int, costMs: Long) = Item("", "Карточки: $count", "easy", costMs, KIND_CARDS, count)
    }
  }

  data class Config(
    val enabled: Boolean,
    val startHour: Int,
    val endHour: Int,
    val goal: Int,
    val learnedToday: Int,
    val day: String,
    val dayStartHour: Int,
    val upcoming: List<Item>,
    val cardsLeft: Int,
    val cardGoal: Int,
    val cardCostMs: Long,
  ) {
    /** `ms` moved back by the day start hour: its calendar day is the app's day. */
    fun logical(ms: Long): Long = ms - dayStartHour * 3_600_000L
  }

  private fun prefs(ctx: Context): SharedPreferences = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** The app's day (local calendar day shifted by the day start hour), same format as dayKey() in JS. */
  fun today(config: Config): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(config.logical(System.currentTimeMillis())))

  fun write(ctx: Context, config: AlarmConfig) {
    val upcoming = JSONArray()
    config.upcoming.forEach {
      upcoming.put(
        JSONObject().put("slug", it.slug).put("title", it.title).put("difficulty", it.difficulty).put("costMs", it.costMs.toLong()),
      )
    }
    prefs(ctx).edit()
      .putBoolean("enabled", config.enabled)
      .putInt("startHour", config.startHour)
      .putInt("endHour", config.endHour)
      .putInt("goal", config.goal)
      .putInt("learned", config.learnedToday)
      .putString("day", config.day)
      .putInt("dayStartHour", config.dayStartHour)
      .putString("upcoming", upcoming.toString())
      .putInt("cardsLeft", config.cardsLeft)
      .putInt("cardGoal", config.cardGoal)
      .putLong("cardCostMs", config.cardCostMs.toLong())
      .apply()
  }

  fun read(ctx: Context): Config {
    val p = prefs(ctx)
    val json = JSONArray(p.getString("upcoming", "[]"))
    val upcoming = (0 until json.length()).map { i ->
      val o = json.getJSONObject(i)
      Item(o.getString("slug"), o.getString("title"), o.getString("difficulty"), o.getLong("costMs"))
    }
    return Config(
      enabled = p.getBoolean("enabled", false),
      startHour = p.getInt("startHour", 9),
      endHour = p.getInt("endHour", 21),
      goal = p.getInt("goal", 3),
      learnedToday = p.getInt("learned", 0),
      day = p.getString("day", "") ?: "",
      dayStartHour = p.getInt("dayStartHour", 0),
      upcoming = upcoming,
      cardsLeft = p.getInt("cardsLeft", 0),
      cardGoal = p.getInt("cardGoal", 0),
      cardCostMs = p.getLong("cardCostMs", 2 * 60_000L),
    )
  }

  /** Learned today; a config written on an earlier day counts as 0. */
  fun learnedToday(config: Config): Int = if (config.day == today(config)) config.learnedToday else 0

  /** Flash cards still to review today; a config written on an earlier day asks for the whole card goal. */
  fun cardsLeftToday(config: Config): Int = if (config.day == today(config)) config.cardsLeft else config.cardGoal

  fun saveNext(ctx: Context, at: Long?, item: Item?) {
    prefs(ctx).edit()
      .putLong("nextAt", at ?: 0L)
      .putString("nextSlug", item?.slug)
      .putString("nextTitle", item?.title)
      .apply()
  }

  fun next(ctx: Context): Triple<Long, String, String>? {
    val p = prefs(ctx)
    val at = p.getLong("nextAt", 0L)
    if (at <= System.currentTimeMillis()) return null
    return Triple(at, p.getString("nextSlug", "") ?: "", p.getString("nextTitle", "") ?: "")
  }
}
