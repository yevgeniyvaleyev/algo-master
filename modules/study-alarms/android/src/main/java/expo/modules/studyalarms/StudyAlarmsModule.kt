package expo.modules.studyalarms

import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AlarmItemRecord : Record {
  @Field var slug: String = ""
  @Field var title: String = ""
  @Field var difficulty: String = "easy"
  @Field var costMs: Double = 0.0
}

/** Planning inputs pushed from JS whenever progress or settings change. */
class AlarmConfig : Record {
  @Field var enabled: Boolean = false
  @Field var startHour: Int = 9
  @Field var endHour: Int = 21
  @Field var goal: Int = 3
  @Field var learnedToday: Int = 0
  @Field var day: String = ""
  @Field var dayStartHour: Int = 0
  @Field var upcoming: List<AlarmItemRecord> = emptyList()
}

class StudyAlarmsModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("StudyAlarms")

    Function("setConfig") { config: AlarmConfig ->
      AlarmStore.write(context, config)
      AlarmScheduler.reschedule(context)
    }

    Function("getNextAlarm") {
      AlarmStore.next(context)?.let { (at, slug, title) ->
        mapOf("at" to at.toDouble(), "slug" to slug, "title" to title)
      }
    }

    Function("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT >= 34) {
        context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
      } else {
        true
      }
    }

    Function("openFullScreenIntentSettings") {
      val intent =
        if (Build.VERSION.SDK_INT >= 34) {
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}"))
        } else {
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
        }
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("testAlarm") {
      AlarmScheduler.test(context)
    }
  }
}
