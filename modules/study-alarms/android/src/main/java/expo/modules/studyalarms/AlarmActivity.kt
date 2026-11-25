package expo.modules.studyalarms

import android.app.Activity
import android.app.KeyguardManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Full-screen alarm shown over the lock screen, for an algorithm or a group of flash cards (then with today's card
 * numbers). The sound comes from the insistent notification and the vibration from AlarmRinger; closing this screen in
 * any way stops both. Started with ACTION_START (the notification's «Начать»), it shows nothing and goes straight on. «Отложить» re-rings the same block after the snooze time; «Пропустить» and the back button just close it.
 * Unanswered, it closes after a minute (counts as ignored; the next alarm was already re-planned when this one fired).
 */
class AlarmActivity : Activity() {
  companion object {
    const val ACTION_START = "expo.modules.studyalarms.START"
  }

  private val handler = Handler(Looper.getMainLooper())

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    val item = AlarmScheduler.itemFrom(intent)
    if (intent.action == ACTION_START) {
      start(item)
      return
    }
    val (_, title, detail) = AlarmNotification.texts(item)
    val config = AlarmStore.read(this)
    val cardsLeft = AlarmStore.cardsLeftToday(config)
    val deadline = StudyPlan.atHour(System.currentTimeMillis(), 0, config.endHour)
    val deadlineText = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(deadline))
    val dp = resources.displayMetrics.density

    fun label(value: String, sizeSp: Float, color: Int, bold: Boolean = false) =
      TextView(this).apply {
        text = value
        textSize = sizeSp
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 0, 0, (14 * dp).toInt())
      }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0F1115"))
      val pad = (32 * dp).toInt()
      setPadding(pad, pad, pad, pad)
      addView(
        label(if (item.isCards) "⏰ Время повторить карточки" else "⏰ Время учить", 18f, Color.parseColor("#748FFC"), bold = true),
      )
      addView(label(title, 28f, Color.WHITE, bold = true))
      addView(label(detail, 16f, Color.parseColor("#B0B6C3")))
      if (item.isCards) {
        val today = AlarmStore.today(config) == config.day
        val reviewed = AlarmStore.cardsReviewedToday(config)
        val goal = if (config.cardDailyGoal > 0) " из ${config.cardDailyGoal}" else ""
        val due = if (today) " · к повтору ${config.cardsDue}" else ""
        addView(label("Повторено сегодня $reviewed$goal$due", 15f, Color.WHITE))
        // Due cards per box, only boxes with any (box 1 includes the waiting cards that refill it today).
        val boxes = config.cardsDueByBox.withIndex().filter { it.value > 0 }
        if (today && boxes.isNotEmpty()) {
          addView(
            label(
              "По коробкам: " + boxes.joinToString(" · ") { "${it.index + 1} — ${it.value}" },
              14f,
              Color.parseColor("#9AA0A6"),
            ),
          )
        }
        addView(
          label(
            "Изучено алгоритмов ${AlarmStore.learnedToday(config)} из ${AlarmStore.goalToday(config)} · учебный день до $deadlineText",
            13f,
            Color.parseColor("#9AA0A6"),
          ),
        )
      } else {
        addView(
          label(
            "Изучено сегодня ${AlarmStore.learnedToday(config)} из ${AlarmStore.goalToday(config)}" +
              (if (cardsLeft > 0) " · карточек осталось $cardsLeft" else "") +
              " · учебный день до $deadlineText",
            14f,
            Color.parseColor("#9AA0A6"),
          ),
        )
      }
      addView(Button(this@AlarmActivity).apply {
        text = "Начать"
        setOnClickListener { start(item) }
      })
      addView(Button(this@AlarmActivity).apply {
        text = AlarmNotification.snoozeLabel(this@AlarmActivity)
        setOnClickListener { snooze(item) }
      })
      addView(Button(this@AlarmActivity).apply {
        text = "Пропустить"
        setOnClickListener { dismiss() }
      })
    }
    setContentView(root)
    handler.postDelayed({ dismiss() }, 60_000L)
  }

  // singleTask: the notification's «Начать» while this screen is open arrives here.
  override fun onNewIntent(intent: android.content.Intent) {
    super.onNewIntent(intent)
    if (intent.action == ACTION_START) start(AlarmScheduler.itemFrom(intent))
  }

  private fun start(item: AlarmStore.Item) {
    AlarmRinger.stop(this)
    val open = { startActivity(AlarmNotification.openIntent(this, item)) }
    // Over the lock screen the app can only open after unlocking.
    val keyguard = getSystemService(KeyguardManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguard.isKeyguardLocked) {
      keyguard.requestDismissKeyguard(
        this,
        object : KeyguardManager.KeyguardDismissCallback() {
          override fun onDismissSucceeded() {
            open()
            finish()
          }
        },
      )
    } else {
      open()
      finish()
    }
  }

  private fun snooze(item: AlarmStore.Item) {
    AlarmScheduler.snooze(this, item)
    dismiss()
  }

  private fun dismiss() {
    AlarmRinger.stop(this)
    finish()
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    super.onDestroy()
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    dismiss()
  }
}
