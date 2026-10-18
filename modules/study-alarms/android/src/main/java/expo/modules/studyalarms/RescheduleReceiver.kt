package expo.modules.studyalarms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarms don't survive a reboot or an app update, and a clock/timezone change moves the plan. */
class RescheduleReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    AlarmScheduler.reschedule(context)
  }
}
