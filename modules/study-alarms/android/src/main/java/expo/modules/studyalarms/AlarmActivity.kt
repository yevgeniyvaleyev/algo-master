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
 * Full-screen alarm shown over the lock screen. The sound and vibration come from the insistent notification, so
 * closing this screen in any way cancels it. Unanswered, it closes after a minute (counts as ignored; the next alarm
 * was already re-planned when this one fired).
 */
class AlarmActivity : Activity() {
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

    val slug = intent.getStringExtra(AlarmScheduler.EXTRA_SLUG) ?: ""
    val title = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE) ?: ""
    val difficulty = intent.getStringExtra(AlarmScheduler.EXTRA_DIFFICULTY) ?: "easy"
    val minutes = intent.getLongExtra(AlarmScheduler.EXTRA_COST, 0L) / 60_000L
    val config = AlarmStore.read(this)
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
      addView(label("⏰ Время учить", 18f, Color.parseColor("#748FFC"), bold = true))
      addView(label(title, 28f, Color.WHITE, bold = true))
      addView(label("${AlarmNotification.difficultyLabel(difficulty)} · ~$minutes мин.", 16f, Color.parseColor("#B0B6C3")))
      addView(
        label(
          "Изучено сегодня ${AlarmStore.learnedToday(config)} из ${config.goal} · учебный день до $deadlineText",
          14f,
          Color.parseColor("#9AA0A6"),
        ),
      )
      addView(Button(this@AlarmActivity).apply {
        text = "Начать"
        setOnClickListener { start(slug) }
      })
      addView(Button(this@AlarmActivity).apply {
        text = "Позже"
        setOnClickListener { dismiss() }
      })
    }
    setContentView(root)
    handler.postDelayed({ dismiss() }, 60_000L)
  }

  private fun start(slug: String) {
    AlarmNotification.cancel(this)
    val open = { startActivity(AlarmNotification.openIntent(this, slug)) }
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

  private fun dismiss() {
    AlarmNotification.cancel(this)
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
