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
    const val ACTION_SNOOZE = "expo.modules.studyalarms.SNOOZE"
    /** The ring's one-minute timeout (AlarmRinger.stopLater). */
    const val ACTION_STOP = "expo.modules.studyalarms.STOP"
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_DISMISS, ACTION_STOP -> AlarmRinger.stop(context)
      ACTION_SNOOZE -> {
        AlarmRinger.stop(context)
        AlarmScheduler.snooze(context, AlarmScheduler.itemFrom(intent))
      }
      ACTION_RING -> {
        val item = AlarmScheduler.itemFrom(intent)
        // A snoozed alarm stays silent once its algorithm was learned (or today's cards are done) in the meantime.
        val snoozed = intent.getBooleanExtra(AlarmScheduler.EXTRA_SNOOZED, false)
        if (!snoozed || AlarmScheduler.stillToDo(context, item)) AlarmNotification.show(context, item)
        AlarmScheduler.reschedule(context)
      }
    }
  }
}
