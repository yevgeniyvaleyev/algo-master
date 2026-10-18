package expo.modules.studyalarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Rings the alarm and immediately plans the next one from "now": if the user ignores or dismisses it, the
 * rest of the day is already re-planned against the remaining time. Learning an algorithm re-plans again from JS.
 */
class AlarmReceiver : BroadcastReceiver() {
  companion object {
    const val ACTION_RING = "expo.modules.studyalarms.RING"
    const val ACTION_DISMISS = "expo.modules.studyalarms.DISMISS"
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_DISMISS -> AlarmNotification.cancel(context)
      ACTION_RING -> {
        AlarmNotification.show(
          context,
          AlarmStore.Item(
            slug = intent.getStringExtra(AlarmScheduler.EXTRA_SLUG) ?: "",
            title = intent.getStringExtra(AlarmScheduler.EXTRA_TITLE) ?: "",
            difficulty = intent.getStringExtra(AlarmScheduler.EXTRA_DIFFICULTY) ?: "easy",
            costMs = intent.getLongExtra(AlarmScheduler.EXTRA_COST, 0L),
          ),
        )
        AlarmScheduler.reschedule(context)
      }
    }
  }
}
