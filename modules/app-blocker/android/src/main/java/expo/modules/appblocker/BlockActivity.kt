package expo.modules.appblocker

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** Full-screen "learn an algorithm first" screen shown instead of a blocked app. */
class BlockActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val dp = resources.displayMetrics.density
    val learned = BlockerStore.learnedToday(this)
    val goal = BlockerStore.goal(this)
    val minutes = BlockerStore.minutesPerAlgo(this)

    fun label(value: String, sizeSp: Float, color: Int, bold: Boolean = false) =
      TextView(this).apply {
        text = value
        textSize = sizeSp
        setTextColor(color)
        gravity = Gravity.CENTER
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(0, 0, 0, (16 * dp).toInt())
      }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0F1115"))
      val pad = (32 * dp).toInt()
      setPadding(pad, pad, pad, pad)
      addView(label("Сначала изучи алгоритм", 26f, Color.WHITE, bold = true))
      addView(
        label(
          "Изучено сегодня: $learned из $goal.\n" +
            "Каждый изученный алгоритм открывает $minutes мин., а выполненная цель снимает блокировку до конца дня.",
          16f,
          Color.parseColor("#B0B6C3"),
        ),
      )
      addView(Button(this@BlockActivity).apply {
        text = "Открыть AlgoMaster"
        setOnClickListener { openApp() }
      })
    }
    setContentView(root)
  }

  private fun openApp() {
    packageManager.getLaunchIntentForPackage(packageName)?.let {
      startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    finish()
  }

  // Back goes to the home screen, never back into the blocked app.
  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    finish()
  }
}
