package expo.modules.appblocker

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.inputmethod.InputMethodManager

/**
 * Watches which app is in the foreground. Time spent in blocked apps is counted against the minutes earned today
 * (learned algorithms × minutes per algorithm); when it runs out, the app is sent home and BlockActivity is shown.
 * Once the daily goal is met nothing is blocked.
 */
class BlockerService : AccessibilityService() {
  private val handler = Handler(Looper.getMainLooper())
  private val recheck = Runnable { check() }

  /** Package currently in the foreground (ignoring the keyboard and system UI overlays). */
  private var foreground: String? = null

  /** elapsedRealtime when the current blocked-app session started; null when not counting. */
  private var sessionStart: Long? = null

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      when (intent.action) {
        // Screen off doesn't count as usage; resume counting once the user unlocks again.
        Intent.ACTION_SCREEN_OFF -> endSession()
        Intent.ACTION_USER_PRESENT -> startSessionIfBlocked()
      }
    }
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_OFF)
      addAction(Intent.ACTION_USER_PRESENT)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      registerReceiver(screenReceiver, filter)
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent) {
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if (pkg == foreground || isOverlay(pkg)) return
    endSession()
    foreground = pkg
    startSessionIfBlocked()
  }

  override fun onInterrupt() {}

  override fun onDestroy() {
    endSession()
    runCatching { unregisterReceiver(screenReceiver) }
    super.onDestroy()
  }

  /** Keyboards and the notification shade appear on top of an app without leaving it. */
  private fun isOverlay(pkg: String): Boolean {
    if (pkg == "com.android.systemui") return true
    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
    return imm.enabledInputMethodList.any { it.packageName == pkg }
  }

  private fun startSessionIfBlocked() {
    val pkg = foreground ?: return
    if (sessionStart != null || !BlockerStore.isBlockedPackage(this, pkg)) return
    sessionStart = SystemClock.elapsedRealtime()
    check()
  }

  private fun endSession() {
    handler.removeCallbacks(recheck)
    val start = sessionStart ?: return
    sessionStart = null
    BlockerStore.addUsed(this, SystemClock.elapsedRealtime() - start)
  }

  /** Blocks the foreground app once today's earned time is used up; otherwise re-checks when it would run out. */
  private fun check() {
    handler.removeCallbacks(recheck)
    val pkg = foreground ?: return
    val start = sessionStart ?: return
    if (!BlockerStore.isBlockedPackage(this, pkg)) return
    if (BlockerStore.goalMet(this)) {
      // Unlimited for today; re-check periodically in case the day changes.
      handler.postDelayed(recheck, 60_000L)
      return
    }
    val used = BlockerStore.usedTodayMs(this) + (SystemClock.elapsedRealtime() - start)
    val remaining = BlockerStore.earnedMs(this) - used
    if (remaining <= 0) block() else handler.postDelayed(recheck, minOf(remaining, 60_000L))
  }

  /**
   * Covers the blocked app with BlockActivity. No GLOBAL_ACTION_HOME here: the home screen arrives asynchronously
   * and would cover BlockActivity right after it opens. BlockActivity's back button goes home instead.
   */
  private fun block() {
    endSession()
    foreground = null
    startActivity(
      Intent(this, BlockActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
    )
  }
}
